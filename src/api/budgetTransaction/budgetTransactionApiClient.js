/**
 * BudgetTransactionApiClient - thin client for /transactions endpoints.
 *
 * - Extends ApiClient and delegates HTTP work to ApiClient.
 * - Uses a robust endpoint builder so callers don't end up with duplicated path segments
 *   when ApiClient.baseURL already contains resource suffixes (eg. ".../api/transactions").
 * - Default ApiClient apiPath is "api" (so resource('transactions') becomes "/api/transactions").
 * - Exposes account-scoped helper getAccountTransactions(...) that chooses the correct endpoint
 *   form depending on how the underlying ApiClient was configured (mirrors LocalCacheApiClient behavior).
 *
 * @module src/api/budgetTransaction/budgetTransactionApiClient
 */

import ApiClient from '../ApiClient';

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
     *  - The apiPath defaults to 'api' so resource methods are built via resource('transactions', ...)
     *
     * @param {Object} [options={}] - forwarded to ApiClient constructor (optional)
     * @param {string} [options.baseURL] - optional override (rare; usually omitted)
     * @param {number} [options.timeout]
     * @param {string} [options.apiPath] - optional override for the apiPath (defaults to 'api')
     */
    constructor(options = {}) {
        const apiPath = options.apiPath ?? 'api';
        super({ ...options, apiPath });
        logger.info('constructed', { baseURL: this.baseURL, apiPath: this.apiPath });
    }

    /**
     * Build the resource endpoint for transactions (delegates to ApiClient.resourceEndpoint)
     * @param {string} [relative=''] - relative path under 'transactions' (no leading slash)
     * @returns {string} endpoint string (no leading slash) suitable for ApiClient.get/post/etc.
     */
    resource(relative = '') {
        return this.resourceEndpoint('transactions', relative);
    }

    /**
     * If the ApiClient.baseURL already includes "/api/transactions" then callers should use the
     * short relative form (eg. 'account', 'upload', '123') appended to that baseURL.
     *
     * Otherwise use the resource() value (eg. 'transactions', 'transactions/upload', 'transactions/123')
     * which ApiClient._buildUrl will prefix with the apiPath ('/api').
     *
     * @private
     * @param {string} relative - relative postfix under transactions resource
     * @returns {string} endpoint to call with ApiClient.get/post/... (may be absolute resource path or resource(...) form)
     */
    _buildResourceEndpointForClient(relative = '') {
        try {
            const base = String(this.baseURL ?? '').replace(/\/+$/, '');
            const relClean = String(relative ?? '').replace(/^\/+|\/+$/g, '');

            if (base.endsWith('/api/transactions')) {
                // base already points at /api/transactions -> call 'account' or id directly (axios will request base + /rel)
                if (!relClean) return base; // absolute URL to the resource root
                // return an absolute URL so ApiClient.makeRequest treats it as full URL
                return `${base}/${relClean}`;
            }

            // Default behavior: let ApiClient prefix apiPath -> use resource('relative')
            return this.resource(relClean);
        } catch (err) {
            logger.error('_buildResourceEndpointForClient failed, falling back to resource()', err);
            return this.resource(relative);
        }
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
        const endpoint = this._buildResourceEndpointForClient('');
        return this.get(endpoint);
    }

    /**
     * Get budget transactions with optional filters.
     *
     * @async
     * @param {Object} [filters={}] - filters (account, statementPeriod, category, etc.)
     * @returns {Promise<Object>} BudgetTransactionList
     */
    async getTransactions(filters = {}) {
        logger.info('getTransactions called', { hasFilters: Object.keys(filters || {}).length > 0, filters });

        // If caller included an account, prefer account-specific helper which handles endpoint form.
        if (filters && typeof filters === 'object' && filters.account) {
            // Delegate to getAccountTransactions which will choose correct endpoint.
            const { account, ...rest } = filters;
            return this.getAccountTransactions(account, rest || {});
        }

        const endpoint = this._buildResourceEndpointForClient('');
        return this.get(endpoint, filters);
    }

    /**
     * Account-scoped transactions getter.
     * - This helper ensures the client calls the correct endpoint whether the baseURL already
     *   contains the resource path or not.
     *
     * @async
     * @param {string} account - account name (required)
     * @param {Object} [filters={}] - additional filters (statementPeriod, category, criticality, paymentMethod)
     * @returns {Promise<Object>} AccountBudgetTransactionList
     */
    async getAccountTransactions(account, filters = {}) {
        logger.info('getAccountTransactions called', { account, filters });
        this.validateRequired(account, 'account', 'string');

        // Build endpoint relative to transactions resource
        const endpointRelative = `account${filters && Object.keys(filters).length ? '' : ''}`; // 'account'
        const endpoint = this._buildResourceEndpointForClient(endpointRelative);

        // Merge account into params for account endpoint (server expects account as a param)
        const params = { account, ...(filters || {}) };
        return this.get(endpoint, params);
    }

    /**
     * Get a budget transaction by id.
     *
     * @async
     * @param {string|number} budgetTransactionId - resource identifier
     * @returns {Promise<Object>} BudgetTransaction
     */
    async getBudgetTransactionById(budgetTransactionId) {
        logger.info('getBudgetTransactionById called', { budgetTransactionId });
        this.validateId(budgetTransactionId, 'BudgetTransaction');
        const safeId = encodeURIComponent(String(budgetTransactionId));
        const endpoint = this._buildResourceEndpointForClient(safeId);
        return this.get(endpoint);
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
        const endpoint = this._buildResourceEndpointForClient('');
        return this.post(endpoint, transaction);
    }

    /**
     * Update an existing budget transaction by id.
     *
     * @async
     * @param {string|number} budgetTransactionId
     * @param {Object} transaction
     * @returns {Promise<Object>}
     */
    async updateBudgetTransaction(budgetTransactionId, transaction) {
        logger.info('updateBudgetTransaction called', { budgetTransactionId });
        this.validateId(budgetTransactionId, 'BudgetTransaction');
        this.validateRequired(transaction, 'transaction', 'object');
        const safeId = encodeURIComponent(String(budgetTransactionId));
        const endpoint = this._buildResourceEndpointForClient(safeId);
        return this.put(endpoint, transaction);
    }

    /**
     * Delete a budget transaction by id.
     *
     * @async
     * @param {string|number} budgetTransactionId
     * @returns {Promise<any>}
     */
    async deleteBudgetTransaction(budgetTransactionId) {
        logger.info('deleteBudgetTransaction called', { budgetTransactionId });
        this.validateId(budgetTransactionId, 'BudgetTransaction');
        const safeId = encodeURIComponent(String(budgetTransactionId));
        const endpoint = this._buildResourceEndpointForClient(safeId);
        return this.delete(endpoint);
    }

    /**
     * Delete all budget transactions.
     *
     * @async
     * @returns {Promise<Object>} { deletedCount }
     */
    async deleteAllBudgetTransactions() {
        logger.info('deleteAllBudgetTransactions called');
        const endpoint = this._buildResourceEndpointForClient('');
        return this.delete(endpoint);
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

        const endpoint = this._buildResourceEndpointForClient('upload');
        return this.post(endpoint, formData, { headers: {} });
    }
}