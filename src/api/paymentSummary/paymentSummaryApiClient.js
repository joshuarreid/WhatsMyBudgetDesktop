/**
 * PaymentSummaryApiClient - robust client for /payment-summary endpoints.
 *
 * - Extends ApiClient and delegates HTTP work to ApiClient.
 * - Uses the same endpoint-building strategy as BudgetTransactionApiClient so callers
 *   don't need to worry whether ApiClient.baseURL already contains the resource suffix
 *   (e.g. ".../api/payment-summary").
 * - Default apiPath is 'api' (not 'api/payment-summary') so ApiClient._buildUrl
 *   prefixes the apiPath consistently; resource('payment-summary') is used for calls.
 *
 * @module api/paymentSummary/paymentSummaryApiClient
 */

import ApiClient from '../ApiClient';

/**
 * Standardized logger for this module.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[PaymentSummaryApiClient]', ...args),
    error: (...args) => console.error('[PaymentSummaryApiClient]', ...args),
};

export default class PaymentSummaryApiClient extends ApiClient {
    /**
     * Create a PaymentSummaryApiClient instance.
     *
     * @param {Object} [options={}] - forwarded to ApiClient constructor (optional)
     * @param {string} [options.baseURL] - optional override for baseURL
     * @param {number} [options.timeout]
     * @param {string} [options.apiPath] - optional override for apiPath (defaults to 'api')
     */
    constructor(options = {}) {
        // IMPORTANT: default apiPath is 'api' (not 'api/payment-summary') so resource(...) works like budget client
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
     * Build the resource endpoint similar to BudgetTransactionApiClient strategy:
     * - If baseURL already ends with '/api/payment-summary', call absolute base or base/rel
     * - Otherwise return resource('payment-summary', relative) so ApiClient prefixes apiPath
     *
     * @param {string} [relative=''] - relative postfix under payment-summary resource
     * @returns {string} endpoint to pass to ApiClient methods
     */
    _buildResourceEndpointForClient(relative = '') {
        try {
            const base = String(this.baseURL ?? '').replace(/\/+$/, '');
            const relClean = String(relative ?? '').replace(/^\/+|\/+$/g, '');

            // If base already points to the payment-summary resource root -> use absolute URLs
            if (base.endsWith('/api/payment-summary')) {
                if (!relClean) return base;
                return `${base}/${relClean}`;
            }

            // Default: let ApiClient prefix apiPath -> use resource('payment-summary', rel)
            return this.resource(relClean);
        } catch (err) {
            logger.error('_buildResourceEndpointForClient failed, falling back to resource()', err);
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
        return this.resourceEndpoint('payment-summary', relative);
    }

    /**
     * Fetch payment summary for one or more accounts for a given statement period.
     *
     * @async
     * @param {string|string[]} accounts - single account or array of accounts (required)
     * @param {string} statementPeriod - statement period identifier (required)
     * @returns {Promise<Array<Object>>}
     */
    async getPaymentSummary(accounts, statementPeriod) {
        logger.info('getPaymentSummary called', { statementPeriod });

        this.validateRequired(statementPeriod, 'statementPeriod', 'string');

        let accountsCsv = '';
        if (Array.isArray(accounts)) {
            if (accounts.length === 0) {
                throw new Error('accounts is required and must include at least one account');
            }
            accountsCsv = accounts.map((a) => String(a).trim()).filter(Boolean).join(',');
        } else {
            this.validateRequired(accounts, 'accounts', 'string');
            accountsCsv = String(accounts).trim();
            if (!accountsCsv) throw new Error('accounts cannot be empty');
        }

        const params = {
            accounts: accountsCsv,
            statementPeriod: String(statementPeriod),
        };

        const endpoint = this._buildResourceEndpointForClient('');
        return this.get(endpoint, params);
    }
}