/**
 * LocalCacheService.
 * Service for /api/cache endpoints using centralized apiClient.
 * Provides get, set, delete, and deleteAll cache operations.
 *
 * @module LocalCacheService
 */

const logger = {
    info: (...args) => console.log('[LocalCacheService]', ...args),
    error: (...args) => console.error('[LocalCacheService]', ...args),
};

import { apiClient } from '../lib/apiClient';

const RESOURCE = '/api/cache';

/**
 * Gets cache value by key.
 * @async
 * @function get
 * @param {string} cacheKey
 * @returns {Promise<object>} response.data
 * @throws {Error} If request fails.
 */
async function get(cacheKey) {
    logger.info('get entry', { cacheKey });
    if (!cacheKey) throw new Error('cacheKey required');
    try {
        const response = await apiClient.get(`${RESOURCE}/${encodeURIComponent(cacheKey)}`);
        logger.info('get success', { cacheKey, status: response.status, dataPreview: response.data });
        return response.data;
    } catch (err) {
        logger.error('get error', { cacheKey, message: err?.message, status: err?.response?.status });
        throw err;
    }
}

/**
 * Sets cache value by key.
 * @async
 * @function set
 * @param {string} cacheKey
 * @param {string} cacheValue
 * @returns {Promise<object>} response.data
 * @throws {Error} If request fails.
 */
async function set(cacheKey, cacheValue) {
    logger.info('set entry', { cacheKey, cacheValue });
    if (!cacheKey) throw new Error('cacheKey required');
    try {
        const response = await apiClient.post(RESOURCE, null, {
            params: { cacheKey, cacheValue: String(cacheValue) },
        });
        logger.info('set success', { cacheKey, status: response.status, dataPreview: response.data });
        return response.data;
    } catch (err) {
        logger.error('set error', { cacheKey, message: err?.message, status: err?.response?.status });
        throw err;
    }
}

/**
 * Deletes cache value by key.
 * @async
 * @function delete
 * @param {string} cacheKey
 * @returns {Promise<object>} response.data
 * @throws {Error} If request fails.
 */
async function deleteCache(cacheKey) {
    logger.info('delete entry', { cacheKey });
    if (!cacheKey) throw new Error('cacheKey required');
    try {
        const response = await apiClient.delete(`${RESOURCE}/${encodeURIComponent(cacheKey)}`);
        logger.info('delete success', { cacheKey, status: response.status });
        return response.data;
    } catch (err) {
        logger.error('delete error', { cacheKey, message: err?.message, status: err?.response?.status });
        throw err;
    }
}

/**
 * Deletes all cache values.
 * @async
 * @function deleteAll
 * @returns {Promise<object>} response.data
 * @throws {Error} If request fails.
 */
async function deleteAll() {
    logger.info('deleteAll entry');
    try {
        const response = await apiClient.delete(RESOURCE);
        logger.info('deleteAll success', { status: response.status, dataPreview: response.data });
        return response.data;
    } catch (err) {
        logger.error('deleteAll error', { message: err?.message, status: err?.response?.status });
        throw err;
    }
}

const localCacheService = {
    get,
    set,
    delete: deleteCache,
    deleteAll,
};

export default localCacheService;