/**
 * apiService - Service for backend REST API calls (Spring Boot), using Axios and config.
 * Loads config from wmbservice-config.json, generates X-Transaction-ID per call.
 * Robust logging for every public method, error handling, and automatic JSON parsing.
 */

import axios from 'axios';
import config from '../wmbservice-config.json';

const BASE_URL = config.baseUrl;
const DEFAULT_HEADERS = config.defaultHeaders || {};

const logger = {
    info: (...args) => console.log('[apiService]', ...args),
    error: (...args) => console.error('[apiService]', ...args),
};

/**
 * Generates a UUID for X-Transaction-ID.
 */
function generateTransactionId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    } else {
        return 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

// Create an Axios instance with base URL and config defaults
const axiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: DEFAULT_HEADERS,
    timeout: 10000 // 10s, adjust as needed
});

// Add a request interceptor for logging and transaction ID
axiosInstance.interceptors.request.use(
    function (request) {
        const transactionId = generateTransactionId();
        request.headers['X-Transaction-ID'] = transactionId;
        logger.info('API request', { url: request.url, method: request.method, data: request.data, params: request.params, transactionId });
        return request;
    },
    function (error) {
        logger.error('API request error', error);
        return Promise.reject(error);
    }
);

// Add a response interceptor for logging
axiosInstance.interceptors.response.use(
    function (response) {
        logger.info('API response', { url: response.config.url, status: response.status, data: response.data });
        return response;
    },
    function (error) {
        logger.error('API response error', error);
        return Promise.reject(error);
    }
);

const apiService = {
    /**
     * GET /api/transactions (list, with optional filters)
     * @param {Object} filters - { statementPeriod, account, category, paymentMethod, criticality }
     * @returns {Object} BudgetTransactionList { transactions, count, total }
     */
    async getTransactions(filters = {}) {
        logger.info('getTransactions entry', { filters });
        try {
            const response = await axiosInstance.get('', { params: filters });
            logger.info('getTransactions success', {
                count: response.data && typeof response.data.count === 'number' ? response.data.count : 0,
                total: response.data && response.data.total ? response.data.total : 0
            });
            return response.data; // BudgetTransactionList: { transactions, count, total }
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
            const response = await axiosInstance.get(`/${id}`);
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
            const response = await axiosInstance.post('', transaction);
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
            const response = await axiosInstance.put(`/${id}`, transaction);
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
            const response = await axiosInstance.delete(`/${id}`);
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
            const response = await axiosInstance.delete('');
            logger.info('deleteAllTransactions success', { deletedCount: response.data.deletedCount });
            return response.data;
        } catch (err) {
            logger.error('deleteAllTransactions error', err);
            throw err;
        }
    },

    /**
     * POST /api/transactions/upload (CSV upload)
     * @param {File} file
     * @param {String} statementPeriod
     */
    async uploadTransactions(file, statementPeriod) {
        logger.info('uploadTransactions entry', { file, statementPeriod });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('statementPeriod', statementPeriod);
        try {
            const response = await axiosInstance.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            logger.info('uploadTransactions success', { result: response.data });
            return response.data;
        } catch (err) {
            logger.error('uploadTransactions error', err);
            throw err;
        }
    },

    /**
     * GET /api/transactions/account (list for account, including half of joint transactions)
     * @param {Object} params - { account (required), statementPeriod, category, criticality, paymentMethod }
     * @returns {Object} BudgetTransactionList { transactions, count, total }
     */
    async getTransactionsForAccount({ account, statementPeriod, category, criticality, paymentMethod }) {
        logger.info('getTransactionsForAccount entry', { account, statementPeriod, category, criticality, paymentMethod });
        if (!account) throw new Error('Account is required');
        try {
            const response = await axiosInstance.get('/account', {
                params: {
                    account,
                    statementPeriod,
                    category,
                    criticality,
                    paymentMethod
                }
            });
            logger.info('getTransactionsForAccount success', {
                count: response.data && typeof response.data.count === 'number' ? response.data.count : 0,
                total: response.data && response.data.total ? response.data.total : 0
            });
            return response.data;
        } catch (err) {
            logger.error('getTransactionsForAccount error', err);
            throw err;
        }
    }
};

export default apiService;