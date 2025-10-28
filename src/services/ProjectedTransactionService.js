/**
 * ProjectedTransactionService - Service for backend REST API calls (Spring Boot) for projected transactions,
 * using a shared apiClient. Mirrors the style and flow of BudgetTransactionService:
 * - centralized apiClient usage
 * - robust logging
 * - explicit resource path: /api/projections
 *
 * Also exposes account-scoped fetch that returns AccountProjectedTransactionList
 * (personal + joint split) via GET /api/projections/account.
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
     * @returns {Promise<Object>} - Server response data (expected shape: ProjectedTransactionList)
     * @throws {Error} - Rethrows any network / server error.
     */
    async getTransactions(filters = {}, transactionId) {
        logger.info('getTransactions entry', { filters });
        try {
            const config = transactionId ? { params: filters, headers: { 'X-Transaction-ID': transactionId } } : { params: filters };
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
     * @returns {Promise<Object>} - The projected transaction object returned by the server.
     * @throws {Error} - If id is missing or the request fails.
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
     * GET /api/projections/account
     *
     * Fetch projected transactions for an account with split into personal/joint.
     * This mirrors budgetTransactionService.getTransactionsForAccount but for projections.
     *
     * @async
     * @function getTransactionsForAccount
     * @param {Object} params - { account, statementPeriod, category, criticality, paymentMethod }
     * @param {string} [transactionId] - Optional X-Transaction-ID header value.
     * @returns {Promise<Object>} - Server response: AccountProjectedTransactionList
     *   - { personalTransactions: ProjectedTransactionList, jointTransactions: ProjectedTransactionList, personalTotal, jointTotal, total }
     * @throws {Error} - Rethrows any network / server error.
     */
    async getTransactionsForAccount({ account, statementPeriod, category, criticality, paymentMethod } = {}, transactionId) {
        logger.info('getTransactionsForAccount entry', { account, statementPeriod, category, criticality, paymentMethod });
        if (!account) throw new Error('Account is required');
        try {
            const config = transactionId
                ? { params: { account, statementPeriod, category, criticality, paymentMethod }, headers: { 'X-Transaction-ID': transactionId } }
                : { params: { account, statementPeriod, category, criticality, paymentMethod } };
            const response = await apiClient.get(`${RESOURCE}/account`, config);
            logger.info('getTransactionsForAccount success', {
                personalCount: response.data?.personalTransactions?.count ?? 0,
                jointCount: response.data?.jointTransactions?.count ?? 0,
                personalTotal: response.data?.personalTotal,
                jointTotal: response.data?.jointTotal,
            });
            return response.data;
        } catch (err) {
            logger.error('getTransactionsForAccount error', err);
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
     * @returns {Promise<Object>} - Created projected transaction returned by server.
     * @throws {Error} - Rethrows any network / server error.
     */
    async createTransaction(transaction, transactionId) {
        logger.info('createTransaction entry', { transactionPreview: transaction ? { name: transaction.name, amount: transaction.amount, statementPeriod: transaction.statementPeriod } : null });
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
     * @returns {Promise<Object>} - Updated projected transaction returned by server.
     * @throws {Error} - If id missing or the request fails.
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
     * @returns {Promise<Object>} - Server response body.
     * @throws {Error} - If id missing or the request fails.
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
     * @returns {Promise<Object>} - Server response (e.g., { deletedCount }).
     * @throws {Error} - If the request fails.
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