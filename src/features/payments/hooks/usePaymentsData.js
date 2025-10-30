/**
 * usePaymentsData
 * - Business logic for the payments summary screen: fetches, normalizes, and manages payment summary data.
 * - Clears stale data immediately on statementPeriod change and on unmount.
 * - Always subscribes to provider context for live updates.
 * - Bulletproof React conventions, robust logging, and JSDoc.
 *
 * @module usePaymentsData
 * @returns {Object} { cards, users, payments, breakdowns, loading, error }
 */
import { useEffect, useRef, useState, useMemo } from "react";
import { useStatementPeriodContext } from "../../../context/StatementPeriodProvider";
import PaymentSummaryService from "../../../services/PaymentSummaryService";
import { getAccounts, getPaymentMethods } from "../../../config/config.ts";

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
 * - Business logic for payments summary screen.
 * - Fetches payment summary and breakdowns for the current statement period.
 * - Clears all stale data instantly on period change or unmount.
 * - Handles race conditions robustly.
 *
 * @returns {Object} { cards, users, payments, breakdowns, loading, error }
 */
export function usePaymentsData() {
    /**
     * Normalized cards and users, recomputed if config changes.
     * @type {Array<string>}
     */
    const cards = useMemo(() => getPaymentMethods().map((c) => c.toLowerCase()), []);
    const users = useMemo(() => getAccounts()
        .filter((u) => ["josh", "anna"].includes(u.toLowerCase()))
        .map((u) => u.toLowerCase()), []);

    /**
     * Local state for payments and breakdowns.
     */
    const [payments, setPayments] = useState({});
    const [breakdowns, setBreakdowns] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Context subscription: always up-to-date statement period.
    const { statementPeriod } = useStatementPeriodContext();
    // Track last seen statementPeriod so we can detect actual changes.
    const lastPeriodRef = useRef();

    /**
     * Immediate clearing effect: runs on statementPeriod change and on unmount.
     * Guarantees UI never renders stale data.
     */
    useEffect(() => {
        logger.info("Immediate clearing effect: statementPeriod changed or leaving page.", { statementPeriod });
        setPayments({});
        setBreakdowns({});
        setLoading(true);
        setError(null);

        // Cleanup on unmount
        return () => {
            logger.info("Cleanup on unmount: clearing all payments/breakdowns/loading/error.");
            setPayments({});
            setBreakdowns({});
            setLoading(true);
            setError(null);
        };
    }, [statementPeriod]);

    /**
     * Data fetch effect: runs whenever statementPeriod changes.
     * Only updates state if fetch matches the latest statementPeriod.
     * Handles race conditions and ensures UI is always fresh.
     */
    useEffect(() => {
        let isMounted = true;
        lastPeriodRef.current = statementPeriod;

        /**
         * Fetches payment summary from backend.
         * @async
         * @function fetchData
         * @throws {Error} If the API request fails.
         */
        async function fetchData(period) {
            logger.info("fetchData: effect started", { cards, users, statementPeriod: period });
            try {
                if (!period) {
                    if (isMounted) {
                        setPayments({});
                        setBreakdowns({});
                        setLoading(false);
                        setError(null);
                    }
                    return;
                }

                const raw = await PaymentSummaryService.getPaymentSummary({
                    accounts: users,
                    statementPeriod: period,
                });

                const summary = Array.isArray(raw) ? raw : raw.summary;
                logger.info("fetchData: API response", { summary });

                // If the period changed during fetch, ignore this result
                if (!isMounted || lastPeriodRef.current !== period) {
                    logger.info("fetchData: statementPeriod changed during fetch, discarding result.", {
                        lastPeriod: lastPeriodRef.current, period
                    });
                    return;
                }

                // If no results, clear and exit
                if (!summary || summary.length === 0) {
                    setPayments({});
                    setBreakdowns({});
                    setLoading(false);
                    setError(null);
                    return;
                }

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
                setError(null);
            } catch (err) {
                logger.error("fetchData: Failed to fetch payment summary", err);
                if (isMounted) {
                    setPayments({});
                    setBreakdowns({});
                    setError(err);
                    setLoading(false);
                }
            }
        }

        // Only fetch if we have a valid period
        if (statementPeriod) {
            fetchData(statementPeriod);
        } else {
            setLoading(true);
        }

        // Cleanup: mark as unmounted so late fetches can't update state
        return () => {
            isMounted = false;
        };
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