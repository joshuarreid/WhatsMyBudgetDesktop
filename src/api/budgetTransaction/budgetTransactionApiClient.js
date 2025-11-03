/**
 * Thin API client for the /transactions resource.
 *
 * - Extends ApiClient and delegates HTTP work to ApiClient.
 * - Api path is provided to ApiClient via the super() constructor (apiPath = 'api/transactions').
 *   This keeps all base URL handling inside ApiClient (process.env.BASE_URL).
 * - Methods supply only short postfixes ('' | 'upload' | id) so they don't build full URLs.
 * - No X-Transaction-ID parameters anywhere — ApiClient generates & attaches the header.
 * - Keep JSDoc, logger and validation per project conventions.
 *
 * NOTE: ApiClient will prefix the apiPath to any endpoint passed to get/post/put/delete.
 * Example:
 *   this.get('')            -> '/api/transactions'
 *   this.get('upload')      -> '/api/transactions/upload'
 *   this.get('123')         -> '/api/transactions/123'
 *
 * @module BudgetTransactionApiClient
 */

import ApiClient from './ApiClient';

/**
 * Standardized logger for this module.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[BudgetTransactionApiClient]', ...args),
    error: (...args) => console.error('[BudgetTransactionApiClient]', ...args),
};

/**
 * BudgetTransactionApiClient - thin client for /transactions endpoints.
 */
export default class BudgetTransactionApiClient extends ApiClient {
    /**
     * Create a BudgetTransactionApiClient instance.
     *
     * Note:
     *  - Do NOT reference any base URLs here. ApiClient resolves baseURL from process.env.BASE_URL
     *    when a baseURL is not explicitly passed in options.
     *  - The apiPath defaults to 'api/transactions' so that methods only supply postfixes.
     *
     * @param {Object} [options={}] - forwarded to ApiClient constructor (optional)
     * @param {string} [options.baseURL] - optional override (rare; usually omitted)
     * @param {number} [options.timeout]
     * @param {string} [options.apiPath] - optional override for the apiPath (defaults to 'api/transactions')
     */
    constructor(options = {}) {
        // prefer an explicit override if provided; otherwise use the hardcoded api path for this resource
        const apiPath = options.apiPath ?? 'api/transactions';
        super({ ...options, apiPath });
        logger.info('constructed', { apiPath });
    }

    /**
     * Normalize a relative postfix into an endpoint string acceptable by ApiClient.
     *
     * - Removes leading/trailing slashes to avoid duplicate slashes when ApiClient builds the final URL.
     * - When empty string provided returns '' which causes ApiClient to use the configured apiPath alone.
     *
     * @param {string} [relative=''] - relative path segment under the configured apiPath
     * @returns {string} cleaned relative path (no leading slash) or '' for root
     */
    buildPath(relative = '') {
        const rel = String(relative || '').replace(/^\/+|\/+$/g, '');
        return rel;
    }

    /**
     * Get all budget transactions.
     *
     * @async
     * @returns {Promise<Object>} BudgetTransactionList
     * @throws {Object} normalized ApiClient error
     */
    async getAllBudgetTransactions() {
        logger.info('getAllBudgetTransactions called');
        const url = this.buildPath('');
        return this.get(url);
    }

    /**
     * Get budget transactions with optional filters.
     *
     * @async
     * @param {Object} [filters={}] - filters (account, statementPeriod, category, etc.)
     * @returns {Promise<Object>} BudgetTransactionList
     */
    async getTransactions(filters = {}) {
        logger.info('getTransactions called', { hasFilters: Object.keys(filters || {}).length > 0 });
        const url = this.buildPath('');
        return this.get(url, filters);
    }

    /**
     * Get a budget transaction by id.
     *
     * NOTE: the id is a budgetTransactionId (resource id). This is NOT the X-Transaction-ID header.
     *
     * @async
     * @param {string|number} budgetTransactionId - resource identifier
     * @returns {Promise<Object>} BudgetTransaction
     */
    async getBudgetTransactionById(budgetTransactionId) {
        logger.info('getBudgetTransactionById called', { budgetTransactionId });
        this.validateId(budgetTransactionId, 'BudgetTransaction');
        const safeId = encodeURIComponent(String(budgetTransactionId));
        const url = this.buildPath(safeId);
        return this.get(url);
    }

    /**
     * Create a new budget transaction.
     *
     * @async
     * @param {Object} transaction - BudgetTransaction payload
     * @returns {Promise<Object>} created BudgetTransaction
     */
    async createBudgetTransaction(transaction) {
        logger.info('createBudgetTransaction called');
        this.validateRequired(transaction, 'transaction', 'object');
        const url = this.buildPath('');
        return this.post(url, transaction);
    }

    /**
     * Update an existing budget transaction by id.
     *
     * NOTE: id is a budgetTransactionId (resource id).
     *
     * @async
     * @param {string|number} budgetTransactionId - resource identifier
     * @param {Object} transaction - Partial or full transaction payload
     * @returns {Promise<Object>} updated BudgetTransaction
     */
    async updateBudgetTransaction(budgetTransactionId, transaction) {
        logger.info('updateBudgetTransaction called', { budgetTransactionId });
        this.validateId(budgetTransactionId, 'BudgetTransaction');
        this.validateRequired(transaction, 'transaction', 'object');
        const safeId = encodeURIComponent(String(budgetTransactionId));
        const url = this.buildPath(safeId);
        return this.put(url, transaction);
    }

    /**
     * Delete a budget transaction by id.
     *
     * NOTE: id is a budgetTransactionId (resource id).
     *
     * @async
     * @param {string|number} budgetTransactionId - resource identifier
     * @returns {Promise<void|Object>}
     */
    async deleteBudgetTransaction(budgetTransactionId) {
        logger.info('deleteBudgetTransaction called', { budgetTransactionId });
        this.validateId(budgetTransactionId, 'BudgetTransaction');
        const safeId = encodeURIComponent(String(budgetTransactionId));
        const url = this.buildPath(safeId);
        return this.delete(url);
    }

    /**
     * Delete all budget transactions.
     *
     * @async
     * @returns {Promise<Object>} { deletedCount }
     */
    async deleteAllBudgetTransactions() {
        logger.info('deleteAllBudgetTransactions called');
        const url = this.buildPath('');
        return this.delete(url);
    }

    /**
     * Upload CSV for bulk import.
     *
     * @async
     * @param {File|Blob} file - CSV file blob (required)
     * @param {string} statementPeriod - statementPeriod (required)
     * @returns {Promise<Object>} BulkImportResult
     */
    async uploadTransactions(file, statementPeriod) {
        logger.info('uploadTransactions called', { statementPeriod });
        this.validateRequired(file, 'file');
        this.validateRequired(statementPeriod, 'statementPeriod', 'string');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('statementPeriod', String(statementPeriod));

        const url = this.buildPath('upload');
        return this.post(url, formData, { headers: {} });
    }
}