/**
 * Thin fetcher module for StatementPeriod endpoints.
 *
 * - Responsible for creating its own StatementPeriodApiClient instance.
 * - Consumers call the exported functions (no baseURL/apiPath/X-Transaction-ID here).
 * - ApiClient is responsible for resolving process.env.BASE_URL and attaching X-Transaction-ID header.
 *
 * This module follows the same pattern as budgetTransaction.js: single client instance,
 * thin wrapper functions delegating to the client, robust logging and JSDoc.
 *
 * @module api/statementPeriod/statementPeriod
 */

import StatementPeriodApiClient from './statementPeriodApiClient';

/**
 * Standardized logger for this module.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[statementPeriod]', ...args),
    error: (...args) => console.error('[statementPeriod]', ...args),
};

/**
 * Internal API client instance managed by this module.
 * Constructed without explicit baseURL so ApiClient will resolve process.env.BASE_URL.
 *
 * @type {StatementPeriodApiClient}
 * @private
 */
const apiClient = new StatementPeriodApiClient();

/**
 * Fetch all statement periods.
 *
 * @async
 * @function fetchAllStatementPeriods
 * @returns {Promise<Array<Object>>} list of StatementPeriod objects (or raw server response)
 * @throws {Object} normalized ApiClient error when request fails
 */
export async function fetchAllStatementPeriods() {
    logger.info('fetchAllStatementPeriods called');
    try {
        const response = await apiClient.getAllStatementPeriods();
        return response?.statementPeriods || response;
    } catch (err) {
        logger.error('fetchAllStatementPeriods failed', err);
        throw err;
    }
}

/**
 * Fetch a statement period by id.
 *
 * @async
 * @function fetchStatementPeriodById
 * @param {string|number} statementPeriodId - StatementPeriod resource identifier
 * @returns {Promise<Object>} StatementPeriod
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function fetchStatementPeriodById(statementPeriodId) {
    logger.info('fetchStatementPeriodById called', { statementPeriodId });
    try {
        return await apiClient.getStatementPeriodById(statementPeriodId);
    } catch (err) {
        logger.error('fetchStatementPeriodById failed', err);
        throw err;
    }
}

/**
 * Create a new statement period.
 *
 * @async
 * @function createStatementPeriod
 * @param {Object} payload - StatementPeriod payload (POJO)
 * @returns {Promise<Object>} created StatementPeriod
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function createStatementPeriod(payload) {
    logger.info('createStatementPeriod called');
    try {
        return await apiClient.createStatementPeriod(payload);
    } catch (err) {
        logger.error('createStatementPeriod failed', err);
        throw err;
    }
}

/**
 * Update an existing statement period by id.
 *
 * @async
 * @function updateStatementPeriod
 * @param {string|number} statementPeriodId - StatementPeriod resource identifier
 * @param {Object} payload - Partial or full StatementPeriod payload
 * @returns {Promise<Object>} updated StatementPeriod
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function updateStatementPeriod(statementPeriodId, payload) {
    logger.info('updateStatementPeriod called', { statementPeriodId });
    try {
        return await apiClient.updateStatementPeriod(statementPeriodId, payload);
    } catch (err) {
        logger.error('updateStatementPeriod failed', err);
        throw err;
    }
}

/**
 * Delete a statement period by id.
 *
 * @async
 * @function deleteStatementPeriod
 * @param {string|number} statementPeriodId - StatementPeriod resource identifier
 * @returns {Promise<void|Object>} no-content on success
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function deleteStatementPeriod(statementPeriodId) {
    logger.info('deleteStatementPeriod called', { statementPeriodId });
    try {
        return await apiClient.deleteStatementPeriod(statementPeriodId);
    } catch (err) {
        logger.error('deleteStatementPeriod failed', err);
        throw err;
    }
}

/**
 * Delete all statement periods.
 *
 * @async
 * @function deleteAllStatementPeriods
 * @returns {Promise<Object>} { deletedCount } or raw server response
 * @throws {Object} normalized ApiClient error when request fails
 */
export async function deleteAllStatementPeriods() {
    logger.info('deleteAllStatementPeriods called');
    try {
        return await apiClient.deleteAllStatementPeriods();
    } catch (err) {
        logger.error('deleteAllStatementPeriods failed', err);
        throw err;
    }
}

/**
 * Default export: convenience object exposing functions.
 */
const statementPeriod = {
    fetchAllStatementPeriods,
    fetchStatementPeriodById,
    createStatementPeriod,
    updateStatementPeriod,
    deleteStatementPeriod,
    deleteAllStatementPeriods,
};

export default statementPeriod;