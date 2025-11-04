/**
 * Thin fetcher module for PaymentSummary endpoints.
 *
 * - Uses PaymentSummaryApiClient to call the server and returns the data in a tolerant way.
 * - This module mirrors the budgetTransaction fetcher pattern (single client instance).
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
 * Constructed without an explicit baseURL so ApiClient resolves process.env.BASE_URL.
 *
 * @type {PaymentSummaryApiClient}
 * @private
 */
const apiClient = new PaymentSummaryApiClient();

/**
 * Fetch payment summary for given accounts and statement period.
 *
 * @async
 * @param {string|string[]} accounts - single account or array of accounts (required)
 * @param {string} statementPeriod - statement period identifier (required)
 * @returns {Promise<any>} list of payment summary objects
 * @throws {Error|Object}
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

const paymentSummary = {
    fetchPaymentSummary,
};

export default paymentSummary;