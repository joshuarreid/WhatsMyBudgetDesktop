/**
 * src/hooks/usePaymentSummary(tanStack).js
 *
 * React Query hook for payment summary (TanStack Query v5).
 * - Mirrors the behavior/shape of the existing usePaymentsData hook so the UI requires minimal changes.
 * - Uses the v5 single-object signature for useQuery.
 *
 * NOTE: Temporary file name includes "(tanStack)" suffix during migration.
 */
import {useStatementPeriodContext} from "../context/StatementPeriodProvider";

const logger = {
    info: (...args) => console.log('[usePaymentSummary]', ...args),
    error: (...args) => console.error('[usePaymentSummary]', ...args),
};

import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import fetchPaymentSummary from '../api/paymentSummary(tanStack)';
import {getAccounts, getPaymentMethods} from "../config/config";


/**
 * usePaymentSummary
 * - Returns the same shape as legacy usePaymentsData to ease migration:
 *   { cards, users, payments, breakdowns, loading, error, refetch }
 *
 * @returns {Object}
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
    const lastPeriodRef = useRef();

    // Local UI-facing state to preserve exact behavior of legacy hook (clearing on period change, etc.)
    const [payments, setPayments] = useState({});
    const [breakdowns, setBreakdowns] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Immediate clear on statementPeriod change (and on unmount)
    useEffect(() => {
        logger.info('Immediate clearing effect: statementPeriod changed or leaving page.', { statementPeriod });
        setPayments({});
        setBreakdowns({});
        setLoading(true);
        setError(null);

        return () => {
            logger.info('Cleanup on unmount: clearing all payments/breakdowns/loading/error.');
            setPayments({});
            setBreakdowns({});
            setLoading(true);
            setError(null);
        };
    }, [statementPeriod]);

    // Query key
    const accountsKey = Array.isArray(users) ? users.join(',') : '';
    const queryKey = ['paymentSummary', accountsKey, statementPeriod];

    // React Query v5: use single-object signature
    const query = useQuery({
        queryKey,
        queryFn: async () => {
            // fetchPaymentSummary validates inputs; pass normalized accounts (users)
            return await fetchPaymentSummary({ accounts: users, statementPeriod });
        },
        enabled: Array.isArray(users) && users.length > 0 && !!statementPeriod,
        staleTime: 1000 * 60 * 2, // 2 minutes
        retry: 1,
        onError: (err) => {
            logger.error('usePaymentSummary: query error', err);
        },
    });

    // Effect: handle query results and mirror legacy normalization logic
    useEffect(() => {
        let isMounted = true;
        lastPeriodRef.current = statementPeriod;

        async function handleResult() {
            try {
                if (!statementPeriod) {
                    // If no period, match legacy behavior: clear and mark not loading
                    if (isMounted) {
                        setPayments({});
                        setBreakdowns({});
                        setLoading(false);
                        setError(null);
                    }
                    return;
                }

                if (query.isLoading) {
                    // still loading; keep local loading true
                    return;
                }

                if (query.isError) {
                    if (isMounted) {
                        logger.error('usePaymentSummary: query failed', query.error);
                        setPayments({});
                        setBreakdowns({});
                        setError(query.error);
                        setLoading(false);
                    }
                    return;
                }

                const raw = query.data;
                const summary = Array.isArray(raw) ? raw : raw?.summary;

                // If the period changed during fetch, ignore result
                if (!isMounted || lastPeriodRef.current !== statementPeriod) {
                    logger.info('usePaymentSummary: statementPeriod changed during fetch, discarding result.', {
                        lastPeriod: lastPeriodRef.current,
                        period: statementPeriod,
                    });
                    return;
                }

                if (!summary || summary.length === 0) {
                    if (isMounted) {
                        setPayments({});
                        setBreakdowns({});
                        setLoading(false);
                        setError(null);
                    }
                    return;
                }

                const paymentsResult = {};
                const breakdownsResult = {};

                summary.forEach((userSummary) => {
                    const account = String(userSummary.account).toLowerCase();

                    Object.entries(userSummary.creditCardTotals || {}).forEach(([card, total]) => {
                        const normalizedCard = String(card).toLowerCase();
                        if (!paymentsResult[normalizedCard]) paymentsResult[normalizedCard] = {};
                        paymentsResult[normalizedCard][account] = Number(total) || 0;
                    });

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

                logger.info('usePaymentSummary: Final payments result', paymentsResult);
                logger.info('usePaymentSummary: Final breakdowns result', breakdownsResult);

                if (isMounted) {
                    setPayments(paymentsResult);
                    setBreakdowns(breakdownsResult);
                    setLoading(false);
                    setError(null);
                }
            } catch (err) {
                logger.error('usePaymentSummary: failed to handle query result', err);
                if (isMounted) {
                    setPayments({});
                    setBreakdowns({});
                    setError(err);
                    setLoading(false);
                }
            }
        }

        handleResult();

        return () => {
            isMounted = false;
        };
    }, [query.data, query.isLoading, query.isError, query.error, statementPeriod, cards, users]); // dependencies include query state

    logger.info('usePaymentSummary: hook state', {
        cards,
        users,
        payments,
        breakdowns,
        loading,
        error,
        statementPeriod,
    });

    return { cards, users, payments, breakdowns, loading, error, refetch: query.refetch };
}

export default usePaymentSummary;