/**
 * Thin fetcher module for PaymentSummary endpoints.
 *
 * - Responsible for creating its own PaymentSummaryApiClient instance.
 * - Consumers simply call the exported functions (no baseURL, apiPath or transaction-id references here).
 * - ApiClient is responsible for resolving process.env.BASE_URL and attaching X-Transaction-ID header.
 *
 * @module paymentSummary
 */

import PaymentSummaryApiClient from './paymentSummaryApiClient';

/**
 * Standardized logger for this module.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[paymentSummary]', ...args),
    error: (...args) => console.error('[paymentSummary]', ...args),
};

/**
 * Internal API client instance managed by this module.
 * Constructed without an explicit baseURL so ApiClient will resolve process.env.BASE_URL.
 *
 * @type {PaymentSummaryApiClient}
 * @private
 */
const apiClient = new PaymentSummaryApiClient();

/**
 * Fetch payment summary for given accounts and statement period.
 *
 * - Returns response.paymentSummaries or response (tolerant to different server shapes).
 *
 * @async
 * @param {string|string[]} accounts - single account or array of accounts (required)
 * @param {string} statementPeriod - statement period identifier (required)
 * @returns {Promise<any>} list of payment summary objects
 * @throws {Error|Object} validation error or normalized ApiClient error
 */
export async function fetchPaymentSummary(accounts, statementPeriod) {
    logger.info('fetchPaymentSummary called', { statementPeriod });
    try {
        const response = await apiClient.getPaymentSummary(accounts, statementPeriod);
        // tolerate response shapes
        return response?.paymentSummaries || response;
    } catch (err) {
        logger.error('fetchPaymentSummary failed', err);
        throw err;
    }
}

/**
 * Default export: convenience object exposing functions.
 */
const paymentSummary = {
    fetchPaymentSummary,
};

export default paymentSummary;