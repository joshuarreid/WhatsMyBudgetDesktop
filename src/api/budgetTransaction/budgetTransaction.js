/**
 * Thin fetcher module for BudgetTransaction endpoints.
 *
 * - Responsible for creating its own BudgetTransactionApiClient instance.
 * - Consumers simply call the exported functions (no baseURL, apiPath or transaction-id references here).
 * - ApiClient is responsible for resolving process.env.BASE_URL and attaching X-Transaction-ID header.
 *
 * JSDoc uses "budgetTransactionId" to avoid confusion with the X-Transaction-ID header.
 *
 * @module budgetTransaction
 */

import BudgetTransactionApiClient from './budgetTransactionApiClient';

/**
 * Standardized logger for this module.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[budgetTransaction]', ...args),
    error: (...args) => console.error('[budgetTransaction]', ...args),
};

/**
 * Internal API client instance managed by this module.
 * The constructor is invoked with no baseURL so ApiClient will resolve process.env.BASE_URL.
 * Consumers do not need to know or pass base URLs.
 *
 * @type {BudgetTransactionApiClient}
 * @private
 */
const apiClient = new BudgetTransactionApiClient();

/**
 * Fetch all budget transactions or a filtered list when filters provided.
 *
 * The server typically returns a BudgetTransactionList. This function tolerates
 * response shapes that nest results under `budgetTransactions`.
 *
 * @async
 * @param {Object} [filters={}] - optional filters to pass to the list endpoint (account, statementPeriod, category, etc.)
 * @returns {Promise<any>} BudgetTransactionList or server response
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function fetchAllBudgetTransactions(filters = {}) {
    logger.info('fetchAllBudgetTransactions called', { hasFilters: Object.keys(filters || {}).length > 0 });
    try {
        const response = Object.keys(filters || {}).length ? await apiClient.getTransactions(filters) : await apiClient.getAllBudgetTransactions();
        return response?.budgetTransactions || response;
    } catch (err) {
        logger.error('fetchAllBudgetTransactions failed', err);
        throw err;
    }
}

/**
 * Fetch a budget transaction by id.
 *
 * NOTE: the identifier parameter is a budgetTransactionId (resource id). This is NOT the
 *       X-Transaction-ID header (which is generated/managed by ApiClient).
 *
 * @async
 * @param {string|number} budgetTransactionId - the budget transaction identifier (resource id)
 * @returns {Promise<any>} BudgetTransaction
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function fetchBudgetTransactionById(budgetTransactionId) {
    logger.info('fetchBudgetTransactionById called', { budgetTransactionId });
    try {
        return await apiClient.getBudgetTransactionById(budgetTransactionId);
    } catch (err) {
        logger.error('fetchBudgetTransactionById failed', err);
        throw err;
    }
}

/**
 * Create a budget transaction.
 *
 * @async
 * @param {Object} payload - BudgetTransaction payload
 * @returns {Promise<any>} created BudgetTransaction
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function createBudgetTransaction(payload) {
    logger.info('createBudgetTransaction called');
    try {
        return await apiClient.createBudgetTransaction(payload);
    } catch (err) {
        logger.error('createBudgetTransaction failed', err);
        throw err;
    }
}

/**
 * Update a budget transaction by id.
 *
 * NOTE: the identifier parameter is a budgetTransactionId (the resource id). This is NOT the
 *       X-Transaction-ID header (which is generated/managed by ApiClient).
 *
 * @async
 * @param {string|number} budgetTransactionId - the budget transaction identifier
 * @param {Object} payload - updated fields
 * @returns {Promise<any>} updated BudgetTransaction
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function updateBudgetTransaction(budgetTransactionId, payload) {
    logger.info('updateBudgetTransaction called', { budgetTransactionId });
    try {
        return await apiClient.updateBudgetTransaction(budgetTransactionId, payload);
    } catch (err) {
        logger.error('updateBudgetTransaction failed', err);
        throw err;
    }
}

/**
 * Delete a budget transaction by id.
 *
 * NOTE: the identifier parameter is a budgetTransactionId (the resource id). This is NOT the
 *       X-Transaction-ID header (which is generated/managed by ApiClient).
 *
 * @async
 * @param {string|number} budgetTransactionId - the budget transaction identifier
 * @returns {Promise<any>} no-content or response body
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function deleteBudgetTransaction(budgetTransactionId) {
    logger.info('deleteBudgetTransaction called', { budgetTransactionId });
    try {
        return await apiClient.deleteBudgetTransaction(budgetTransactionId);
    } catch (err) {
        logger.error('deleteBudgetTransaction failed', err);
        throw err;
    }
}

/**
 * Upload transactions CSV for bulk import.
 *
 * @async
 * @param {File|Blob} file - CSV file
 * @param {string} statementPeriod - required statementPeriod
 * @returns {Promise<any>} bulk import result from server
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function uploadBudgetTransactions(file, statementPeriod) {
    logger.info('uploadBudgetTransactions called', { statementPeriod });
    try {
        return await apiClient.uploadTransactions(file, statementPeriod);
    } catch (err) {
        logger.error('uploadBudgetTransactions failed', err);
        throw err;
    }
}

/**
 * Default export: convenience object exposing functions.
 */
const budgetTransaction = {
    fetchAllBudgetTransactions,
    fetchBudgetTransactionById,
    createBudgetTransaction,
    updateBudgetTransaction,
    deleteBudgetTransaction,
    uploadBudgetTransactions,
};

export default budgetTransaction;