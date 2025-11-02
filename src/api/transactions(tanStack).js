/**
 * src/api/transactions(tanStack).js
 *
 * Pure fetchers for /api/transactions endpoints.
 * - Uses existing getApiClient() (axios) for consistent headers/auth/X-Transaction-ID logging.
 * - Read-only functions implemented here for Step 2 (list and account-scoped reads).
 *
 * NOTE: Temporary file name includes "(tanStack)" suffix during migration.
 */

const logger = {
    info: (...args) => console.log('[api/transactions]', ...args),
    error: (...args) => console.error('[api/transactions]', ...args),
};

import { getApiClient } from '../lib/apiClient';

const RESOURCE = '/api/transactions';

/**
 * fetchTransactions
 * - Fetch transactions list with optional filters.
 *
 * @async
 * @function fetchTransactions
 * @param {Object} [filters={}] - Query parameters: { statementPeriod, account, category, paymentMethod, criticality, page, pageSize, ... }
 * @returns {Promise<any>} - Server response data (transactions list object)
 * @throws {Error} - On request failure
 */
export async function fetchTransactions(filters = {}) {
    logger.info('fetchTransactions called', { filters });
    try {
        const apiClient = await getApiClient();
        const resp = await apiClient.get(RESOURCE, { params: filters });
        logger.info('fetchTransactions success', {
            url: resp.config?.url,
            status: resp.status,
            count: resp.data?.count ?? (Array.isArray(resp.data) ? resp.data.length : undefined),
        });
        return resp.data;
    } catch (err) {
        logger.error('fetchTransactions failed', err);
        throw err;
    }
}

/**
 * fetchTransaction
 * - Fetch a single transaction by id.
 *
 * @async
 * @function fetchTransaction
 * @param {string|number} id - Transaction ID
 * @returns {Promise<any>} - Single transaction object
 * @throws {Error} - If id missing or request fails
 */
export async function fetchTransaction(id) {
    logger.info('fetchTransaction called', { id });
    if (!id) throw new Error('Transaction ID required');
    try {
        const apiClient = await getApiClient();
        const resp = await apiClient.get(`${RESOURCE}/${encodeURIComponent(id)}`);
        logger.info('fetchTransaction success', { id, status: resp.status });
        return resp.data;
    } catch (err) {
        logger.error('fetchTransaction failed', err);
        throw err;
    }
}

/**
 * fetchTransactionsForAccount
 * - Fetch transactions scoped to an account with optional filters.
 *
 * @async
 * @function fetchTransactionsForAccount
 * @param {Object} params - { account, statementPeriod, category, criticality, paymentMethod }
 * @returns {Promise<any>} - Account-scoped transactions response
 * @throws {Error} - If account missing or request fails
 */
export async function fetchTransactionsForAccount({ account, statementPeriod, category, criticality, paymentMethod } = {}) {
    logger.info('fetchTransactionsForAccount called', { account, statementPeriod, category, criticality, paymentMethod });
    if (!account) throw new Error('Account is required');
    try {
        const apiClient = await getApiClient();
        const resp = await apiClient.get(`${RESOURCE}/account`, {
            params: { account, statementPeriod, category, criticality, paymentMethod },
        });
        logger.info('fetchTransactionsForAccount success', {
            account,
            status: resp.status,
            personalCount: resp.data?.personalTransactions?.count ?? 0,
        });
        return resp.data;
    } catch (err) {
        logger.error('fetchTransactionsForAccount failed', err);
        throw err;
    }
}

export default {
    fetchTransactions,
    fetchTransaction,
    fetchTransactionsForAccount,
};