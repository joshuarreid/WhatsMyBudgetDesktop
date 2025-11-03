/**
 * Thin API client for the /statements resource (StatementPeriod).
 *
 * - Extends ApiClient and delegates HTTP work to ApiClient.
 * - Api path is provided to ApiClient via the super() constructor (apiPath = 'api/statements').
 *   This keeps all base URL handling inside ApiClient (process.env.BASE_URL).
 * - Methods supply only short postfixes ('', id) so they don't build full URLs.
 * - No X-Transaction-ID parameters anywhere — ApiClient generates & attaches the header.
 * - Keeps JSDoc, logger and validation per project conventions.
 *
 * Example:
 *   this.get('')   -> resolves to /api/statements
 *   this.get('123')-> resolves to /api/statements/123
 *
 * @module StatementPeriodApiClient
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

/**
 * StatementPeriodApiClient - thin client for /statements endpoints.
 */
export default class StatementPeriodApiClient extends ApiClient {
    /**
     * Create a StatementPeriodApiClient instance.
     *
     * Notes:
     *  - Do NOT reference any base URLs here. ApiClient resolves baseURL from process.env.BASE_URL
     *    when a baseURL is not explicitly passed in options.
     *  - The apiPath defaults to 'api/statements' so that methods only supply postfixes.
     *
     * @param {Object} [options={}] - forwarded to ApiClient constructor (optional)
     * @param {string} [options.baseURL] - optional override (rare; usually omitted)
     * @param {number} [options.timeout]
     * @param {string} [options.apiPath] - optional override for the apiPath (defaults to 'api/statements')
     */
    constructor(options = {}) {
        const apiPath = options.apiPath ?? 'api/statements';
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
     * Fetch all statement periods.
     *
     * @async
     * @returns {Promise<Array<Object>>} list of StatementPeriod
     * @throws {Object} normalized ApiClient error
     */
    async getAllStatementPeriods() {
        logger.info('getAllStatementPeriods called');
        const path = this.buildPath('');
        return this.get(path);
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
        const path = this.buildPath(safeId);
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
        const path = this.buildPath('');
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
        const path = this.buildPath(safeId);
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
        const path = this.buildPath(safeId);
        return this.delete(path);
    }

    /**
     * Delete all statement periods.
     *
     * @async
     * @returns {Promise<Object>} { deletedCount }
     * @throws {Object} normalized ApiClient error
     */
    async deleteAllStatementPeriods() {
        logger.info('deleteAllStatementPeriods called');
        const path = this.buildPath('');
        return this.delete(path);
    }
}