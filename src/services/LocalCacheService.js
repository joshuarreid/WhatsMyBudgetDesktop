/**
 * LocalCacheService - Service for /api/cache endpoints using centralized apiClient.
 *
 * Mirrors the style of BudgetTransactionService: centralized apiClient usage,
 * robust logging, X-Transaction-ID handled by apiClient, and explicit resource paths.
 */

const logger = {
    info: (...args) => console.log('[LocalCacheService]', ...args),
    error: (...args) => console.error('[LocalCacheService]', ...args),
};

import { apiClient } from '../lib/apiClient';

const RESOURCE = '/api/cache';

const localCacheService = {
    /**
     * GET /api/cache/{cacheKey}
     * @param {String} cacheKey
     * @returns {Object} response.data
     */
    async get(cacheKey) {
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
    },

    /**
     * POST /api/cache?cacheKey=...&cacheValue=...
     * @param {String} cacheKey
     * @param {String} cacheValue
     * @returns {Object} response.data
     */
    async set(cacheKey, cacheValue) {
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
    },

    /**
     * DELETE /api/cache/{cacheKey}
     * (optional convenience method in same style)
     */
    async delete(cacheKey) {
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
    },

    /**
     * DELETE /api/cache (delete all) - use with caution
     */
    async deleteAll() {
        logger.info('deleteAll entry');
        try {
            const response = await apiClient.delete(RESOURCE);
            logger.info('deleteAll success', { status: response.status, dataPreview: response.data });
            return response.data;
        } catch (err) {
            logger.error('deleteAll error', { message: err?.message, status: err?.response?.status });
            throw err;
        }
    },
};

export default localCacheService;