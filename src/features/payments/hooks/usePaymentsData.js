/**
 * usePaymentsData
 * - Fetches payment summary from backend and returns per-user, per-card totals and category breakdowns.
 * - Normalizes all keys (cards, users) to lowercase.
 * - Business/data logic only; UI logic lives in components.
 *
 * @module usePaymentsData
 * @returns {Object} { cards, users, payments, breakdowns, loading, error }
 */
import { useEffect, useState } from "react";
import {useStatementPeriodContext} from "../../../context/StatementPeriodProvider";
import PaymentSummaryService from "../../../services/PaymentSummaryService";
import {getAccounts, getPaymentMethods} from "../../../config/config.ts";


/**
 * Logger for usePaymentsData hook.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[usePaymentsData]', ...args),
    error: (...args) => console.error('[usePaymentsData]', ...args),
};

/**
 * usePaymentsData
 * - Fetches payment summary for current statementPeriod from PaymentSummaryService.
 * - Normalizes all card/user keys to lowercase.
 * - Returns users, cards, payments object, breakdowns, loading, and error.
 *
 * @returns {Object} { cards, users, payments, breakdowns, loading, error }
 */
export function usePaymentsData() {
    /** @type {Array<string>} cards */
    const [cards] = useState(() =>
        getPaymentMethods().map((c) => c.toLowerCase())
    );
    /** @type {Array<string>} users */
    const [users] = useState(() =>
        getAccounts()
            .filter((u) => ["josh", "anna"].includes(u.toLowerCase()))
            .map((u) => u.toLowerCase())
    );
    /** @type {Object} payments - payments[card][user]: amount */
    const [payments, setPayments] = useState({});
    /** @type {Object} breakdowns - breakdowns[card][user]: {category: amount} */
    const [breakdowns, setBreakdowns] = useState({});
    /** @type {boolean} loading */
    const [loading, setLoading] = useState(true);
    /** @type {Error|null} error */
    const [error, setError] = useState(null);

    // Get statementPeriod from provider context
    const { statementPeriod } = useStatementPeriodContext();

    useEffect(() => {
        /**
         * Loads payment summary from backend.
         * Normalizes all keys to lowercase.
         * @async
         * @function fetchData
         * @throws {Error} If the API request fails.
         */
        async function fetchData() {
            logger.info("fetchData: effect started", { cards, users, statementPeriod });
            setLoading(true);
            try {
                // Fetch payment summary from backend
                const raw = await PaymentSummaryService.getPaymentSummary({
                    accounts: users,
                    statementPeriod,
                });

                const summary = Array.isArray(raw) ? raw : raw.summary;
                logger.info("fetchData: API response", { summary });

                // Build normalized payments and breakdowns objects for table and UI
                const paymentsResult = {};
                const breakdownsResult = {};

                summary.forEach((userSummary) => {
                    const account = String(userSummary.account).toLowerCase();

                    // Card totals
                    Object.entries(userSummary.creditCardTotals || {}).forEach(
                        ([card, total]) => {
                            const normalizedCard = String(card).toLowerCase();
                            if (!paymentsResult[normalizedCard]) paymentsResult[normalizedCard] = {};
                            paymentsResult[normalizedCard][account] = Number(total) || 0;
                        }
                    );

                    // Category breakdowns
                    Object.entries(userSummary.creditCardCategoryBreakdowns || {}).forEach(
                        ([card, cats]) => {
                            const normalizedCard = String(card).toLowerCase();
                            if (!breakdownsResult[normalizedCard]) breakdownsResult[normalizedCard] = {};
                            breakdownsResult[normalizedCard][account] = Object.entries(cats).map(
                                ([category, amount]) => ({
                                    category: String(category),
                                    amount: Number(amount) || 0,
                                    type: "Actual",
                                })
                            );
                        }
                    );
                });

                // Defensive: ensure all card/user keys exist, zero if missing
                cards.forEach((card) => {
                    paymentsResult[card] = paymentsResult[card] || {};
                    breakdownsResult[card] = breakdownsResult[card] || {};
                    users.forEach((user) => {
                        if (typeof paymentsResult[card][user] !== "number")
                            paymentsResult[card][user] = 0;
                        if (!Array.isArray(breakdownsResult[card][user]))
                            breakdownsResult[card][user] = [];
                    });
                });

                logger.info("fetchData: Final payments result", paymentsResult);
                logger.info("fetchData: Final breakdowns result", breakdownsResult);

                setPayments(paymentsResult);
                setBreakdowns(breakdownsResult);
                setLoading(false);
            } catch (err) {
                logger.error("fetchData: Failed to fetch payment summary", err);
                setError(err);
                setLoading(false);
            }
        }

        if (statementPeriod) fetchData();
        else setLoading(true);
    }, [cards, users, statementPeriod]);

    logger.info("usePaymentsData: hook state", {
        cards,
        users,
        payments,
        breakdowns,
        loading,
        error,
        statementPeriod,
    });

    return { cards, users, payments, breakdowns, loading, error };
}