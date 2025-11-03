/**
 * Thin API client for the /projections resource (ProjectedTransaction).
 *
 * - Extends ApiClient and delegates HTTP work to ApiClient.
 * - Api path is provided to ApiClient via the super() constructor (apiPath = 'api/projections').
 *   This keeps all base URL handling inside ApiClient (process.env.BASE_URL).
 * - Methods supply only short postfixes ('', 'account', id) so they don't build full URLs.
 * - No X-Transaction-ID parameters anywhere — ApiClient generates & attaches the header.
 * - Keeps JSDoc, logger and validation per project conventions.
 *
 * Example:
 *   this.get('')           -> resolves to /api/projections
 *   this.get('account')    -> resolves to /api/projections/account
 *   this.get('123')        -> resolves to /api/projections/123
 *
 * @module ProjectedTransactionApiClient
 */

import ApiClient from './ApiClient';

/**
 * Standardized logger for this module.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[ProjectedTransactionApiClient]', ...args),
    error: (...args) => console.error('[ProjectedTransactionApiClient]', ...args),
};

/**
 * ProjectedTransactionApiClient - thin client for /projections endpoints.
 */
export default class ProjectedTransactionApiClient extends ApiClient {
    /**
     * Create a ProjectedTransactionApiClient instance.
     *
     * Notes:
     *  - Do NOT reference any base URLs here. ApiClient resolves baseURL from process.env.BASE_URL
     *    when a baseURL is not explicitly passed in options.
     *  - The apiPath defaults to 'api/projections' so that methods only supply postfixes.
     *
     * @param {Object} [options={}] - forwarded to ApiClient constructor (optional)
     * @param {string} [options.baseURL] - optional override (rare; usually omitted)
     * @param {number} [options.timeout]
     * @param {string} [options.apiPath] - optional override for the apiPath (defaults to 'api/projections')
     */
    constructor(options = {}) {
        const apiPath = options.apiPath ?? 'api/projections';
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
        return String(relative || '').replace(/^\/+|\/+$/g, '');
    }

    /**
     * Fetch all projected transactions.
     *
     * @async
     * @returns {Promise<Object>} ProjectedTransactionList
     * @throws {Object} normalized ApiClient error
     */
    async getAllProjectedTransactions() {
        logger.info('getAllProjectedTransactions called');
        const path = this.buildPath('');
        return this.get(path);
    }

    /**
     * Fetch a single projected transaction by id.
     *
     * NOTE: the id is a projectedTransactionId (resource id). This is NOT the X-Transaction-ID header.
     *
     * @async
     * @param {string|number} projectedTransactionId - Transaction id
     * @returns {Promise<Object>} ProjectedTransaction
     * @throws {Error} validation error from validateId
     * @throws {Object} normalized ApiClient error
     */
    async getProjectedTransactionById(projectedTransactionId) {
        logger.info('getProjectedTransactionById called', { projectedTransactionId });
        this.validateId(projectedTransactionId, 'ProjectedTransaction');
        const safeId = encodeURIComponent(String(projectedTransactionId));
        const path = this.buildPath(safeId);
        return this.get(path);
    }

    /**
     * Create a projected transaction.
     *
     * @async
     * @param {Object} transaction - ProjectedTransaction payload (POJO)
     * @returns {Promise<Object>} created ProjectedTransaction
     * @throws {Error} validation error from validateRequired
     * @throws {Object} normalized ApiClient error
     */
    async createProjectedTransaction(transaction) {
        logger.info('createProjectedTransaction called');
        this.validateRequired(transaction, 'transaction', 'object');
        const path = this.buildPath('');
        return this.post(path, transaction);
    }

    /**
     * Update a projected transaction by id.
     *
     * NOTE: id is a projectedTransactionId (resource id).
     *
     * @async
     * @param {string|number} projectedTransactionId - Transaction id
     * @param {Object} transaction - Partial or full ProjectedTransaction payload
     * @returns {Promise<Object>} updated ProjectedTransaction
     * @throws {Error} validation error from validateId / validateRequired
     * @throws {Object} normalized ApiClient error
     */
    async updateProjectedTransaction(projectedTransactionId, transaction) {
        logger.info('updateProjectedTransaction called', { projectedTransactionId });
        this.validateId(projectedTransactionId, 'ProjectedTransaction');
        this.validateRequired(transaction, 'transaction', 'object');
        const safeId = encodeURIComponent(String(projectedTransactionId));
        const path = this.buildPath(safeId);
        return this.put(path, transaction);
    }

    /**
     * Delete a projected transaction by id.
     *
     * NOTE: id is a projectedTransactionId (resource id).
     *
     * @async
     * @param {string|number} projectedTransactionId - Transaction id
     * @returns {Promise<void|Object>} no-content on success
     * @throws {Error} validation error from validateId
     * @throws {Object} normalized ApiClient error
     */
    async deleteProjectedTransaction(projectedTransactionId) {
        logger.info('deleteProjectedTransaction called', { projectedTransactionId });
        this.validateId(projectedTransactionId, 'ProjectedTransaction');
        const safeId = encodeURIComponent(String(projectedTransactionId));
        const path = this.buildPath(safeId);
        return this.delete(path);
    }

    /**
     * Delete all projected transactions.
     *
     * @async
     * @returns {Promise<Object>} { deletedCount }
     * @throws {Object} normalized ApiClient error
     */
    async deleteAllProjectedTransactions() {
        logger.info('deleteAllProjectedTransactions called');
        const path = this.buildPath('');
        return this.delete(path);
    }

    /**
     * Get personal & joint projected transactions for a specific account.
     *
     * Corresponds to controller: GET /api/projections/account?account=...&statementPeriod=...
     *
     * @async
     * @param {string} account - account name (required)
     * @param {Object} [filters={}] - optional filters: { statementPeriod, category, criticality, paymentMethod }
     * @returns {Promise<Object>} AccountProjectedTransactionList
     * @throws {Error} validation error when account missing
     * @throws {Object} normalized ApiClient error
     */
    async getAccountProjectedTransactionList(account, filters = {}) {
        logger.info('getAccountProjectedTransactionList called', { account });
        this.validateRequired(account, 'account', 'string');

        const params = { account, ...filters };
        const path = this.buildPath('account');
        return this.get(path, params);
    }
}