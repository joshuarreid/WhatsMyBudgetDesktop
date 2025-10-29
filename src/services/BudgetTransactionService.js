/**
 * budgetTransactionService - Service for backend REST API calls (Spring Boot), using a shared apiClient.
 * Uses config.baseUrl (API root). All endpoints use explicit resource paths like /api/transactions.
 * Robust logging and X-Transaction-ID handled by apiClient.
 */

const logger = {
    info: (...args) => console.log('[BudgetTransactionService]', ...args),
    error: (...args) => console.error('[BudgetTransactionService]', ...args),
};

import { apiClient } from '../lib/apiClient'; // centralized axios instance

const RESOURCE = '/api/transactions';

const budgetTransactionService = {
    /**
     * GET /api/transactions (list, with optional filters)
     * @param {Object} filters - { statementPeriod, account, category, paymentMethod, criticality }
     * @returns {Object} BudgetTransactionList { transactions, count, total }
     */
    async getTransactions(filters = {}) {
        logger.info('getTransactions entry', { filters });
        try {
            const response = await apiClient.get(RESOURCE, { params: filters });
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
     * GET /api/transactions/{id}
     */
    async getTransaction(id) {
        logger.info('getTransaction entry', { id });
        if (!id) throw new Error('Transaction ID required');
        try {
            const response = await apiClient.get(`${RESOURCE}/${encodeURIComponent(id)}`);
            logger.info('getTransaction success', { transaction: response.data });
            return response.data;
        } catch (err) {
            logger.error('getTransaction error', err);
            throw err;
        }
    },

    /**
     * POST /api/transactions
     */
    async createTransaction(transaction) {
        logger.info('createTransaction entry', { transaction });
        try {
            const response = await apiClient.post(RESOURCE, transaction);
            logger.info('createTransaction success', { created: response.data });
            return response.data;
        } catch (err) {
            logger.error('createTransaction error', err);
            throw err;
        }
    },

    /**
     * PUT /api/transactions/{id}
     */
    async updateTransaction(id, transaction) {
        logger.info('updateTransaction entry', { id, transaction });
        if (!id) throw new Error('Transaction ID required');
        try {
            const response = await apiClient.put(`${RESOURCE}/${encodeURIComponent(id)}`, transaction);
            logger.info('updateTransaction success', { updated: response.data });
            return response.data;
        } catch (err) {
            logger.error('updateTransaction error', err);
            throw err;
        }
    },

    /**
     * DELETE /api/transactions/{id}
     */
    async deleteTransaction(id) {
        logger.info('deleteTransaction entry', { id });
        if (!id) throw new Error('Transaction ID required');
        try {
            const response = await apiClient.delete(`${RESOURCE}/${encodeURIComponent(id)}`);
            logger.info('deleteTransaction success', { status: response.status });
            return response.data;
        } catch (err) {
            logger.error('deleteTransaction error', err);
            throw err;
        }
    },

    /**
     * DELETE /api/transactions (delete all)
     */
    async deleteAllTransactions() {
        logger.info('deleteAllTransactions entry');
        try {
            const response = await apiClient.delete(RESOURCE);
            logger.info('deleteAllTransactions success', { deletedCount: response.data?.deletedCount });
            return response.data;
        } catch (err) {
            logger.error('deleteAllTransactions error', err);
            throw err;
        }
    },

    /**
     * POST /api/transactions/upload (CSV upload)
     * @param {File|Blob} file
     * @param {String} statementPeriod
     */
    async uploadTransactions(file, statementPeriod) {
        logger.info('uploadTransactions entry', { fileName: file?.name, statementPeriod });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('statementPeriod', statementPeriod);
        try {
            const response = await apiClient.post(`${RESOURCE}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            logger.info('uploadTransactions success', { result: response.data });
            return response.data;
        } catch (err) {
            logger.error('uploadTransactions error', err);
            throw err;
        }
    },

    /**
     * GET /api/transactions/account
     */
    async getTransactionsForAccount({ account, statementPeriod, category, criticality, paymentMethod }) {
        logger.info('getTransactionsForAccount entry', { account, statementPeriod, category, criticality, paymentMethod });
        if (!account) throw new Error('Account is required');
        try {
            const response = await apiClient.get(`${RESOURCE}/account`, {
                params: {
                    account,
                    statementPeriod,
                    category,
                    criticality,
                    paymentMethod,
                },
            });
            logger.info('getTransactionsForAccount success', {
                count: response.data && typeof response.data.count === 'number' ? response.data.count : 0,
                total: response.data && response.data.total ? response.data.total : 0,
            });
            return response.data;
        } catch (err) {
            logger.error('getTransactionsForAccount error', err);
            throw err;
        }
    },


    /**
     * GET /api/transactions/account/budget
     * Fetches only budget transactions for a given account and filters.
     * @async
     * @function getBudgetTransactionsForAccount
     * @param {Object} filters - { account, statementPeriod, category, criticality, paymentMethod }
     * @returns {Object} BudgetTransactionList { transactions, count, total }
     * @throws {Error} If the request fails.
     */
    async getBudgetTransactionsForAccount({ account, statementPeriod, category, criticality, paymentMethod }) {
        logger.info('getBudgetTransactionsForAccount entry', { account, statementPeriod, category, criticality, paymentMethod });
        if (!account) throw new Error('Account is required');
        try {
            const response = await apiClient.get(`${RESOURCE}/account/budget`, {
                params: {
                    account,
                    statementPeriod,
                    category,
                    criticality,
                    paymentMethod,
                },
            });
            logger.info('getBudgetTransactionsForAccount success', {
                count: response.data && typeof response.data.count === 'number' ? response.data.count : 0,
                total: response.data && response.data.total ? response.data.total : 0,
            });
            return response.data;
        } catch (err) {
            logger.error('getBudgetTransactionsForAccount error', err);
            throw err;
        }
    }
};

export default budgetTransactionService;