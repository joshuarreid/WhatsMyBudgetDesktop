/**
 * usePaymentsData
 * - Fetches payment summary from backend and returns per-user, per-card totals and category breakdowns.
 * - Uses statementPeriod from StatementPeriodProvider context.
 * - Business logic only; all UI in components.
 *
 * @module usePaymentsData
 * @returns {Object} { cards, users, payments, breakdowns, loading, error }
 */
import { useEffect, useState } from "react";

import { getAccounts, getPaymentMethods } from "../../../config/config.ts";
import {useStatementPeriodContext} from "../../../context/StatementPeriodProvider";
import PaymentSummaryService from "../../../services/PaymentSummaryService";


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
 * - Returns users, cards, payments object, breakdowns, loading, and error.
 *
 * @returns {Object} { cards, users, payments, breakdowns, loading, error }
 */
export function usePaymentsData() {
    /** @type {Array<string>} cards */
    const [cards] = useState(() => getPaymentMethods());
    /** @type {Array<string>} users */
    const [users] = useState(() => getAccounts().filter(u => ["josh", "anna"].includes(u.toLowerCase())));
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
         * @async
         * @function fetchData
         * @throws {Error} If the API request fails.
         */
        async function fetchData() {
            logger.info("fetchData: effect started", { cards, users, statementPeriod });
            setLoading(true);
            try {
                // Fetch payment summary from backend
                const summary = await PaymentSummaryService.getPaymentSummary({
                    accounts: users,
                    statementPeriod
                });
                logger.info("fetchData: API response", { summary });

                // Build payments and breakdowns objects for table and UI
                const paymentsResult = {};
                const breakdownsResult = {};

                summary.forEach(userSummary => {
                    const account = userSummary.account;
                    // Defensive: support different case for cards
                    Object.entries(userSummary.creditCardTotals || {}).forEach(([card, total]) => {
                        if (!paymentsResult[card]) paymentsResult[card] = {};
                        paymentsResult[card][account] = total;
                    });
                    Object.entries(userSummary.creditCardCategoryBreakdowns || {}).forEach(([card, cats]) => {
                        if (!breakdownsResult[card]) breakdownsResult[card] = {};
                        breakdownsResult[card][account] = Object.entries(cats).map(([category, amount]) => ({
                            category,
                            amount,
                            type: "Actual"
                        }));
                    });
                });

                // Defensive: ensure all card/user keys exist, zero if missing
                cards.forEach(card => {
                    paymentsResult[card] = paymentsResult[card] || {};
                    breakdownsResult[card] = breakdownsResult[card] || {};
                    users.forEach(user => {
                        if (typeof paymentsResult[card][user] !== 'number') paymentsResult[card][user] = 0;
                        if (!Array.isArray(breakdownsResult[card][user])) breakdownsResult[card][user] = [];
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
        statementPeriod
    });

    return { cards, users, payments, breakdowns, loading, error };
}