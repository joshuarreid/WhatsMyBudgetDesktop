/**
 * ProjectedTransactionService - Service for backend REST API calls for projected transactions.
 *
 * Mirrors the style and flow of other service modules in the codebase:
 * - centralized apiClient usage
 * - robust logging
 * - explicit resource path: /api/projections
 *
 * All methods accept an optional transactionId argument which, if provided,
 * will be set as the X-Transaction-ID header for traceability.
 *
 * @module ProjectedTransactionService
 */

const logger = {
    info: (...args) => console.log('[ProjectedTransactionService]', ...args),
    error: (...args) => console.error('[ProjectedTransactionService]', ...args),
};

import { apiClient } from '../lib/apiClient';

const RESOURCE = '/api/projections';

const projectedTransactionService = {
    /**
     * GET /api/projections
     *
     * Fetch a list of projected transactions with optional filters.
     *
     * @async
     * @function getTransactions
     * @param {Object} [filters={}] - Optional query filters. Supported keys:
     *   { statementPeriod, account, category, criticality, paymentMethod }
     * @param {string} [transactionId] - Optional X-Transaction-ID header value.
     * @returns {Promise<Object>} Server response data (expected shape: { transactions, count, total })
     * @throws {Error} Rethrows any network / server error.
     */
    async getTransactions(filters = {}, transactionId) {
        logger.info('getTransactions entry', { filters });
        try {
            const config = transactionId
                ? { params: filters, headers: { 'X-Transaction-ID': transactionId } }
                : { params: filters };
            const response = await apiClient.get(RESOURCE, config);
            logger.info('getTransactions success', {
                count: response.data && typeof response.data.count === 'number' ? response.data.count : 0,
                total: response.data && response.data.total ? response.data.total : 0,
            });
            return response.data;
        } catch (err) {
            logger.error('getTransactions error', err);
            throw err;
        }
    },

    /**
     * GET /api/projections/{id}
     *
     * Fetch a single projected transaction by id.
     *
     * @async
     * @function getTransaction
     * @param {number|string} id - Transaction id (required).
     * @param {string} [transactionId] - Optional X-Transaction-ID header value.
     * @returns {Promise<Object>} The projected transaction object returned by the server.
     * @throws {Error} If id is missing or the request fails.
     */
    async getTransaction(id, transactionId) {
        logger.info('getTransaction entry', { id });
        if (!id) throw new Error('Transaction ID required');
        try {
            const config = transactionId ? { headers: { 'X-Transaction-ID': transactionId } } : undefined;
            const response = await apiClient.get(`${RESOURCE}/${encodeURIComponent(id)}`, config);
            logger.info('getTransaction success', { transaction: response.data });
            return response.data;
        } catch (err) {
            logger.error('getTransaction error', err);
            throw err;
        }
    },

    /**
     * POST /api/projections
     *
     * Create a new projected transaction.
     *
     * @async
     * @function createTransaction
     * @param {Object} transaction - ProjectedTransaction payload (required).
     * @param {string} [transactionId] - Optional X-Transaction-ID header value.
     * @returns {Promise<Object>} Created projected transaction returned by server.
     * @throws {Error} Rethrows any network / server error.
     */
    async createTransaction(transaction, transactionId) {
        logger.info('createTransaction entry', {
            transactionPreview: transaction ? { name: transaction.name, amount: transaction.amount, statementPeriod: transaction.statementPeriod } : null,
        });
        try {
            const config = transactionId ? { headers: { 'X-Transaction-ID': transactionId } } : undefined;
            const response = await apiClient.post(RESOURCE, transaction, config);
            logger.info('createTransaction success', { created: response.data });
            return response.data;
        } catch (err) {
            logger.error('createTransaction error', err);
            throw err;
        }
    },

    /**
     * PUT /api/projections/{id}
     *
     * Update an existing projected transaction.
     *
     * @async
     * @function updateTransaction
     * @param {number|string} id - Transaction id (required).
     * @param {Object} transaction - Updated transaction payload (required).
     * @param {string} [transactionId] - Optional X-Transaction-ID header value.
     * @returns {Promise<Object>} Updated projected transaction returned by server.
     * @throws {Error} If id missing or the request fails.
     */
    async updateTransaction(id, transaction, transactionId) {
        logger.info('updateTransaction entry', { id, transactionPreview: transaction ? { name: transaction.name, amount: transaction.amount } : null });
        if (!id) throw new Error('Transaction ID required');
        try {
            const config = transactionId ? { headers: { 'X-Transaction-ID': transactionId } } : undefined;
            const response = await apiClient.put(`${RESOURCE}/${encodeURIComponent(id)}`, transaction, config);
            logger.info('updateTransaction success', { updated: response.data });
            return response.data;
        } catch (err) {
            logger.error('updateTransaction error', err);
            throw err;
        }
    },

    /**
     * DELETE /api/projections/{id}
     *
     * Delete a projected transaction by id.
     *
     * @async
     * @function deleteTransaction
     * @param {number|string} id - Transaction id (required).
     * @param {string} [transactionId] - Optional X-Transaction-ID header value.
     * @returns {Promise<Object>} Server response body.
     * @throws {Error} If id missing or the request fails.
     */
    async deleteTransaction(id, transactionId) {
        logger.info('deleteTransaction entry', { id });
        if (!id) throw new Error('Transaction ID required');
        try {
            const config = transactionId ? { headers: { 'X-Transaction-ID': transactionId } } : undefined;
            const response = await apiClient.delete(`${RESOURCE}/${encodeURIComponent(id)}`, config);
            logger.info('deleteTransaction success', { status: response.status });
            return response.data;
        } catch (err) {
            logger.error('deleteTransaction error', err);
            throw err;
        }
    },

    /**
     * DELETE /api/projections
     *
     * Delete all projected transactions.
     *
     * @async
     * @function deleteAllTransactions
     * @param {string} [transactionId] - Optional X-Transaction-ID header value.
     * @returns {Promise<Object>} Server response (e.g., { deletedCount }).
     * @throws {Error} If the request fails.
     */
    async deleteAllTransactions(transactionId) {
        logger.info('deleteAllTransactions entry');
        try {
            const config = transactionId ? { headers: { 'X-Transaction-ID': transactionId } } : undefined;
            const response = await apiClient.delete(RESOURCE, config);
            logger.info('deleteAllTransactions success', { deletedCount: response.data?.deletedCount });
            return response.data;
        } catch (err) {
            logger.error('deleteAllTransactions error', err);
            throw err;
        }
    },
};

export default projectedTransactionService;