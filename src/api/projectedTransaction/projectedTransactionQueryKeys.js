/**
 * Simple, human-friendly query keys for TanStack Query (react-query)
 * for the ProjectedTransaction resource.
 *
 * Minimal, predictable constants and helpers so components and hooks can
 * share keys for queries and invalidations.
 *
 * Usage:
 *   import qk from './projectedTransactionQueryKeys';
 *   useQuery(qk.listKey({ account: 'Current' }), () => api.getAllProjectedTransactions(...));
 *
 * @module projectedTransactionQueryKeys
 */

/**
 * Base key for projections.
 * @type {Array<string>}
 */
export const PROJECTIONS = ['projections'];

/**
 * Key prefix for lists.
 * @type {Array<any>}
 */
export const PROJECTIONS_LIST = [...PROJECTIONS, 'list'];

/**
 * Key for a projection list with optional filters.
 *
 * @param {Object|null} [filters=null] - optional filters object
 * @returns {Array<any>}
 */
export function listKey(filters = null) {
    return filters ? [...PROJECTIONS_LIST, filters] : PROJECTIONS_LIST;
}

/**
 * Key for account-specific projected transactions.
 *
 * @param {string|number} account
 * @param {Object|null} [filters=null]
 * @returns {Array<any>}
 */
export function accountListKey(account, filters = null) {
    const base = [...PROJECTIONS, 'accounts', String(account)];
    return filters ? [...base, filters] : base;
}

/**
 * Key for a single projected transaction detail.
 *
 * @param {string|number} id
 * @returns {Array<any>}
 */
export function detailKey(id) {
    return [...PROJECTIONS, 'detail', String(id)];
}

/**
 * Mutation keys
 */
export const createKey = () => [...PROJECTIONS, 'create'];
export const updateKey = (id) => [...PROJECTIONS, 'update', String(id)];
export const removeKey = (id) => [...PROJECTIONS, 'remove', String(id)];

/**
 * Convenience invalidation helpers
 */
export const invalidateListsKey = () => PROJECTIONS_LIST;
export const invalidateDetailKey = (id) => detailKey(id);
export const invalidateAccountKey = (account, filters = null) => accountListKey(account, filters);

/**
 * Default export grouping helpers for convenient import.
 */
const projectedTransactionQueryKeys = {
    PROJECTIONS,
    PROJECTIONS_LIST,
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