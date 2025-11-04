/**
 * statementPeriodQuery
 *
 * React Query wrapper for StatementPeriod endpoints.
 *
 * - Exposes fetcher compatible with queryClient.fetchQuery (fetchStatementPeriodsForKey)
 *   and a convenience hook useStatementPeriodsQuery for components/hooks to subscribe.
 * - Uses the centralized API client in ../statementPeriod/statementPeriod (thin fetcher).
 *
 * Conventions:
 * - TanStack Query v5 single-object signature for useQuery.
 * - Conservative defaults: no background refetching; data kept in cache indefinitely unless invalidated.
 *
 * @module api/statementPeriod/statementPeriodQuery
 */

import { useQuery } from '@tanstack/react-query';
import statementPeriod from "../api/statementPeriod/statementPeriod";
import statementPeriodQueryKeys from "../api/statementPeriod/statementPeriodQueryKeys";


const logger = {
    info: (...args) => console.log('[statementPeriodQuery]', ...args),
    error: (...args) => console.error('[statementPeriodQuery]', ...args),
};

/**
 * Default query options used by useStatementPeriodsQuery
 * @constant
 */
const DEFAULT_QUERY_OPTIONS = {
    staleTime: Infinity,
    cacheTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
};

/**
 * fetchStatementPeriodsForKey
 *
 * Fetcher function usable by react-query (and queryClient.fetchQuery).
 *
 * Signature intentionally ignores the queryKey first arg to match fetchQuery usage.
 *
 * @async
 * @param {Array<any>} _key - react-query key (ignored)
 * @returns {Promise<any>} server response (list or raw)
 * @throws {Error|Object} when the underlying request fails
 */
export async function fetchStatementPeriodsForKey(_key) {
    logger.info('fetchStatementPeriodsForKey called');
    try {
        const res = await statementPeriod.fetchAllStatementPeriods();
        return res;
    } catch (err) {
        logger.error('fetchStatementPeriodsForKey failed', err);
        throw err;
    }
}

/**
 * useStatementPeriodsQuery
 *
 * Hook to subscribe to the list of statement periods.
 *
 * @param {Object} [options={}] - optional react-query options override
 * @returns {{
 *   data: any,
 *   isLoading: boolean,
 *   isError: boolean,
 *   error: any,
 *   refetch: Function,
 *   queryKey: Array<any>,
 *   _raw: import('@tanstack/react-query').UseQueryResult
 * }}
 */
export function useStatementPeriodsQuery(options = {}) {
    const qKey = statementPeriodQueryKeys.listKey();

    const query = useQuery({
        queryKey: qKey,
        queryFn: async () => {
            logger.info('useStatementPeriodsQuery queryFn: fetching statement periods');
            return await fetchStatementPeriodsForKey(qKey);
        },
        ...DEFAULT_QUERY_OPTIONS,
        ...options,
    });

    return {
        data: query.data,
        isLoading: query.isFetching || query.isPending || false,
        isError: query.isError || false,
        error: query.error || null,
        refetch: query.refetch,
        queryKey: qKey,
        _raw: query,
    };
}

export default {
    useStatementPeriodsQuery,
    fetchStatementPeriodsForKey,
};