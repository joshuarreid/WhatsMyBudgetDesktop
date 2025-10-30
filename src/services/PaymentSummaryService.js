/**
 * PaymentSummaryService
 * - Service for fetching payment summaries from the backend REST API.
 * - Calls /api/payment-summary endpoint with accounts and statementPeriod.
 * - Follows Bulletproof React conventions and robust logging.
 *
 * @module PaymentSummaryService
 */

const logger = {
    info: (...args) => console.log('[PaymentSummaryService]', ...args),
    error: (...args) => console.error('[PaymentSummaryService]', ...args),
};

import { apiClient } from '../lib/apiClient'; // Centralized axios instance

const RESOURCE = '/api/payment-summary';

const PaymentSummaryService = {
    /**
     * GET /api/payment-summary
     * - Fetches payment summary for the given accounts and statement period.
     *
     * @async
     * @function getPaymentSummary
     * @param {Object} params
     * @param {Array<string>} params.accounts - List of account identifiers.
     * @param {string} params.statementPeriod - Statement period filter (required).
     * @param {string} [params.transactionId] - Optional transaction ID for tracing/logging.
     * @returns {Promise<Array<Object>>} Array of PaymentSummaryResponse objects.
     * @throws {Error} If the request fails.
     */
    async getPaymentSummary({ accounts, statementPeriod, transactionId }) {
        logger.info('getPaymentSummary called', { accounts, statementPeriod, transactionId });

        if (!Array.isArray(accounts) || accounts.length === 0) {
            logger.error('getPaymentSummary: No accounts provided', { accounts });
            throw new Error('Accounts array required.');
        }
        if (!statementPeriod || typeof statementPeriod !== 'string') {
            logger.error('getPaymentSummary: No statementPeriod provided', { statementPeriod });
            throw new Error('statementPeriod required.');
        }

        try {
            const params = {
                accounts: accounts.join(','),
                statementPeriod,
            };
            const headers = {};
            if (transactionId) {
                headers['X-Transaction-ID'] = transactionId;
            }

            const response = await apiClient.get(RESOURCE, {
                params,
                headers,
            });
            logger.info('getPaymentSummary success', {
                count: Array.isArray(response.data) ? response.data.length : 0,
                sample: Array.isArray(response.data) ? response.data[0] : response.data
            });
            return response.data;
        } catch (err) {
            logger.error('getPaymentSummary error', err);
            throw err;
        }
    }
};

export default PaymentSummaryService;