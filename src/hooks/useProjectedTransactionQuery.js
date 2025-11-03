/**
 * useProjectedTransactionQuery
 * - Hooks for fetching projected (planned) transactions via TanStack Query (v5).
 * - Provides:
 *    - useProjectedTransactions({ account, statementPeriod }) -> { projectedTx, loading, error, refetch }
 *
 * Conventions:
 * - Uses the statementPeriod and account values to build a stable query key.
 * - Normalizes server response shapes into a flat array of projection items.
 * - Annotates each returned projection with __isProjected: true for UI consumers.
 *
 * JSDoc, logging and Bulletproof React conventions followed.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import projectedTransactionApi from '../api/projectedTransaction/projectedTransaction';

const logger = {
    info: (...args) => console.log('[useProjectedTransactionQuery]', ...args),
    error: (...args) => console.error('[useProjectedTransactionQuery]', ...args),
};

/**
 * Flatten an AccountProjectedTransactionList into a single array of transactions.
 *
 * @param {Object|null} accountList - server response for account-scoped projected transactions
 * @returns {Array<Object>} flattened array (may be empty)
 */
function flattenAccountProjectedList(accountList) {
    try {
        const personal = accountList?.personalTransactions?.transactions ?? [];
        const joint = accountList?.jointTransactions?.transactions ?? [];
        return [...personal, ...joint];
    } catch (err) {
        logger.error('flattenAccountProjectedList failed', err);
        return [];
    }
}

/**
 * Annotates projection items with __isProjected: true and ensures required fields are present.
 *
 * @param {Array<Object>} arr
 * @returns {Array<Object>}
 */
function annotateProjections(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map((t) => ({ ...(t || {}), __isProjected: true }));
}

/**
 * Build a query key for projected transactions.
 *
 * @param {string|undefined} account
 * @param {string|undefined} statementPeriod
 * @returns {Array<any>} react-query key
 */
function buildQueryKey(account, statementPeriod) {
    if (account) return ['projections', 'account', String(account), String(statementPeriod ?? '')];
    return ['projections', 'all', String(statementPeriod ?? '')];
}

/**
 * useProjectedTransactions
 * - Fetches projected transactions for a given account + statementPeriod (if account supplied).
 * - Returns normalized, annotated array of projected transactions and query helpers.
 *
 * @param {Object} params
 * @param {string} [params.account] - account name (if provided, fetch account-scoped projections)
 * @param {string} [params.statementPeriod] - statement period value (e.g., "NOVEMBER2025")
 * @param {Object} [options] - optional useQuery overrides
 * @returns {{
 *   projectedTx: Array<Object>,
 *   loading: boolean,
 *   error: any,
 *   refetch: Function,
 *   isError: boolean,
 *   data: any
 * }}
 */
export function useProjectedTransactions({ account, statementPeriod } = {}, options = {}) {
    const queryKey = buildQueryKey(account, statementPeriod);

    const query = useQuery({
        queryKey,
        queryFn: async () => {
            logger.info('fetchProjectedTransactions queryFn', { account, statementPeriod });
            if (account) {
                // server returns an AccountProjectedTransactionList for account-scoped requests
                const acctList = await projectedTransactionApi.fetchAccountProjectedTransactionList(account, { statementPeriod }).catch((err) => {
                    logger.error('fetchAccountProjectedTransactionList failed', err);
                    throw err;
                });
                // Flatten and return
                return flattenAccountProjectedList(acctList);
            }

            // Global fetch (all projected transactions)
            const all = await projectedTransactionApi.fetchAllProjectedTransactions().catch((err) => {
                logger.error('fetchAllProjectedTransactions failed', err);
                throw err;
            });

            // API might already return an array, or a wrapper object. Try to normalize:
            if (Array.isArray(all)) return all;
            // If server returns { projections: [...] } or similar
            if (all && Array.isArray(all.projections)) return all.projections;
            // Best-effort fallback: if it has fields 'personalTransactions' / 'jointTransactions'
            if (all && (all.personalTransactions || all.jointTransactions)) {
                return flattenAccountProjectedList(all);
            }

            // Unknown shape: return empty array
            return [];
        },
        // conservative defaults: callers can override via options if they want refetch behavior
        staleTime: Infinity,
        cacheTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
        ...options,
    });

    // Normalize and annotate returned data for consistent UI consumption
    const projectedTx = useMemo(() => {
        try {
            const raw = query.data ?? [];
            const flattened = Array.isArray(raw) ? raw : [];
            // Ensure consistent sort newest-first by transactionDate when present
            const sorted = [...flattened].sort((a, b) => {
                const da = a?.transactionDate ? new Date(a.transactionDate).getTime() : 0;
                const db = b?.transactionDate ? new Date(b.transactionDate).getTime() : 0;
                return db - da;
            });
            return annotateProjections(sorted);
        } catch (err) {
            logger.error('projectedTx normalization failed', err, query.data);
            return [];
        }
    }, [query.data]);

    return {
        projectedTx,
        loading: query.isFetching || query.isPending || false,
        error: query.error ?? null,
        refetch: query.refetch,
        isError: query.isError ?? false,
        data: query.data, // raw data for callers that need it
    };
}

export default useProjectedTransactions;