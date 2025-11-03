/**
 * Thin fetcher module for ProjectedTransaction (projections) endpoints.
 *
 * - Responsible for creating its own ProjectedTransactionApiClient instance.
 * - Consumers simply call the exported functions (no baseURL, apiPath or X-Transaction-ID references here).
 * - ApiClient is responsible for resolving process.env.BASE_URL and attaching X-Transaction-ID header.
 *
 * This module delegates account-scoped calls to the client helper getAccountProjectedTransactionList()
 * which mirrors the robust endpoint building done in ProjectedTransactionApiClient.
 *
 * @module src/api/projectedTransaction/projectedTransaction
 */

import ProjectedTransactionApiClient from './projectedTransactionApiClient';

/**
 * Standardized logger for this module.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[projectedTransaction]', ...args),
    error: (...args) => console.error('[projectedTransaction]', ...args),
};

/**
 * Internal API client instance managed by this module.
 * Constructed without an explicit baseURL so ApiClient will resolve process.env.BASE_URL.
 *
 * @type {ProjectedTransactionApiClient}
 * @private
 */
const apiClient = new ProjectedTransactionApiClient();

/**
 * Fetch all projected transactions.
 *
 * @async
 * @returns {Promise<Object>} ProjectedTransactionList
 * @throws {Object} normalized ApiClient error
 */
export async function fetchAllProjectedTransactions() {
    logger.info('fetchAllProjectedTransactions called');
    try {
        return await apiClient.getAllProjectedTransactions();
    } catch (err) {
        logger.error('fetchAllProjectedTransactions failed', err);
        throw err;
    }
}

/**
 * Fetch a projected transaction by id.
 *
 * NOTE: the identifier parameter is a projectedTransactionId (resource id). This is NOT the
 *       X-Transaction-ID header (which is generated/managed by ApiClient).
 *
 * @async
 * @param {string|number} projectedTransactionId - StatementPeriod resource identifier
 * @returns {Promise<Object>} ProjectedTransaction
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function fetchProjectedTransactionById(projectedTransactionId) {
    logger.info('fetchProjectedTransactionById called', { projectedTransactionId });
    try {
        return await apiClient.getProjectedTransactionById(projectedTransactionId);
    } catch (err) {
        logger.error('fetchProjectedTransactionById failed', err);
        throw err;
    }
}

/**
 * Create a projected transaction.
 *
 * @async
 * @param {Object} payload - ProjectedTransaction payload (POJO)
 * @returns {Promise<Object>} created ProjectedTransaction
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function createProjectedTransaction(payload) {
    logger.info('createProjectedTransaction called');
    try {
        return await apiClient.createProjectedTransaction(payload);
    } catch (err) {
        logger.error('createProjectedTransaction failed', err);
        throw err;
    }
}

/**
 * Update an existing projected transaction by id.
 *
 * @async
 * @param {string|number} projectedTransactionId - ProjectedTransaction resource identifier
 * @param {Object} payload - Partial or full ProjectedTransaction payload
 * @returns {Promise<Object>} updated ProjectedTransaction
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function updateProjectedTransaction(projectedTransactionId, payload) {
    logger.info('updateProjectedTransaction called', { projectedTransactionId });
    try {
        return await apiClient.updateProjectedTransaction(projectedTransactionId, payload);
    } catch (err) {
        logger.error('updateProjectedTransaction failed', err);
        throw err;
    }
}

/**
 * Delete a projected transaction by id.
 *
 * @async
 * @param {string|number} projectedTransactionId - ProjectedTransaction resource identifier
 * @returns {Promise<void|Object>}
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function deleteProjectedTransaction(projectedTransactionId) {
    logger.info('deleteProjectedTransaction called', { projectedTransactionId });
    try {
        return await apiClient.deleteProjectedTransaction(projectedTransactionId);
    } catch (err) {
        logger.error('deleteProjectedTransaction failed', err);
        throw err;
    }
}

/**
 * Delete all projected transactions.
 *
 * @async
 * @returns {Promise<Object>} { deletedCount } or raw server response
 * @throws {Object} normalized ApiClient error when request fails
 */
export async function deleteAllProjectedTransactions() {
    logger.info('deleteAllProjectedTransactions called');
    try {
        return await apiClient.deleteAllProjectedTransactions();
    } catch (err) {
        logger.error('deleteAllProjectedTransactions failed', err);
        throw err;
    }
}

/**
 * Get account scoped projected transactions (personal + joint).
 *
 * @async
 * @param {string} account - account name
 * @param {Object} [filters={}] - optional filters (statementPeriod, category, etc.)
 * @returns {Promise<Object>} AccountProjectedTransactionList
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function fetchAccountProjectedTransactionList(account, filters = {}) {
    logger.info('fetchAccountProjectedTransactionList called', { account });
    try {
        return await apiClient.getAccountProjectedTransactionList(account, filters);
    } catch (err) {
        logger.error('fetchAccountProjectedTransactionList failed', err);
        throw err;
    }
}

/**
 * Default export: convenience object exposing functions.
 */
const projectedTransaction = {
    fetchAllProjectedTransactions,
    fetchProjectedTransactionById,
    createProjectedTransaction,
    updateProjectedTransaction,
    deleteProjectedTransaction,
    deleteAllProjectedTransactions,
    fetchAccountProjectedTransactionList,
};

export default projectedTransaction;