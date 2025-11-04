/**
 * Thin fetcher module for BudgetTransaction endpoints.
 *
 * - Responsible for creating its own BudgetTransactionApiClient instance.
 * - Consumers simply call the exported functions (no baseURL, apiPath or transaction-id references here).
 * - ApiClient is responsible for resolving process.env.BASE_URL and attaching X-Transaction-ID header.
 *
 * JSDoc uses "budgetTransactionId" to avoid confusion with the X-Transaction-ID header.
 *
 * This module now delegates account-scoped calls to the client helper getAccountTransactions()
 * which mirrors the robust endpoint building done in BudgetTransactionApiClient.
 *
 * @module src/api/budgetTransaction/budgetTransaction
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
 *
 * @type {BudgetTransactionApiClient}
 * @private
 */
const apiClient = new BudgetTransactionApiClient();

/**
 * Fetch all budget transactions or a filtered list when filters provided.
 *
 * Behavior:
 * - If filters.account is provided, call the account-scoped client helper getAccountTransactions()
 *   which will choose the correct endpoint form for the configured ApiClient.
 * - Otherwise call list or filtered list at the standard endpoints.
 *
 * @async
 * @param {Object} [filters={}] - optional filters to pass to the list endpoint (account, statementPeriod, category, etc.)
 * @returns {Promise<any>} BudgetTransactionList or server response
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function fetchAllBudgetTransactions(filters = {}) {
    logger.info('fetchAllBudgetTransactions called', { hasFilters: Object.keys(filters || {}).length > 0, filters });

    try {
        if (filters && typeof filters === 'object' && filters.account) {
            const { account, ...rest } = filters;
            logger.info('Delegating to getAccountTransactions', { account, rest });
            return await apiClient.getAccountTransactions(String(account), rest || {});
        }

        if (filters && Object.keys(filters).length) {
            logger.info('Calling generic getTransactions with filters', { filters });
            return await apiClient.getTransactions(filters);
        }

        logger.info('Calling getAllBudgetTransactions (no filters)');
        return await apiClient.getAllBudgetTransactions();
    } catch (err) {
        logger.error('fetchAllBudgetTransactions failed', err);
        throw err;
    }
}

/**
 * Fetch a budget transaction by id.
 *
 * @async
 * @param {string|number} budgetTransactionId - the budget transaction identifier (resource id)
 * @returns {Promise<any>} BudgetTransaction
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
 * @async
 * @param {string|number} budgetTransactionId - the budget transaction identifier
 * @param {Object} payload - updated fields
 * @returns {Promise<any>} updated BudgetTransaction
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
 * @async
 * @param {string|number} budgetTransactionId - the budget transaction identifier
 * @returns {Promise<any>} no-content or response body
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