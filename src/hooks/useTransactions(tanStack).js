/**
 * src/hooks/useTransactions(tanStack).js
 *
 * TanStack Query hooks for transactions (read-only).
 * - useTransactionsQuery: fetches a transactions list for given filters.
 * - useBudgetAndProjectedTransactionsForAccount: account-scoped fetch (mirrors legacy hook shape).
 *
 * Hooks use TanStack Query v5 single-object signatures and mirror legacy return shapes to minimize UI changes.
 *
 * NOTE: Temporary file name includes "(tanStack)" suffix during migration.
 */

const logger = {
    info: (...args) => console.log('[useTransactions]', ...args),
    error: (...args) => console.error('[useTransactions]', ...args),
};

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTransactions, fetchTransactionsForAccount } from '../api/transactions(tanStack)';
import { subscribe as subscribeTransactionEvents } from '../services/TransactionEvents';

/**
 * createFiltersKey
 * - Stable serialization for filters used in query keys.
 *
 * @param {Object} filters
 * @returns {string}
 */
function createFiltersKey(filters) {
    try {
        // Keep ordering stable by using JSON.stringify on sorted keys
        if (!filters || typeof filters !== 'object') return '';
        const ordered = {};
        Object.keys(filters)
            .sort()
            .forEach((k) => {
                ordered[k] = filters[k];
            });
        return JSON.stringify(ordered);
    } catch (err) {
        return String(filters);
    }
}

/**
 * useTransactionsQuery
 * - Fetch transactions list using react-query.
 *
 * @param {Object} filters - optional filters object
 * @returns {Object} { data, isLoading, error, refetch }
 */
export function useTransactionsQuery(filters = {}) {
    const filtersKey = createFiltersKey(filters);
    const queryKey = ['transactions', filtersKey];

    const query = useQuery({
        queryKey,
        queryFn: () => fetchTransactions(filters),
        enabled: true,
        staleTime: 1000 * 30,
        onError: (err) => logger.error('useTransactionsQuery error', err),
    });

    // Keep backward-compatible subscription behavior:
    // Subscribe to TransactionEvents and call refetch when events occur.
    useEffect(() => {
        const unsubscribe = subscribeTransactionEvents(() => {
            try {
                logger.info('useTransactionsQuery: TransactionEvents published — refetching', { filters });
                query.refetch();
            } catch (err) {
                logger.error('useTransactionsQuery: refetch on event failed', err);
            }
        });
        return unsubscribe;
    }, [filters, query]);

    return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}

/**
 * useBudgetAndProjectedTransactionsForAccount
 * - Mirrors legacy hook useBudgetAndProjectedTransactionsForAccount from useTransactions.js.
 * - Returns { personalTransactions, jointTransactions, personalTotal, jointTotal, total, loading, error, refetch }
 *
 * @param {Object} filters - { account, statementPeriod, category, criticality, paymentMethod }
 * @returns {Object}
 */
export function useBudgetAndProjectedTransactionsForAccount(filters = {}) {
    const { account, statementPeriod, category, criticality, paymentMethod } = filters || {};
    const queryKey = ['transactionsForAccount', account, statementPeriod, category, criticality, paymentMethod];

    const latestPeriodRef = useRef(statementPeriod);

    const query = useQuery({
        queryKey,
        queryFn: () => fetchTransactionsForAccount({ account, statementPeriod, category, criticality, paymentMethod }),
        enabled: !!account, // require account
        staleTime: 1000 * 30,
        onError: (err) => logger.error('useBudgetAndProjectedTransactionsForAccount query error', err),
    });

    // Subscribe to TransactionEvents and refetch when relevant
    useEffect(() => {
        const unsubscribe = subscribeTransactionEvents((payload = {}) => {
            try {
                const payloadAccount = payload?.account;
                const payloadStatement = payload?.statementPeriod;
                // If event is account-scoped and doesn't match this account, ignore
                if (payloadAccount && String(payloadAccount) !== String(account)) return;
                // If event carries statementPeriod and doesn't match, ignore
                if (payloadStatement && String(payloadStatement) !== String(statementPeriod)) return;

                logger.info('useBudgetAndProjectedTransactionsForAccount: event received, refetching', { payload });
                // small tick to avoid race with immediate writes
                setTimeout(() => {
                    query.refetch().catch((err) => logger.error('refetch failed', err));
                }, 50);
            } catch (err) {
                logger.error('useBudgetAndProjectedTransactionsForAccount: subscription handler error', err);
            }
        });

        return unsubscribe;
    }, [account, statementPeriod, query]);

    // Mirror legacy return shape and defaults
    const result = {
        personalTransactions: query.data?.personalTransactions || { transactions: [], count: 0, total: 0 },
        jointTransactions: query.data?.jointTransactions || { transactions: [], count: 0, total: 0 },
        personalTotal: query.data?.personalTotal || 0,
        jointTotal: query.data?.jointTotal || 0,
        total: query.data?.total || 0,
        loading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };

    return result;
}

export default useTransactionsQuery;