/**
 * StatementPeriodApiClient - thin client for /statements endpoints.
 *
 * - Mirrors BudgetTransactionApiClient endpoint-building strategy so callers don't need
 *   to worry whether ApiClient.baseURL already contains the resource suffix.
 * - Default apiPath is 'api' so resource('statements') resolves to '/api/statements'.
 *
 * @module api/statementPeriod/statementPeriodApiClient
 */

import ApiClient from '../ApiClient';

/**
 * Standardized logger for this module.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[StatementPeriodApiClient]', ...args),
    error: (...args) => console.error('[StatementPeriodApiClient]', ...args),
};

export default class StatementPeriodApiClient extends ApiClient {
    /**
     * Create a StatementPeriodApiClient instance.
     *
     * @param {Object} [options={}] - forwarded to ApiClient constructor (optional)
     * @param {string} [options.baseURL] - optional override for baseURL
     * @param {number} [options.timeout]
     * @param {string} [options.apiPath] - optional override for apiPath (defaults to 'api')
     */
    constructor(options = {}) {
        // default to 'api' so resource('statements') becomes '/api/statements'
        const apiPath = options.apiPath ?? 'api';
        super({ ...options, apiPath });
        logger.info('constructed', { apiPath, baseURL: this.baseURL });
    }

    /**
     * Clean a relative path segment (remove leading/trailing slashes).
     *
     * @param {string} [relative='']
     * @returns {string}
     */
    buildPath(relative = '') {
        return String(relative || '').replace(/^\/+|\/+$/g, '');
    }

    /**
     * Build endpoint that works whether baseURL already includes '/api/statements' or not.
     *
     * Strategy:
     * - If ApiClient.baseURL already ends with '/api/statements', return absolute base or base/rel
     * - Otherwise return resource('statements', rel) so ApiClient prefixes apiPath
     *
     * @param {string} [relative='']
     * @returns {string}
     */
    _buildResourceEndpointForClient(relative = '') {
        try {
            const base = String(this.baseURL ?? '').replace(/\/+$/, '');
            const relClean = String(relative ?? '').replace(/^\/+|\/+$/g, '');

            if (base.endsWith('/api/statements')) {
                if (!relClean) return base;
                return `${base}/${relClean}`;
            }

            // Default: let ApiClient prefix apiPath -> use resource('statements', rel)
            return this.resource(relClean);
        } catch (err) {
            logger.error('_buildResourceEndpointForClient failed', err);
            return this.resource(relative);
        }
    }

    /**
     * Return the resource endpoint path under apiPath that ApiClient understands.
     *
     * @param {string} [relative='']
     * @returns {string}
     */
    resource(relative = '') {
        return this.resourceEndpoint('statements', relative);
    }

    /**
     * Fetch all statement periods.
     *
     * @async
     * @returns {Promise<Array<Object>>} list of StatementPeriod objects
     * @throws {Object} normalized ApiClient error when request fails
     */
    async getAllStatementPeriods() {
        logger.info('getAllStatementPeriods called');
        const endpoint = this._buildResourceEndpointForClient('');
        return this.get(endpoint);
    }

    /**
     * Fetch a single statement period by id.
     *
     * NOTE: the id parameter is a statementPeriodId (resource id). This is NOT the
     *       X-Transaction-ID header (which is generated/managed by ApiClient).
     *
     * @async
     * @param {string|number} statementPeriodId - StatementPeriod id
     * @returns {Promise<Object>} StatementPeriod
     * @throws {Error} validation error from validateId
     * @throws {Object} normalized ApiClient error
     */
    async getStatementPeriodById(statementPeriodId) {
        logger.info('getStatementPeriodById called', { statementPeriodId });
        this.validateId(statementPeriodId, 'StatementPeriod');
        const safeId = encodeURIComponent(String(statementPeriodId));
        const path = this._buildResourceEndpointForClient(this.buildPath(safeId));
        return this.get(path);
    }

    /**
     * Create a new statement period.
     *
     * @async
     * @param {Object} statementPeriod - StatementPeriod payload (POJO)
     * @returns {Promise<Object>} created StatementPeriod
     * @throws {Error} validation error from validateRequired
     * @throws {Object} normalized ApiClient error
     */
    async createStatementPeriod(statementPeriod) {
        logger.info('createStatementPeriod called');
        this.validateRequired(statementPeriod, 'statementPeriod', 'object');
        const path = this._buildResourceEndpointForClient(this.buildPath(''));
        return this.post(path, statementPeriod);
    }

    /**
     * Update an existing statement period by id.
     *
     * NOTE: id is a statementPeriodId (resource id).
     *
     * @async
     * @param {string|number} statementPeriodId - StatementPeriod id
     * @param {Object} statementPeriod - Partial or full StatementPeriod payload
     * @returns {Promise<Object>} updated StatementPeriod
     * @throws {Error} validation error from validateId / validateRequired
     * @throws {Object} normalized ApiClient error
     */
    async updateStatementPeriod(statementPeriodId, statementPeriod) {
        logger.info('updateStatementPeriod called', { statementPeriodId });
        this.validateId(statementPeriodId, 'StatementPeriod');
        this.validateRequired(statementPeriod, 'statementPeriod', 'object');
        const safeId = encodeURIComponent(String(statementPeriodId));
        const path = this._buildResourceEndpointForClient(this.buildPath(safeId));
        return this.put(path, statementPeriod);
    }

    /**
     * Delete a statement period by id.
     *
     * NOTE: id is a statementPeriodId (resource id).
     *
     * @async
     * @param {string|number} statementPeriodId - StatementPeriod id
     * @returns {Promise<void|Object>} no-content on success
     * @throws {Error} validation error from validateId
     * @throws {Object} normalized ApiClient error
     */
    async deleteStatementPeriod(statementPeriodId) {
        logger.info('deleteStatementPeriod called', { statementPeriodId });
        this.validateId(statementPeriodId, 'StatementPeriod');
        const safeId = encodeURIComponent(String(statementPeriodId));
        const path = this._buildResourceEndpointForClient(this.buildPath(safeId));
        return this.delete(path);
    }

    /**
     * Delete all statement periods.
     *
     * @async
     * @returns {Promise<Object>} { deletedCount } or server response
     * @throws {Object} normalized ApiClient error
     */
    async deleteAllStatementPeriods() {
        logger.info('deleteAllStatementPeriods called');
        const path = this._buildResourceEndpointForClient(this.buildPath(''));
        return this.delete(path);
    }
}