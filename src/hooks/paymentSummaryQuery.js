/**
 * paymentSummaryQuery
 *
 * React Query hook + helpers for PaymentSummary endpoints.
 *
 * - Wraps the thin fetcher paymentSummary.fetchPaymentSummary and exposes a
 *   usePaymentSummaryQuery hook for components to subscribe to payment summary
 *   data keyed by (accounts, statementPeriod).
 * - Provides a fetcher function compatible with queryClient.fetchQuery so other
 *   code can programmatically fetch & prime the cache.
 *
 * Conventions:
 * - Bulletproof React: hook contains side-effects/data fetching; UI stays in .jsx files.
 * - Robust logger and JSDoc applied.
 *
 * NOTE:
 * - Updated to TanStack Query v5 single-object signature for useQuery/fetchQuery.
 *
 * @module api/paymentSummary/paymentSummaryQuery
 */

import { useQuery } from '@tanstack/react-query';
import paymentSummary from "../api/paymentSummary/paymentSummary";
import paymentSummaryQueryKeys from "../api/paymentSummary/paymentSummaryQueryKeys";


const logger = {
    info: (...args) => console.log('[paymentSummaryQuery]', ...args),
    error: (...args) => console.error('[paymentSummaryQuery]', ...args),
};

/**
 * Default query options for usePaymentSummaryQuery.
 * @constant
 * @type {Object}
 */
const DEFAULT_QUERY_OPTIONS = {
    staleTime: Infinity,
    cacheTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
};

/**
 * fetchPaymentSummaryForKey
 *
 * Thin wrapper around paymentSummary.fetchPaymentSummary that normalizes
 * the arguments for use with react-query's fetchQuery / queryFn.
 *
 * @async
 * @function fetchPaymentSummaryForKey
 * @param {Array<any>} _key - react-query key (provided by react-query; ignored)
 * @param {string|string[]} accounts - account or list of accounts
 * @param {string} statementPeriod - statement period identifier
 * @returns {Promise<any>} payment summary payload (server response)
 * @throws {Error} when the underlying fetch fails
 */
export async function fetchPaymentSummaryForKey(_key, accounts, statementPeriod) {
    logger.info('fetchPaymentSummaryForKey called', { accounts, statementPeriod });
    try {
        const res = await paymentSummary.fetchPaymentSummary(accounts, statementPeriod);
        return res;
    } catch (err) {
        logger.error('fetchPaymentSummaryForKey failed', err);
        throw err;
    }
}

/**
 * usePaymentSummaryQuery
 *
 * Hook to fetch payment summary for given accounts and statementPeriod.
 *
 * Behavior & notes:
 * - Query key is created via paymentSummaryQueryKeys.summaryKey(accounts, statementPeriod)
 *   so invalidation and sharing work correctly across the app.
 * - By default the hook will not refetch automatically; callers can override options.
 *
 * IMPORTANT:
 * - Uses TanStack Query v5 single-object signature for useQuery.
 *
 * @param {Object} params - query params
 * @param {string|string[]} [params.accounts] - account or list of accounts (optional)
 * @param {string} params.statementPeriod - statement period identifier (required to fetch)
 * @param {Object} [options] - optional react-query options override
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
export function usePaymentSummaryQuery({ accounts, statementPeriod } = {}, options = {}) {
    const qKey = paymentSummaryQueryKeys.summaryKey(accounts, statementPeriod);

    const query = useQuery({
        queryKey: qKey,
        queryFn: async () => {
            logger.info('usePaymentSummaryQuery fetching', { accounts, statementPeriod });
            return await paymentSummary.fetchPaymentSummary(accounts, statementPeriod);
        },
        enabled: Boolean(statementPeriod),
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

/**
 * Default export grouping helpers for convenient import.
 */
export default {
    usePaymentSummaryQuery,
    fetchPaymentSummaryForKey,
};