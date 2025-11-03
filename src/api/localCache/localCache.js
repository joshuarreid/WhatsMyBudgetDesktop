/**
 * Thin fetcher module for LocalCache endpoints.
 *
 * - Responsible for creating its own LocalCacheApiClient instance.
 * - Construct the client with an explicit baseURL and apiPath (for reliable behavior in dev).
 *
 * This module delegates to LocalCacheApiClient and exposes simple functions used by hooks.
 *
 * @module src/api/localCache/localCache
 */
import LocalCacheApiClient from "./localCacheApiClient";

/**
 * Standardized logger for this module.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[localCache]', ...args),
    error: (...args) => console.error('[localCache]', ...args),
};

/**
 * Resolve base URL from environment (prefer REACT_APP_BASE_URL).
 *
 * @returns {string|null}
 */
function resolveBaseUrl() {
    try {
        if (typeof process !== 'undefined' && process.env) {
            const v = process.env.REACT_APP_BASE_URL || process.env.BASE_URL || null;
            return v ? String(v).trim().replace(/\/+$/, '') : null;
        }
    } catch (err) {
        logger.error('resolveBaseUrl error', err);
    }
    return null;
}

/**
 * BaseURL and apiPath used to construct the resource client.
 * - apiPath defaults to 'api' to match other ApiClient usage in the app.
 */
const baseURL = resolveBaseUrl();
const apiPath = 'api';

logger.info('Constructing LocalCacheApiClient', { baseURL, apiPath });

/**
 * Internal API client instance managed by this module.
 *
 * Notes:
 * - LocalCacheApiClient accepts an options object and forwards to ApiClient.
 * - If baseURL is null the ApiClient will still try to resolve from env; ensure REACT_APP_BASE_URL is set.
 */
const apiClient = new LocalCacheApiClient({ baseURL, apiPath });

/**
 * Fetch a cache entry by key.
 *
 * @async
 * @param {string} cacheKey
 * @returns {Promise<Object|null>} cache entry or null (404 handled by server)
 */
export async function fetchLocalCacheByKey(cacheKey) {
    logger.info('fetchLocalCacheByKey called', { cacheKey });
    try {
        return await apiClient.getByKey(cacheKey);
    } catch (err) {
        logger.error('fetchLocalCacheByKey failed', err);
        throw err;
    }
}

/**
 * Save or update a cache entry.
 *
 * @async
 * @param {string} cacheKey
 * @param {string} cacheValue
 * @returns {Promise<Object>} saved LocalCache entry
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
 * @async
 * @param {string} cacheKey
 * @returns {Promise<void|Object>}
 */
export async function deleteLocalCacheByKey(cacheKey) {
    logger.info('deleteLocalCacheByKey called', { cacheKey });
    try {
        return await apiClient.deleteByKey(cacheKey);
    } catch (err) {
        logger.error('deleteLocalCacheByKey failed', err);
        throw err;
    }
}

/**
 * Default export: convenience object exposing functions.
 */
const localCache = {
    fetchLocalCacheByKey,
    saveOrUpdateLocalCache,
    deleteLocalCacheByKey,
};

export default localCache;