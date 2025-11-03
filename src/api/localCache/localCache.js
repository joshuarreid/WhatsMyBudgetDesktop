/**
 * Thin fetcher module for LocalCache endpoints.
 *
 * - Responsible for creating its own LocalCacheApiClient instance.
 * - Consumers simply call the exported functions (no baseURL, apiPath or transaction-id references here).
 * - ApiClient is responsible for resolving process.env.BASE_URL and attaching X-Transaction-ID header.
 *
 * JSDoc uses "cacheKey" to avoid confusion with the X-Transaction-ID header.
 *
 * @module localCache
 */

import LocalCacheApiClient from './localCacheApiClient';

/**
 * Standardized logger for this module.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[localCache]', ...args),
    error: (...args) => console.error('[localCache]', ...args),
};

/**
 * Internal API client instance managed by this module.
 * Constructed without an explicit baseURL so ApiClient will resolve process.env.BASE_URL.
 *
 * @type {LocalCacheApiClient}
 * @private
 */
const apiClient = new LocalCacheApiClient();

/**
 * Fetch all local cache entries.
 *
 * @async
 * @returns {Promise<Array<Object>>} array of LocalCache entries
 * @throws {Object} normalized ApiClient error
 */
export async function fetchAllLocalCache() {
    logger.info('fetchAllLocalCache called');
    try {
        return await apiClient.getAllLocalCache();
    } catch (err) {
        logger.error('fetchAllLocalCache failed', err);
        throw err;
    }
}

/**
 * Fetch a cache entry by key.
 *
 * NOTE: the identifier is cacheKey (resource key). This is NOT the X-Transaction-ID header.
 *
 * @async
 * @param {string} cacheKey - cache key to fetch
 * @returns {Promise<Object|null>} cache entry or null (404 handled by server)
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function fetchLocalCacheByKey(cacheKey) {
    logger.info('fetchLocalCacheByKey called', { cacheKey });
    try {
        return await apiClient.getLocalCacheByKey(cacheKey);
    } catch (err) {
        logger.error('fetchLocalCacheByKey failed', err);
        throw err;
    }
}

/**
 * Save or update a cache entry.
 *
 * @async
 * @param {string} cacheKey - key for the cache entry
 * @param {string} cacheValue - value for the cache entry
 * @returns {Promise<Object>} saved LocalCache entry
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function saveOrUpdateLocalCache(cacheKey, cacheValue) {
    logger.info('saveOrUpdateLocalCache called', { cacheKey });
    try {
        return await apiClient.saveOrUpdate(cacheKey, cacheValue);
    } catch (err) {
        logger.error('saveOrUpdateLocalCache failed', err);
        throw err;
    }
}

/**
 * Delete a cache entry by key.
 *
 * NOTE: the identifier is cacheKey (resource key). This is NOT the X-Transaction-ID header.
 *
 * @async
 * @param {string} cacheKey - key to delete
 * @returns {Promise<void|Object>} no-content on success
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function deleteLocalCacheByKey(cacheKey) {
    logger.info('deleteLocalCacheByKey called', { cacheKey });
    try {
        return await apiClient.deleteLocalCacheByKey(cacheKey);
    } catch (err) {
        logger.error('deleteLocalCacheByKey failed', err);
        throw err;
    }
}

/**
 * Default export: convenience object exposing functions.
 */
const localCache = {
    fetchAllLocalCache,
    fetchLocalCacheByKey,
    saveOrUpdateLocalCache,
    deleteLocalCacheByKey,
};

export default localCache;