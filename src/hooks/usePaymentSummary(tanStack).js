/**
 * src/hooks/usePaymentSummary(tanStack).js
 *
 * React Query hook for payment summary (TanStack Query v5).
 * - No local duplication of loading/data state: relies on query.isLoading and query.data.
 * - Normalizes query.data into the shape expected by the UI: { cards, users, payments, breakdowns, loading, error, refetch }.
 *
 * NOTE: temporary filename contains "(tanStack)" during migration.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
// UPDATED: import useStatementPeriodContext from the tanStack provider so it's the same context instance
import { useStatementPeriodContext } from "../context/StatementPeriodProvider(tanStack)";
import fetchPaymentSummary from '../api/paymentSummary(tanStack)';
import { getAccounts, getPaymentMethods } from "../config/config";

const logger = {
    info: (...args) => console.log('[usePaymentSummary]', ...args),
    error: (...args) => console.error('[usePaymentSummary]', ...args),
};

/**
 * usePaymentSummary
 * - Uses react-query (v5) for fetching and returns normalized data for UI consumption.
 *
 * @returns {Object} { cards, users, payments, breakdowns, loading, error, refetch }
 */
export function usePaymentSummary() {
    // Normalize cards and users consistent with legacy hook
    const cards = useMemo(() => getPaymentMethods().map((c) => c.toLowerCase()), []);
    const users = useMemo(
        () =>
            getAccounts()
                .filter((u) => ['josh', 'anna'].includes(u.toLowerCase()))
                .map((u) => u.toLowerCase()),
        []
    );

    const { statementPeriod } = useStatementPeriodContext();

    // Query key serialization (accounts normalized to string)
    const accountsKey = Array.isArray(users) ? users.join(',') : '';
    const queryKey = ['paymentSummary', accountsKey, statementPeriod];

    // React Query v5 single-object signature
    const query = useQuery({
        queryKey,
        queryFn: async () => fetchPaymentSummary({ accounts: users, statementPeriod }),
        enabled: Array.isArray(users) && users.length > 0 && !!statementPeriod,
        staleTime: 1000 * 60 * 2, // 2 minutes
        retry: 1,
        onError: (err) => {
            logger.error('usePaymentSummary: query error', err);
        },
    });

    // Derive normalized shape from query.data (no local dup state)
    const { payments, breakdowns } = useMemo(() => {
        try {
            const raw = query.data;
            const summary = Array.isArray(raw) ? raw : raw?.summary;
            if (!summary || !Array.isArray(summary) || summary.length === 0) {
                // Build empty defaults with card/user keys present
                const emptyPayments = {};
                const emptyBreakdowns = {};
                cards.forEach((card) => {
                    emptyPayments[card] = {};
                    emptyBreakdowns[card] = {};
                    users.forEach((user) => {
                        emptyPayments[card][user] = 0;
                        emptyBreakdowns[card][user] = [];
                    });
                });
                return { payments: emptyPayments, breakdowns: emptyBreakdowns };
            }

            const paymentsResult = {};
            const breakdownsResult = {};

            summary.forEach((userSummary) => {
                const account = String(userSummary.account).toLowerCase();

                // Card totals
                Object.entries(userSummary.creditCardTotals || {}).forEach(([card, total]) => {
                    const normalizedCard = String(card).toLowerCase();
                    if (!paymentsResult[normalizedCard]) paymentsResult[normalizedCard] = {};
                    paymentsResult[normalizedCard][account] = Number(total) || 0;
                });

                // Category breakdowns
                Object.entries(userSummary.creditCardCategoryBreakdowns || {}).forEach(([card, cats]) => {
                    const normalizedCard = String(card).toLowerCase();
                    if (!breakdownsResult[normalizedCard]) breakdownsResult[normalizedCard] = {};
                    breakdownsResult[normalizedCard][account] = Object.entries(cats).map(([category, amount]) => ({
                        category: String(category),
                        amount: Number(amount) || 0,
                        type: 'Actual',
                    }));
                });
            });

            // Defensive: ensure all card/user keys exist, zero if missing
            cards.forEach((card) => {
                paymentsResult[card] = paymentsResult[card] || {};
                breakdownsResult[card] = breakdownsResult[card] || {};
                users.forEach((user) => {
                    if (typeof paymentsResult[card][user] !== 'number') paymentsResult[card][user] = 0;
                    if (!Array.isArray(breakdownsResult[card][user])) breakdownsResult[card][user] = [];
                });
            });

            return { payments: paymentsResult, breakdowns: breakdownsResult };
        } catch (err) {
            logger.error('usePaymentSummary: normalization failed', err);
            // fallback empty shape
            const emptyPayments = {};
            const emptyBreakdowns = {};
            cards.forEach((card) => {
                emptyPayments[card] = {};
                emptyBreakdowns[card] = {};
                users.forEach((user) => {
                    emptyPayments[card][user] = 0;
                    emptyBreakdowns[card][user] = [];
                });
            });
            return { payments: emptyPayments, breakdowns: emptyBreakdowns };
        }
    }, [query.data, cards, users]);

    logger.info('usePaymentSummary: hook state', {
        cards,
        users,
        payments,
        breakdowns,
        loading: query.isLoading,
        error: query.error,
        statementPeriod,
    });

    return {
        cards,
        users,
        payments,
        breakdowns,
        loading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}

export default usePaymentSummary;