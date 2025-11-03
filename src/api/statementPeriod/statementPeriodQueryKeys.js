/**
 * Simple, human-friendly query keys for TanStack Query (react-query)
 * for the StatementPeriod resource.
 *
 * - Minimal constants and helpers so hooks/components can share keys for
 *   queries and invalidations.
 * - Keys are plain arrays (recommended by TanStack Query).
 *
 * Usage:
 *   import qk from './statementPeriodQueryKeys';
 *   useQuery(qk.listKey(), () => api.getAllStatementPeriods());
 *
 * @module statementPeriodQueryKeys
 */

/**
 * Base key for the StatementPeriod resource.
 * @type {Array<string>}
 */
export const STATEMENTS = ['statements'];

/**
 * Key prefix for list queries.
 * @type {Array<any>}
 */
export const STATEMENTS_LIST = [...STATEMENTS, 'list'];

/**
 * Key for a list query with optional filters.
 *
 * @param {Object|null} [filters=null] - optional filters object
 * @returns {Array<any>}
 */
export function listKey(filters = null) {
    return filters ? [...STATEMENTS_LIST, filters] : STATEMENTS_LIST;
}

/**
 * Key for a single statement period detail.
 *
 * @param {string|number} id
 * @returns {Array<any>}
 */
export function detailKey(id) {
    return [...STATEMENTS, 'detail', String(id)];
}

/**
 * Mutation keys
 */
export const createKey = () => [...STATEMENTS, 'create'];
export const updateKey = (id) => [...STATEMENTS, 'update', String(id)];
export const removeKey = (id) => [...STATEMENTS, 'remove', String(id)];

/**
 * Convenience invalidation helpers
 */
export const invalidateListsKey = () => STATEMENTS_LIST;
export const invalidateDetailKey = (id) => detailKey(id);

/**
 * Default export grouping helpers for convenient import.
 */
const statementPeriodQueryKeys = {
    STATEMENTS,
    STATEMENTS_LIST,
    listKey,
    detailKey,
    createKey,
    updateKey,
    removeKey,
    invalidateListsKey,
    invalidateDetailKey,
};

export default statementPeriodQueryKeys;