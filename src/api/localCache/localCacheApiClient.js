/**
 * Thin API client for the /cache resource (LocalCache).
 *
 * - Extends the generic ApiClient and delegates endpoint construction to ApiClient.resourceEndpoint
 * - Methods are intentionally small and descriptive (thin wrappers)
 * - Uses ApiClient.validateRequired for parameter validation
 * - POST uses application/x-www-form-urlencoded (controller expects @RequestParam)
 * - X-Transaction-ID is generated and attached by ApiClient; callers must not pass it.
 *
 * @module LocalCacheApiClient
 */

import ApiClient from './ApiClient';

/**
 * Standardized logger for this module.
 * @constant
 * @type {{info: Function, error: Function}}
 */
const logger = {
    info: (...args) => console.log('[LocalCacheApiClient]', ...args),
    error: (...args) => console.error('[LocalCacheApiClient]', ...args),
};

/**
 * LocalCacheApiClient - thin client for /cache endpoints.
 */
export default class LocalCacheApiClient extends ApiClient {
    /**
     * Create a LocalCacheApiClient instance.
     *
     * @param {Object} options
     * @param {string} options.baseURL - API base URL (required)
     * @param {number} [options.timeout] - Request timeout in ms
     * @param {string} [options.apiPath] - Base API path (e.g. 'api' or '/api')
     * @param {string} [options.resourcePath='cache'] - Resource path for this client (no leading slash)
     */
    constructor({ baseURL, timeout, apiPath, resourcePath = 'cache' } = {}) {
        super({ baseURL, timeout, apiPath });
        this.resourcePath = String(resourcePath || 'cache').replace(/^\/+|\/+$/g, '');
        logger.info('constructed', { baseURL, apiPath, resourcePath: this.resourcePath });
    }

    /**
     * Get all cache entries.
     *
     * @async
     * @returns {Promise<Array<Object>>} list of LocalCache entries
     * @throws {Object} normalized ApiClient error
     */
    async getAllLocalCache() {
        logger.info('getAllLocalCache called');
        return this.get(this.resourceEndpoint(this.resourcePath));
    }

    /**
     * Get a single cache entry by key.
     *
     * @async
     * @param {string} cacheKey - cache key to fetch
     * @returns {Promise<Object|null>} LocalCache entry or null/404 handled by server
     * @throws {Error} if cacheKey is invalid
     * @throws {Object} normalized ApiClient error
     */
    async getLocalCacheByKey(cacheKey) {
        logger.info('getLocalCacheByKey called', { cacheKey });
        this.validateRequired(cacheKey, 'cacheKey', 'string');
        // encode key for safe path usage
        const safeKey = encodeURIComponent(String(cacheKey));
        return this.get(this.resourceEndpoint(this.resourcePath, safeKey));
    }

    /**
     * Create or update a cache entry.
     *
     * Note: the server expects @RequestParam for cacheKey and cacheValue. We send
     * an x-www-form-urlencoded body so Spring binds the params correctly.
     *
     * X-Transaction-ID will be attached by ApiClient automatically.
     *
     * @async
     * @param {string} cacheKey - key for the cache entry
     * @param {string} cacheValue - value for the cache entry
     * @returns {Promise<Object>} saved LocalCache entry
     * @throws {Error} if inputs are invalid
     * @throws {Object} normalized ApiClient error
     */
    async saveOrUpdate(cacheKey, cacheValue) {
        logger.info('saveOrUpdate called', { cacheKey });
        this.validateRequired(cacheKey, 'cacheKey', 'string');
        this.validateRequired(cacheValue, 'cacheValue', 'string');

        const bodyParams = new URLSearchParams();
        bodyParams.append('cacheKey', String(cacheKey));
        bodyParams.append('cacheValue', String(cacheValue));

        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
        };

        return this.post(this.resourceEndpoint(this.resourcePath), bodyParams, { headers });
    }

    /**
     * Delete a cache entry by key.
     *
     * @async
     * @param {string} cacheKey - cache key to delete
     * @returns {Promise<void|Object>} no-content on success; server may return body in errors
     * @throws {Error} if cacheKey is invalid
     * @throws {Object} normalized ApiClient error
     */
    async deleteLocalCacheByKey(cacheKey) {
        logger.info('deleteLocalCacheByKey called', { cacheKey });
        this.validateRequired(cacheKey, 'cacheKey', 'string');
        const safeKey = encodeURIComponent(String(cacheKey));
        return this.delete(this.resourceEndpoint(this.resourcePath, safeKey));
    }
}