/**
 * usePaymentsData
 *
 * Migration (wired to paymentSummaryQuery):
 * - Replaces manual per-account fetch/fetchQuery logic with the centralized
 *   usePaymentSummaryQuery hook which fetches the payment-summary for a list
 *   of accounts in a single request (server supports CSV accounts).
 * - Keeps the same output shape so UI components do not need changes.
 *
 * Behavior:
 * - Clears stale UI immediately when statementPeriod changes (no stale flashes).
 * - Subscribes to the react-query result from usePaymentSummaryQuery; when data
 *   arrives we compute `payments` and `breakdowns` and publish them to state.
 *
 * Conventions:
 * - Bulletproof React: hook contains side-effects and data transformation only.
 * - Robust logging and JSDoc per project conventions.
 *
 * @module hooks/usePaymentsData
 */

import { useEffect, useState, useMemo } from "react";

import { useStatementPeriodContext } from "../../../context/StatementPeriodProvider";
import { getAccounts, getPaymentMethods } from "../../../config/config.js";
import {usePaymentSummaryQuery} from "../../../hooks/paymentSummaryQuery";

const logger = {
    info: (...args) => console.log("[usePaymentsData]", ...args),
    error: (...args) => console.error("[usePaymentsData]", ...args),
};

/**
 * normalizeTx
 * - Defensive accessor used when input shapes vary; returns canonical fields.
 *
 * @param {Object} tx
 * @returns {{ account: string, paymentMethod: string, amount: number, category: string }}
 */
function normalizeTx(tx = {}) {
    try {
        return {
            account: String(tx.account ?? tx.owner ?? "").toLowerCase(),
            paymentMethod: String(tx.paymentMethod ?? tx.card ?? tx.payment_method ?? "").toLowerCase(),
            amount: Number(tx.amount) || 0,
            category: tx.category == null ? "Uncategorized" : String(tx.category),
        };
    } catch (err) {
        logger.error("normalizeTx failed", err, tx);
        return { account: "", paymentMethod: "", amount: 0, category: "Uncategorized" };
    }
}

/**
 * computeSummaryFromApi
 * - Convert server-side PaymentSummaryResponse[] into the two structures:
 *   payments: { [card]: { [user]: amount } }
 *   breakdowns: { [card]: { [user]: [{ category, amount, type }] } }
 *
 * @param {Array|any} apiData - raw data returned from payment summary endpoint
 * @param {Array<string>} cards - known cards list
 * @param {Array<string>} users - known users list
 * @returns {{ payments: Object, breakdowns: Object }}
 */
function computeSummaryFromApi(apiData = [], cards = [], users = []) {
    const paymentsResult = {};
    const breakdownsResult = {};

    // Initialize buckets
    cards.forEach((card) => {
        const key = String(card).toLowerCase();
        paymentsResult[key] = {};
        breakdownsResult[key] = {};
        users.forEach((u) => {
            paymentsResult[key][u] = 0;
            breakdownsResult[key][u] = [];
        });
    });

    // Support both array response or object wrapper
    const list = Array.isArray(apiData) ? apiData : (apiData?.summary ?? apiData?.paymentSummaries ?? []);

    if (!Array.isArray(list) || list.length === 0) {
        return { payments: paymentsResult, breakdowns: breakdownsResult };
    }

    // Each item is expected to be a user summary object:
    // { account, creditCardTotals: { card: amount }, creditCardCategoryBreakdowns: { card: { category: amount } } }
    list.forEach((userSummary) => {
        try {
            const account = String(userSummary.account ?? userSummary.owner ?? "").toLowerCase();
            if (!account) return;

            // card totals (may be nested under creditCardTotals or cardTotals depending on API)
            const cardTotals =
                userSummary.creditCardTotals ??
                userSummary.cardTotals ??
                userSummary.creditCardTotalsByPaymentMethod ??
                {};

            Object.entries(cardTotals || {}).forEach(([cardName, total]) => {
                const cardKey = String(cardName).toLowerCase();
                if (!paymentsResult[cardKey]) paymentsResult[cardKey] = {};
                if (typeof paymentsResult[cardKey][account] !== "number") paymentsResult[cardKey][account] = 0;
                paymentsResult[cardKey][account] = (paymentsResult[cardKey][account] || 0) + (Number(total) || 0);
            });

            // category breakdowns: creditCardCategoryBreakdowns common shape
            const cardCats = userSummary.creditCardCategoryBreakdowns ?? userSummary.cardCategoryBreakdowns ?? {};
            Object.entries(cardCats || {}).forEach(([cardName, cats]) => {
                const cardKey = String(cardName).toLowerCase();
                if (!breakdownsResult[cardKey]) breakdownsResult[cardKey] = {};
                if (!Array.isArray(breakdownsResult[cardKey][account])) breakdownsResult[cardKey][account] = [];

                // cats might be an object { category: amount } or an array of { category, amount }
                if (Array.isArray(cats)) {
                    cats.forEach((c) => {
                        const category = String(c.category ?? c.name ?? "Uncategorized");
                        const amount = Number(c.amount ?? 0) || 0;
                        const existing = breakdownsResult[cardKey][account].find((e) => String(e.category) === category);
                        if (existing) existing.amount = (Number(existing.amount) || 0) + amount;
                        else breakdownsResult[cardKey][account].push({ category, amount, type: "Actual" });
                    });
                } else if (cats && typeof cats === "object") {
                    Object.entries(cats).forEach(([category, amt]) => {
                        const catName = String(category);
                        const amount = Number(amt) || 0;
                        const existing = breakdownsResult[cardKey][account].find((e) => String(e.category) === catName);
                        if (existing) existing.amount = (Number(existing.amount) || 0) + amount;
                        else breakdownsResult[cardKey][account].push({ category: catName, amount, type: "Actual" });
                    });
                }
            });
        } catch (err) {
            logger.error("computeSummaryFromApi: failed to process userSummary", err, userSummary);
        }
    });

    // Defensive: ensure every card/user exists
    cards.forEach((card) => {
        const key = String(card).toLowerCase();
        paymentsResult[key] = paymentsResult[key] || {};
        breakdownsResult[key] = breakdownsResult[key] || {};
        users.forEach((u) => {
            if (typeof paymentsResult[key][u] !== "number") paymentsResult[key][u] = 0;
            if (!Array.isArray(breakdownsResult[key][u])) breakdownsResult[key][u] = [];
        });
    });

    return { payments: paymentsResult, breakdowns: breakdownsResult };
}

