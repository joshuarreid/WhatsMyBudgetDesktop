/**
 * Simple, human-friendly query keys for TanStack Query (react-query)
 * for the LocalCache resource.
 *
 * - Minimal constants and helpers so hooks/components can share keys for
 *   queries and invalidations.
 * - Keys are plain arrays (recommended by TanStack Query).
 *
 * Usage:
 *   import qk from './localCacheQueryKeys';
 *   useQuery(qk.listKey(), () => api.getAllLocalCache());
 *   useQuery(qk.detailKey('my-key'), () => api.getLocalCacheByKey('my-key'));
 *
 * @module localCacheQueryKeys
 */

/**
 * Standardized logger for this module.
 * @constant
 * @type {{info: Function, error: Function}}
 */
const logger = {
    info: (...args) => console.log('[localCacheQueryKeys]', ...args),
    error: (...args) => console.error('[localCacheQueryKeys]', ...args),
};

logger.info('localCacheQueryKeys loaded');

/**
 * Base key for the LocalCache resource.
 * @type {Array<string>}
 */
export const LOCAL_CACHE = ['localCache'];

/**
 * Key prefix for list queries.
 * @type {Array<any>}
 */
export const LOCAL_CACHE_LISTS = [...LOCAL_CACHE, 'list'];

/**
 * Return the key for the cache list (optionally include filters).
 *
 * @param {Object|null} [filters=null] - optional filters (e.g. pagination or search)
 * @returns {Array<any>} query key
 */
export function listKey(filters = null) {
    return filters ? [...LOCAL_CACHE_LISTS, filters] : LOCAL_CACHE_LISTS;
}

/**
 * Return the key for a single cache entry by cacheKey.
 *
 * @param {string} cacheKey - the cache entry key
 * @returns {Array<any>} query key
 */
export function detailKey(cacheKey) {
    return [...LOCAL_CACHE, 'detail', String(cacheKey)];
}

/**
 * Mutation key for save/update operations.
 *
 * @returns {Array<any>}
 */
export const saveKey = () => [...LOCAL_CACHE, 'save'];

/**
 * Mutation key for delete operations.
 *
 * @param {string} cacheKey
 * @returns {Array<any>}
 */
export const removeKey = (cacheKey) => [...LOCAL_CACHE, 'remove', String(cacheKey)];

/**
 * Convenience: key used to invalidate all lists.
 *
 * @returns {Array<any>}
 */
export const invalidateListsKey = () => LOCAL_CACHE_LISTS;

/**
 * Convenience: key used to invalidate a single detail entry.
 *
 * @param {string} cacheKey
 * @returns {Array<any>}
 */
export const invalidateDetailKey = (cacheKey) => detailKey(cacheKey);

/**
 * Default export with grouped helpers (handy for importing everything).
 */
const localCacheQueryKeys = {
    LOCAL_CACHE,
    LOCAL_CACHE_LISTS,
    listKey,
    detailKey,
    saveKey,
    removeKey,
    invalidateListsKey,
    invalidateDetailKey,
};

export default localCacheQueryKeys;