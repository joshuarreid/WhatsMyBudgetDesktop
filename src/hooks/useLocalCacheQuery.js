/**
 * useLocalCacheQuery
 * - Small hook library wrapping TanStack Query for the LocalCache resource.
 * - Provides:
 *   - useLocalCacheByKey(cacheKey, options) -> useQuery result returning a normalized cacheValue (string|null)
 *   - useSaveLocalCache(cacheKey) -> useMutation result for saving/updating a cache entry (mutate / mutateAsync)
 *
 * Conventions:
 * - Uses query keys from localCacheQueryKeys
 * - Normalizes response shapes: supports { cacheValue }, { value }, or raw string
 * - Applies conservative default query options (read-once semantics by default)
 *
 * @module hooks/useLocalCacheQuery
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import localCache from '../api/localCache/localCache';
import localCacheQueryKeys from '../api/localCache/localCacheQueryKeys';

/**
 * Standardized logger for this module.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[useLocalCacheQuery]', ...args),
    error: (...args) => console.error('[useLocalCacheQuery]', ...args),
};

/**
 * Normalize various server response shapes into a single cacheValue string or null.
 *
 * @param {any} res - raw response from localCache.fetchLocalCacheByKey or saveOrUpdateLocalCache
 * @returns {string|null} normalized cacheValue
 */
function normalizeCacheResponse(res) {
    return res?.cacheValue ?? res?.value ?? (typeof res === 'string' ? res : null);
}

/**
 * useLocalCacheByKey
 * - Fetches a single LocalCache entry by cacheKey and returns a TanStack Query result.
 * - Default options are conservative (no background refetches, infinite staleTime) to align with
 *   read-once semantics. You can override options via the `options` parameter.
 *
 * @param {string} cacheKey - key of the local cache entry
 * @param {object} [options={}] - optional additional useQuery options to override defaults
 * @returns {import('@tanstack/react-query').UseQueryResult<string|null, any>} query result with normalized data
 * @throws {Error} If cacheKey is falsy
 */
export function useLocalCacheByKey(cacheKey, options = {}) {
    if (!cacheKey) {
        throw new Error('useLocalCacheByKey: cacheKey is required');
    }

    const detailKey = localCacheQueryKeys.detailKey(cacheKey);

    return useQuery({
        queryKey: detailKey,
        queryFn: async () => {
            logger.info('fetchLocalCacheByKey', { cacheKey });
            const res = await localCache.fetchLocalCacheByKey(cacheKey);
            const normalized = normalizeCacheResponse(res);
            logger.info('fetchLocalCacheByKey result', { cacheKey, normalized });
            return normalized;
        },
        // conservative defaults to avoid unexpected refetches — callers may override
        staleTime: Infinity,
        cacheTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: false,
        ...options,
    });
}

/**
 * useSaveLocalCache
 * - Mutation hook for saving/updating a LocalCache entry.
 * - On success seeds the query cache for the corresponding detail key with the normalized saved value.
 *
 * @param {string} cacheKey - key to save/update
 * @returns {import('@tanstack/react-query').UseMutationResult<string, any, any, any>} mutation result
 * @throws {Error} If cacheKey is falsy
 */
export function useSaveLocalCache(cacheKey) {
    if (!cacheKey) {
        throw new Error('useSaveLocalCache: cacheKey is required');
    }

    const queryClient = useQueryClient();
    const detailKey = localCacheQueryKeys.detailKey(cacheKey);

    return useMutation({
        mutationFn: async (value) => {
            logger.info('saveOrUpdateLocalCache', { cacheKey, value });
            const res = await localCache.saveOrUpdateLocalCache(cacheKey, String(value));
            const normalized = normalizeCacheResponse(res) ?? String(value);
            logger.info('saveOrUpdateLocalCache result', { cacheKey, normalized });
            return normalized;
        },
        onSuccess: (normalized) => {
            // Seed the detail query so other consumers can read the new value
            queryClient.setQueryData(detailKey, normalized);
            logger.info('setQueryData for detailKey', { detailKey, normalized });
        },
        onError: (err) => {
            logger.error('saveOrUpdateLocalCache failed', err);
        },
    });
}

export default {
    useLocalCacheByKey,
    useSaveLocalCache,
};