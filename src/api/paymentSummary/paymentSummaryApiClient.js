/**
 * Thin API client for the /payment-summary resource.
 *
 * - Extends ApiClient and delegates HTTP work to ApiClient.
 * - Api path is provided to ApiClient via the super() constructor (apiPath = 'api/payment-summary').
 *   This keeps all base URL handling inside ApiClient (process.env.BASE_URL).
 * - Methods supply only short postfixes ('') and query params. No baseURL or X-Transaction-ID handling here.
 * - Keep JSDoc, logger and validation per project conventions.
 *
 * Example:
 *   this.get('') -> resolves to /api/payment-summary
 *
 * @module PaymentSummaryApiClient
 */

import ApiClient from './ApiClient';

/**
 * Standardized logger for this module.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[PaymentSummaryApiClient]', ...args),
    error: (...args) => console.error('[PaymentSummaryApiClient]', ...args),
};

/**
 * PaymentSummaryApiClient - thin client for /payment-summary endpoints.
 */
export default class PaymentSummaryApiClient extends ApiClient {
    /**
     * Create a PaymentSummaryApiClient instance.
     *
     * Notes:
     *  - Do NOT reference any base URLs here. ApiClient resolves baseURL from process.env.BASE_URL
     *    when a baseURL is not explicitly passed in options.
     *  - The apiPath defaults to 'api/payment-summary' so that methods only supply postfixes.
     *
     * @param {Object} [options={}] - forwarded to ApiClient constructor (optional)
     * @param {string} [options.baseURL] - optional override (rare; usually omitted)
     * @param {number} [options.timeout]
     * @param {string} [options.apiPath] - optional override for the apiPath (defaults to 'api/payment-summary')
     */
    constructor(options = {}) {
        const apiPath = options.apiPath ?? 'api/payment-summary';
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
     * Fetch payment summary for one or more accounts for a given statement period.
     *
     * The backend expects:
     *   - accounts: comma separated list
     *   - statementPeriod: string
     *
     * ApiClient will attach X-Transaction-ID and default headers automatically.
     *
     * @async
     * @param {string|string[]} accounts - single account or array of accounts (required)
     * @param {string} statementPeriod - statement period identifier (required)
     * @returns {Promise<Array<Object>>} array of PaymentSummaryResponse objects
     * @throws {Error} when required params are missing or invalid
     * @throws {Object} normalized ApiClient error when request fails
     */
    async getPaymentSummary(accounts, statementPeriod) {
        logger.info('getPaymentSummary called', { statementPeriod });

        // Validate statementPeriod
        this.validateRequired(statementPeriod, 'statementPeriod', 'string');

        // Normalize & validate accounts input
        let accountsCsv = '';
        if (Array.isArray(accounts)) {
            if (accounts.length === 0) {
                throw new Error('accounts is required and must include at least one account');
            }
            accountsCsv = accounts.map((a) => String(a).trim()).filter(Boolean).join(',');
        } else {
            // treat as string
            this.validateRequired(accounts, 'accounts', 'string');
            accountsCsv = String(accounts).trim();
            if (!accountsCsv) throw new Error('accounts cannot be empty');
        }

        const params = {
            accounts: accountsCsv,
            statementPeriod: String(statementPeriod),
        };

        const path = this.buildPath('');
        return this.get(path, params);
    }
}