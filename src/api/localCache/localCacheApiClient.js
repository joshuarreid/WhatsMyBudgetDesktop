/**
 * LocalCacheApiClient
 * - Resource client for LocalCache endpoints.
 * - Thin wrapper around ApiClient providing convenience methods for /api/cache.
 *
 * This file adds extra diagnostic logging around requests so failures such as
 * CORS / wrong path / missing server handlers can be more easily diagnosed.
 *
 * @module src/api/localCache/localCacheApiClient
 */

import ApiClient from '../ApiClient';

const logger = {
    info: (...args) => console.log('[LocalCacheApiClient]', ...args),
    error: (...args) => console.error('[LocalCacheApiClient]', ...args),
};

/**
 * LocalCacheApiClient
 * @extends ApiClient
 */
export default class LocalCacheApiClient extends ApiClient {
    /**
     * Create a LocalCacheApiClient.
     *
     * @param {Object} [options]
     * @param {string} [options.baseURL] - explicit base url (optional)
     * @param {string} [options.apiPath] - path prefix for API (eg. 'api')
     */
    constructor(options = {}) {
        // Default apiPath to 'api' if caller doesn't provide one; this mirrors other clients in the app.
        const { baseURL = undefined, apiPath = 'api', timeout = 10000 } = options;
        super({ baseURL, apiPath, timeout });
        logger.info('constructed', { baseURL: this.baseURL, apiPath: this.apiPath });
    }

    /**
     * Build the resource endpoint for local cache operations.
     *
     * @param {string} relative - relative resource path under cache (e.g. '')
     * @returns {string} endpoint string (without leading slash)
     */
    resource(relative = '') {
        // resourceEndpoint is provided by ApiClient base class
        return this.resourceEndpoint('cache', relative);
    }

    /**
     * Save or update a cache entry.
     *
     * NOTE:
     * - Uses POST to the /api/cache resource with params { cacheKey, cacheValue }.
     * - Adds extra logging including the effective URL to help diagnose network/CORS problems.
     *
     * @async
     * @param {string} cacheKey
     * @param {string} cacheValue
     * @returns {Promise<any>} server response (as returned by ApiClient.post -> response.data)
     * @throws {Error} normalized ApiClient error on failure
     */
    async saveOrUpdate(cacheKey, cacheValue) {
        this.validateRequired(cacheKey, 'cacheKey', 'string');
        logger.info('saveOrUpdate called', { cacheKey });

        // Build endpoint and log effective URL for diagnostics
        const endpoint = this.resource(); // e.g. "cache"
        // _buildUrl is an instance method on ApiClient; use it to compute the path portion.
        // Full URL = configured baseURL + _buildUrl(endpoint)
        let effectiveUrl = '<unknown>';
        try {
            const built = this._buildUrl(endpoint);
            effectiveUrl = `${this.baseURL}${built}`;
        } catch (err) {
            // ignore - log fallback
            effectiveUrl = `${this.baseURL}/${endpoint}`;
        }

        logger.info('saveOrUpdate: will POST', { endpoint, effectiveUrl, params: { cacheKey, cacheValuePreview: String(cacheValue).slice(0, 256) } });

        try {
            // We use POST with params for compatibility with the previous LocalCacheService implementation.
            // If your backend expects a JSON body instead, change to pass data in the second arg.
            const result = await this.post(endpoint, null, { params: { cacheKey, cacheValue: String(cacheValue) } });
            logger.info('saveOrUpdate: success', { cacheKey, effectiveUrl });
            return result;
        } catch (err) {
            // Log the full normalized error and rethrow so callers (hooks) can handle it.
            logger.error('saveOrUpdate failed', { cacheKey, effectiveUrl, error: err });
            throw err;
        }
    }

    /**
     * Fetch a cache entry by key.
     *
     * @async
     * @param {string} cacheKey
     * @returns {Promise<any>}
     */
    async getByKey(cacheKey) {
        this.validateRequired(cacheKey, 'cacheKey', 'string');
        const endpoint = this.resource(cacheKey);
        try {
            logger.info('getByKey', { cacheKey, endpoint });
            return await this.get(endpoint);
        } catch (err) {
            logger.error('getByKey failed', { cacheKey, error: err });
            throw err;
        }
    }

    /**
     * Delete a cache entry by key.
     *
     * @async
     * @param {string} cacheKey
     * @returns {Promise<any>}
     */
    async deleteByKey(cacheKey) {
        this.validateRequired(cacheKey, 'cacheKey', 'string');
        const endpoint = this.resource(cacheKey);
        try {
            logger.info('deleteByKey', { cacheKey, endpoint });
            return await this.delete(endpoint);
        } catch (err) {
            logger.error('deleteByKey failed', { cacheKey, error: err });
            throw err;
        }
    }
}