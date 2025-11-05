/**
 * Query keys for ProjectedTransaction resource (conical shape aligned with budgetTransaction keys).
 *
 * - Mirrors the shape and helpers used by budgetTransactionQueryKeys so projections queries are
 *   canonical and easy to reason about across the app.
 * - Keys are plain arrays (recommended by TanStack Query).
 *
 * @module projectedTransactionQueryKeys
 */

/**
 * Standardized logger for this module.
 * @constant
 * @type {{info: Function, error: Function}}
 */
const logger = {
    info: (...args) => console.log('[projectedTransactionQueryKeys]', ...args),
    error: (...args) => console.error('[projectedTransactionQueryKeys]', ...args),
};

logger.info('projectedTransactionQueryKeys loaded');

/**
 * Base key for projected transactions resource.
 * @type {Array<string>}
 */
export const PROJECTEDTRANSACTIONS = ['projectedTransactions'];

/**
 * Key prefix for list queries.
 * @type {Array<any>}
 */
export const PROJECTEDTRANSACTIONS_LISTS = [...PROJECTEDTRANSACTIONS, 'list'];

/**
 * Get a stable key for a list query. If filters are provided they are appended as the final
 * key item to produce deterministic keys when callers include filter objects.
 *
 * Note: If you pass objects as filters, consider canonicalizing (sorting) keys upstream
 * to ensure deterministic keys across callers.
 *
 * @param {Object|null} [filters=null] - optional filters (e.g. { account, statementPeriod })
 * @returns {Array<any>} query key
 */
export function listKey(filters = null) {
    return filters ? [...PROJECTEDTRANSACTIONS_LISTS, filters] : PROJECTEDTRANSACTIONS_LISTS;
}

/**
 * Key for account-scoped lists.
 *
 * Example: ['projectedTransactions', 'accounts', account, { filters }]
 *
 * @param {string|number} account
 * @param {Object|null} [filters=null]
 * @returns {Array<any>} query key
 */
export function accountListKey(account, filters = null) {
    const base = [...PROJECTEDTRANSACTIONS, 'accounts', String(account)];
    return filters ? [...base, filters] : base;
}

/**
 * Key for a single projected transaction detail.
 *
 * Example: ['projectedTransactions', 'detail', id]
 *
 * @param {string|number} id
 * @returns {Array<any>} detail query key
 */
export function detailKey(id) {
    return [...PROJECTEDTRANSACTIONS, 'detail', String(id)];
}

/**
 * Mutation key for creation operations.
 * @returns {Array<any>}
 */
export const createKey = () => [...PROJECTEDTRANSACTIONS, 'create'];

/**
 * Mutation key for update operations.
 * @param {string|number} id
 * @returns {Array<any>}
 */
export const updateKey = (id) => [...PROJECTEDTRANSACTIONS, 'update', String(id)];

/**
 * Mutation key for remove/delete operations.
 * @param {string|number} id
 * @returns {Array<any>}
 */
export const removeKey = (id) => [...PROJECTEDTRANSACTIONS, 'remove', String(id)];

/**
 * Convenience invalidation helper returning the list keys.
 * Useful for queryClient.invalidateQueries(...)
 *
 * @returns {Array<any>}
 */
export const invalidateListsKey = () => PROJECTEDTRANSACTIONS_LISTS;

/**
 * Convenience invalidation helper for a detail key.
 *
 * @param {string|number} id
 * @returns {Array<any>}
 */
export const invalidateDetailKey = (id) => detailKey(id);

/**
 * Convenience invalidation helper for account scoped lists.
 *
 * @param {string|number} account
 * @param {Object|null} [filters=null]
 * @returns {Array<any>}
 */
export const invalidateAccountKey = (account, filters = null) => accountListKey(account, filters);

/**
 * Default export grouping helpers for convenient import.
 * @type {Object}
 */
const projectedTransactionQueryKeys = {
    PROJECTEDTRANSACTIONS,
    PROJECTEDTRANSACTIONS_LISTS,
    listKey,
    accountListKey,
    detailKey,
    createKey,
    updateKey,
    removeKey,
    invalidateListsKey,
    invalidateDetailKey,
    invalidateAccountKey,
};

export default projectedTransactionQueryKeys;