/**
 * useProjectedTransactionQuery
 * - Hook wrapping TanStack Query (v5) to fetch projected (planned) transactions.
 * - Aligns query key construction with the budget transaction hook so keys are
 *   conical and consistent across the app.
 *
 * Changes:
 * - Accepts a single filters object (like useBudgetTransactionsQuery) instead of
 *   separate account/statementPeriod args.
 * - Uses projectedTransactionQueryKeys helpers to build canonical keys:
 *     - If filters.account is present -> accountListKey(account, restFilters)
 *     - Otherwise -> listKey(filters | null)
 * - Delegates account-scoped fetches to fetchAccountProjectedTransactionList(account, rest)
 * - For non-account filters, calls fetchAllProjectedTransactions() and applies a
 *   best-effort client-side filter for simple keys (statementPeriod, category)
 *   because the projections client has only getAll / getAccount endpoints.
 *
 * Logging, JSDoc and shape conventions follow the project's standards.
 *
 * @module hooks/useProjectedTransactionQuery
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import projectedTransactionApi from '../api/projectedTransaction/projectedTransaction';
import qk from '../api/projectedTransaction/projectedTransactionQueryKeys';

/**
 * Standardized logger for this module.
 * @constant
 */
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
 * Best-effort client-side filter for simple projection list filtering.
 *
 * NOTE: This only handles simple equality filters such as statementPeriod, category.
 * Server-side filtering is preferred; this exists to keep keys canonical when clients
 * include filters but the projections endpoint lacks a parameterized list endpoint.
 *
 * @param {Array<Object>} arr - input array
 * @param {Object} filters - filters object (may contain statementPeriod, category, etc.)
 * @returns {Array<Object>} filtered array
 */
function applyClientSideFilters(arr = [], filters = {}) {
    try {
        if (!filters || !Object.keys(filters).length) return arr;
        return arr.filter((item) => {
            // statementPeriod: equality match on item.statementPeriod
            if (filters.statementPeriod && String(item?.statementPeriod) !== String(filters.statementPeriod)) return false;
            // category: equality or substring match
            if (filters.category) {
                const cat = String(item?.category ?? '');
                const want = String(filters.category);
                if (!cat.toLowerCase().includes(want.toLowerCase())) return false;
            }
            // paymentMethod, criticality etc. - equality if present
            if (filters.paymentMethod && String(item?.paymentMethod) !== String(filters.paymentMethod)) return false;
            if (filters.criticality && String(item?.criticality) !== String(filters.criticality)) return false;
            return true;
        });
    } catch (err) {
        logger.error('applyClientSideFilters failed', err);
        return arr;
    }
}

/**
 * Build a react-query key for projected transactions using centralized helpers.
 *
 * - If filters.account present, use accountListKey(account, restFilters)
 * - Otherwise use listKey(filtersOrNull)
 *
 * @param {Object} [filters={}]
 * @returns {Array<any>} react-query key
 */
function buildQueryKey(filters = {}) {
    try {
        const hasFilters = filters && Object.keys(filters || {}).length > 0;
        if (hasFilters && filters.account) {
            const { account, ...rest } = filters;
            const restFilters = Object.keys(rest).length ? rest : null;
            return qk.accountListKey(String(account), restFilters);
        }
        const listFilters = hasFilters ? filters : null;
        return qk.listKey(listFilters);
    } catch (err) {
        logger.error('buildQueryKey failed, falling back to sensible key', err, { filters });
        // conservative fallback
        return filters?.account
            ? ['projections', 'accounts', String(filters.account), filters.statementPeriod ?? null]
            : ['projections', 'list', filters?.statementPeriod ?? null];
    }
}

/**
 * useProjectedTransactionsQuery
 *
 * - Fetches projected transactions using a single filters object consistent with budget queries.
 * - Returned data is a sorted (newest-first by transactionDate) and annotated array of projections.
 *
 * @param {Object} [filters={}] - optional filters: account, statementPeriod, category, paymentMethod, criticality, etc.
 * @param {Object} [options={}] - optional useQuery overrides
 * @returns {{
 *   projectedTx: Array<Object>,
 *   loading: boolean,
 *   error: any,
 *   refetch: Function,
 *   isError: boolean,
 *   data: any
 * }}
 */
export function useProjectedTransactionsQuery(filters = {}, options = {}) {
    const queryKey = buildQueryKey(filters);

    const query = useQuery({
        queryKey,
        queryFn: async () => {
            logger.info('fetchProjectedTransactions (queryFn) called', { filters });

            // Account-scoped request
            if (filters && typeof filters === 'object' && filters.account) {
                const { account, ...rest } = filters;
                try {
                    const acctList = await projectedTransactionApi.fetchAccountProjectedTransactionList(String(account), rest || {});
                    // flatten server-provided account structure into an array
                    return flattenAccountProjectedList(acctList);
                } catch (err) {
                    logger.error('fetchAccountProjectedTransactionList failed', err, { account, rest });
                    throw err;
                }
            }

            // Non-account / global request - projections API exposes only getAll, so call that
            try {
                const all = await projectedTransactionApi.fetchAllProjectedTransactions();
                // normal shapes:
                // - Array (direct)
                // - { projections: [...] }
                // - { personalTransactions, jointTransactions }
                if (Array.isArray(all)) return all;
                if (all && Array.isArray(all.projections)) return all.projections;
                if (all && (all.personalTransactions || all.jointTransactions)) return flattenAccountProjectedList(all);
                // if unknown wrapper but contains listish fields, try common names
                const maybeArr = all?.data ?? all?.results ?? all?.transactions ?? null;
                if (Array.isArray(maybeArr)) return maybeArr;
                // fallback to empty
                return [];
            } catch (err) {
                logger.error('fetchAllProjectedTransactions failed', err, { filters });
                throw err;
            }
        },
        // conservative defaults; callers can override
        staleTime: Infinity,
        cacheTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
        ...options,
    });

    /**
     * Normalize: ensure consistent array, apply client-side filters (when non-account),
     * sort newest-first by transactionDate, and annotate items.
     */
    const projectedTx = useMemo(() => {
        try {
            const raw = query.data ?? [];
            const arr = Array.isArray(raw) ? raw : [];
            // Apply client-side filters only for non-account queries.
            const isAccountScoped = Boolean(filters && typeof filters === 'object' && filters.account);
            const filtered = isAccountScoped ? arr : applyClientSideFilters(arr, filters || {});
            // Sort newest-first by transactionDate when available
            const sorted = [...filtered].sort((a, b) => {
                const da = a?.transactionDate ? new Date(a.transactionDate).getTime() : 0;
                const db = b?.transactionDate ? new Date(b.transactionDate).getTime() : 0;
                return db - da;
            });
            return annotateProjections(sorted);
        } catch (err) {
            logger.error('projectedTx normalization failed', err, query.data);
            return [];
        }
        // Note: include filters so updates to filters re-run memoization/sorting
    }, [query.data, JSON.stringify(filters || {})]);

    return {
        projectedTx,
        loading: query.isFetching || query.isPending || false,
        error: query.error ?? null,
        refetch: query.refetch,
        isError: query.isError ?? false,
        data: query.data, // raw server response or flattened array
    };
}

export default useProjectedTransactionsQuery;