/**
 * Simple, human-friendly query keys for TanStack Query (react-query)
 *
 * - Minimal, predictable constants and helpers.
 * - Keep keys as plain arrays (recommended by TanStack Query).
 * - Consumers can include filter objects in list keys when needed.
 *
 * Usage:
 *   import qk from './budgetTransactionQueryKeys';
 *   useQuery(qk.listKey({ account: 'Current' }), () => fetchFn(...));
 *
 * @module budgetTransactionQueryKeys
 */

/**
 * Standardized logger for this module.
 * @constant
 * @type {{info: Function, error: Function}}
 */
const logger = {
    info: (...args) => console.log('[budgetTransactionQueryKeys]', ...args),
    error: (...args) => console.error('[budgetTransactionQueryKeys]', ...args),
};

logger.info('budgetTransactionQueryKeys loaded');

/**
 * Base key for the BudgetTransaction resource.
 * @type {Array<string>}
 */
export const BUDGETTRANSACTIONS = ['budgetTransactions'];

/**
 * Key prefix for list queries.
 * @type {Array<any>}
 */
export const BUDGETTRANSACTIONS_LISTS = [...BUDGETTRANSACTIONS, 'list'];

/**
 * Get a stable key for a list query. If filters are provided they are included as the final key item.
 *
 * Note: If you pass objects as filters, consider canonicalizing (sorting) keys upstream
 * to ensure deterministic keys across callers.
 *
 * @param {Object|null} [filters=null] - optional filters (e.g. { account, statementPeriod })
 * @returns {Array<any>} query key
 */
export function listKey(filters = null) {
    return filters ? [...BUDGETTRANSACTIONS_LISTS, filters] : BUDGETTRANSACTIONS_LISTS;
}

/**
 * Key for account-scoped lists: ['budgetTransactions','accounts', account, {filters}]
 *
 * @param {string|number} account
 * @param {Object|null} [filters=null]
 * @returns {Array<any>}
 */
export function accountListKey(account, filters = null) {
    const base = [...BUDGETTRANSACTIONS, 'accounts', String(account)];
    return filters ? [...base, filters] : base;
}

/**
 * Key for a single transaction detail.
 *
 * @param {string|number} id
 * @returns {Array<any>}
 */
export function detailKey(id) {
    return [...BUDGETTRANSACTIONS, 'detail', String(id)];
}

/**
 * Mutation keys (useful for invalidation targets)
 */
export const createKey = () => [...BUDGETTRANSACTIONS, 'create'];
export const updateKey = (id) => [...BUDGETTRANSACTIONS, 'update', String(id)];
export const removeKey = (id) => [...BUDGETTRANSACTIONS, 'remove', String(id)];
export const uploadKey = () => [...BUDGETTRANSACTIONS, 'upload'];

/**
 * Convenience invalidation helpers that return the relevant key to pass to queryClient.invalidateQueries(...)
 */
export const invalidateListsKey = () => BUDGETTRANSACTIONS_LISTS;
export const invalidateDetailKey = (id) => detailKey(id);
export const invalidateAccountKey = (account, filters = null) => accountListKey(account, filters);

/**
 * Default export with grouped helpers (handy for importing everything).
 */
const budgetTransactionQueryKeys = {
    BUDGETTRANSACTIONS,
    BUDGETTRANSACTIONS_LISTS,
    listKey,
    accountListKey,
    detailKey,
    createKey,
    updateKey,
    removeKey,
    uploadKey,
    invalidateListsKey,
    invalidateDetailKey,
    invalidateAccountKey,
};

export default budgetTransactionQueryKeys;