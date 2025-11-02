/**
 * src/api/paymentSummary(tanStack).js
 *
 * Pure fetcher for /api/payment-summary endpoint.
 * - Uses existing getApiClient() (axios instance) for consistent headers/auth/logging.
 * - Returns response.data or throws an error.
 *
 * NOTE: Temporary file name includes "(tanStack)" suffix during migration.
 */

const logger = {
    info: (...args) => console.log('[api/paymentSummary]', ...args),
    error: (...args) => console.error('[api/paymentSummary]', ...args),
};

import { getApiClient } from '../lib/apiClient';

const RESOURCE = '/api/payment-summary';

/**
 * fetchPaymentSummary
 * - Fetch payment summary for given accounts and statementPeriod.
 *
 * @async
 * @function fetchPaymentSummary
 * @param {Object} params
 * @param {Array<string>} params.accounts - required
 * @param {string} params.statementPeriod - required
 * @returns {Promise<any>} server response data
 * @throws {Error} on validation or request failure
 */
export async function fetchPaymentSummary({ accounts, statementPeriod }) {
    logger.info('fetchPaymentSummary called', { accounts, statementPeriod });

    if (!Array.isArray(accounts) || accounts.length === 0) {
        logger.error('fetchPaymentSummary: accounts must be a non-empty array', { accounts });
        throw new Error('accounts array required');
    }
    if (!statementPeriod || typeof statementPeriod !== 'string') {
        logger.error('fetchPaymentSummary: statementPeriod is required', { statementPeriod });
        throw new Error('statementPeriod required');
    }

    try {
        const apiClient = await getApiClient();
        const params = { accounts: accounts.join(','), statementPeriod };
        const resp = await apiClient.get(RESOURCE, { params });
        logger.info('fetchPaymentSummary success', { count: Array.isArray(resp.data) ? resp.data.length : 0 });
        return resp.data;
    } catch (err) {
        logger.error('fetchPaymentSummary failed', err);
        throw err;
    }
}

export default fetchPaymentSummary;