/**
 * usePaymentsData
 *
 * @returns {{
 *   cards: Array<string>,
 *   users: Array<string>,
 *   payments: Object,
 *   breakdowns: Object,
 *   loading: boolean,
 *   error: any
 * }}
 */
export function usePaymentsData() {
    const { statementPeriod } = useStatementPeriodContext();

    const cards = useMemo(() => getPaymentMethods().map((c) => String(c).toLowerCase()), []);
    const users = useMemo(
        () =>
            getAccounts()
                .filter((u) => ["josh", "anna"].includes(String(u).toLowerCase()))
                .map((u) => String(u).toLowerCase()),
        []
    );

    const [payments, setPayments] = useState({});
    const [breakdowns, setBreakdowns] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Use centralized query: fetch payment summary for all users in one request
    const { data: apiData, isLoading: apiLoading, isError: apiIsError, error: apiError } =
        usePaymentSummaryQuery({ accounts: users, statementPeriod }, { staleTime: Infinity, cacheTime: Infinity });

    // Immediate clear on statementPeriod change to avoid stale flashes
    useEffect(() => {
        logger.info("usePaymentsData: clearing state for new statementPeriod", { statementPeriod });
        setPayments({});
        setBreakdowns({});
        setLoading(true);
        setError(null);
    }, [statementPeriod]);

    // When apiData becomes available, compute and set the results
    useEffect(() => {
        if (!statementPeriod) {
            // nothing to show yet
            setPayments({});
            setBreakdowns({});
            setLoading(false);
            setError(null);
            return;
        }

        if (apiIsError) {
            logger.error("usePaymentsData: payment summary query error", apiError);
            setPayments({});
            setBreakdowns({});
            setError(apiError);
            setLoading(false);
            return;
        }

        if (apiLoading) {
            setLoading(true);
            return;
        }

        // apiData may be undefined if query disabled or not fetched; handle defensively
        try {
            const { payments: p, breakdowns: b } = computeSummaryFromApi(apiData, cards, users);
            setPayments(p);
            setBreakdowns(b);
            setLoading(false);
            setError(null);
        } catch (err) {
            logger.error("usePaymentsData: failed to compute summary from apiData", err, apiData);
            setPayments({});
            setBreakdowns({});
            setError(err);
            setLoading(false);
        }
    }, [apiData, apiLoading, apiIsError, apiError, statementPeriod, cards, users]);

    logger.info("usePaymentsData state", {
        statementPeriod,
        cards,
        users,
        loading,
        error,
        paymentsCount: Object.keys(payments).length,
    });

    return { cards, users, payments, breakdowns, loading, error };
}

export default usePaymentsData;