/**
 * ProjectedTransactionApiClient - thin client for /projections endpoints.
 *
 * - Extends ApiClient and delegates HTTP work to ApiClient.
 * - Uses a robust endpoint builder so callers don't end up with duplicated path segments
 *   when ApiClient.baseURL already contains resource suffixes (eg. ".../api/projections").
 * - Default ApiClient apiPath is "api" so resource('projections') becomes "/api/projections".
 * - Exposes account-scoped helper getAccountProjectedTransactionList(...) that chooses the correct
 *   endpoint form depending on how the underlying ApiClient was configured (mirrors LocalCacheApiClient / BudgetTransactionApiClient behavior).
 *
 * @module src/api/projectedTransaction/projectedTransactionApiClient
 */

import ApiClient from '../ApiClient';

const logger = {
    info: (...args) => console.log('[ProjectedTransactionApiClient]', ...args),
    error: (...args) => console.error('[ProjectedTransactionApiClient]', ...args),
};

export default class ProjectedTransactionApiClient extends ApiClient {
    /**
     * Create a ProjectedTransactionApiClient instance.
     *
     * Note:
     * - ApiClient resolves baseURL from process.env.REACT_APP_BASE_URL or process.env.BASE_URL if not passed.
     * - apiPath defaults to 'api' so resource methods are built via resource('projections', ...).
     *
     * @param {Object} [options={}] forwarded to ApiClient constructor (optional)
     * @param {string} [options.baseURL] optional override (rare)
     * @param {number} [options.timeout]
     * @param {string} [options.apiPath] optional override for apiPath
     */
    constructor(options = {}) {
        const apiPath = options.apiPath ?? 'api';
        super({ ...options, apiPath });
        logger.info('constructed', { baseURL: this.baseURL, apiPath: this.apiPath });
    }

    /**
     * Build the resource endpoint for projections (delegates to ApiClient.resourceEndpoint)
     *
     * @param {string} [relative=''] relative segment under 'projections'
     * @returns {string} endpoint string (no leading slash)
     */
    resource(relative = '') {
        return this.resourceEndpoint('projections', relative);
    }

    /**
     * If the ApiClient.baseURL already includes "/api/projections" then callers should use the
     * short relative form (eg. 'account', 'upload', '123') appended to that baseURL.
     *
     * Otherwise use the resource() value (eg. 'projections', 'projections/account', 'projections/123')
     * which ApiClient._buildUrl will prefix with the apiPath ('/api').
     *
     * @private
     * @param {string} relative - relative postfix under projections resource
     * @returns {string} endpoint to call with ApiClient.get/post/... (may be absolute resource URL or resource(...) form)
     */
    _buildResourceEndpointForClient(relative = '') {
        try {
            const base = String(this.baseURL ?? '').replace(/\/+$/, '');
            const relClean = String(relative ?? '').replace(/^\/+|\/+$/g, '');

            if (base.endsWith('/api/projections')) {
                // base already points at /api/projections -> call relative directly (absolute URL)
                if (!relClean) return base; // absolute URL for resource root
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
     * Get all projected transactions.
     *
     * @async
     * @returns {Promise<Object>} ProjectedTransactionList
     * @throws {Object} normalized ApiClient error
     */
    async getAllProjectedTransactions() {
        logger.info('getAllProjectedTransactions called');
        const endpoint = this._buildResourceEndpointForClient('');
        return this.get(endpoint);
    }

    /**
     * Get a projected transaction by id.
     *
     * @async
     * @param {string|number} projectedTransactionId - resource id
     * @returns {Promise<Object>}
     */
    async getProjectedTransactionById(projectedTransactionId) {
        logger.info('getProjectedTransactionById called', { projectedTransactionId });
        this.validateId(projectedTransactionId, 'ProjectedTransaction');
        const safeId = encodeURIComponent(String(projectedTransactionId));
        const endpoint = this._buildResourceEndpointForClient(safeId);
        return this.get(endpoint);
    }

    /**
     * Create a projected transaction.
     *
     * @async
     * @param {Object} transaction - payload
     * @returns {Promise<Object>}
     */
    async createProjectedTransaction(transaction) {
        logger.info('createProjectedTransaction called');
        this.validateRequired(transaction, 'transaction', 'object');
        const endpoint = this._buildResourceEndpointForClient('');
        return this.post(endpoint, transaction);
    }

    /**
     * Update a projected transaction by id.
     *
     * @async
     * @param {string|number} projectedTransactionId
     * @param {Object} transaction
     * @returns {Promise<Object>}
     */
    async updateProjectedTransaction(projectedTransactionId, transaction) {
        logger.info('updateProjectedTransaction called', { projectedTransactionId });
        this.validateId(projectedTransactionId, 'ProjectedTransaction');
        this.validateRequired(transaction, 'transaction', 'object');
        const safeId = encodeURIComponent(String(projectedTransactionId));
        const endpoint = this._buildResourceEndpointForClient(safeId);
        return this.put(endpoint, transaction);
    }

    /**
     * Delete a projected transaction by id.
     *
     * @async
     * @param {string|number} projectedTransactionId
     * @returns {Promise<void|Object>}
     */
    async deleteProjectedTransaction(projectedTransactionId) {
        logger.info('deleteProjectedTransaction called', { projectedTransactionId });
        this.validateId(projectedTransactionId, 'ProjectedTransaction');
        const safeId = encodeURIComponent(String(projectedTransactionId));
        const endpoint = this._buildResourceEndpointForClient(safeId);
        return this.delete(endpoint);
    }

    /**
     * Delete all projected transactions.
     *
     * @async
     * @returns {Promise<Object>} { deletedCount }
     */
    async deleteAllProjectedTransactions() {
        logger.info('deleteAllProjectedTransactions called');
        const endpoint = this._buildResourceEndpointForClient('');
        return this.delete(endpoint);
    }

    /**
     * Get account scoped projected transactions (personal + joint).
     *
     * Corresponds to server GET /api/projections/account?account=...&statementPeriod=...
     *
     * @async
     * @param {string} account - account name (required)
     * @param {Object} [filters={}] - optional filters (statementPeriod, category, criticality, paymentMethod)
     * @returns {Promise<Object>} AccountProjectedTransactionList
     */
    async getAccountProjectedTransactionList(account, filters = {}) {
        logger.info('getAccountProjectedTransactionList called', { account, filters });
        this.validateRequired(account, 'account', 'string');

        const endpoint = this._buildResourceEndpointForClient('account');
        const params = { account, ...(filters || {}) };
        return this.get(endpoint, params);
    }
}