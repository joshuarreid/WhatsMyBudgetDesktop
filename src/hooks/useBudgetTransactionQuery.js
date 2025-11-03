/**
 * useBudgetTransactionsQuery
 * - Hook wrapping TanStack Query (v5) to fetch budget transactions with filters.
 * - Normalizes server response into a stable shape used by the UI:
 *   {
 *     personalTransactions: { transactions: Array, count: number },
 *     jointTransactions: { transactions: Array, count: number },
 *     total: number,
 *     personalTotal: number,
 *     jointTotal: number,
 *     count: number,
 *     loading: boolean,
 *     error: any,
 *     refetch: Function,
 *     data: any (raw)
 *   }
 *
 * Conventions:
 * - Query key is derived from the filters object so queries cache and invalidate correctly.
 * - Conservative defaults: no automatic refetching; callers can override via options.
 * - Adds __isProjected flag is not set here (projected transactions are handled by useProjectedTransactionQuery).
 *
 * @module hooks/useBudgetTransactionsQuery
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import budgetTransactionApi from '../api/budgetTransaction/budgetTransaction';

const logger = {
    info: (...args) => console.log('[useBudgetTransactionsQuery]', ...args),
    error: (...args) => console.error('[useBudgetTransactionsQuery]', ...args),
};

/**
 * Build a stable query key for budget transactions from filters.
 *
 * @param {Object} filters
 * @returns {Array<any>} query key
 */
function buildQueryKey(filters = {}) {
    // keep keys explicit so different filter shapes produce stable keys
    const { account, statementPeriod, category, criticality, paymentMethod, page, pageSize } = filters || {};
    return [
        'budgetTransactions',
        account ?? '',
        statementPeriod ?? '',
        category ?? '',
        criticality ?? '',
        paymentMethod ?? '',
        page ?? '',
        pageSize ?? '',
    ];
}

/**
 * Safely sum amounts in an array of transactions.
 *
 * @param {Array<Object>} arr
 * @returns {number}
 */
function sumAmounts(arr = []) {
    try {
        if (!Array.isArray(arr)) return 0;
        return arr.reduce((s, t) => s + (Number(t?.amount) || 0), 0);
    } catch (err) {
        logger.error('sumAmounts failed', err);
        return 0;
    }
}

/**
 * Normalize various server response shapes into the canonical UI shape.
 *
 * Supported input shapes:
 * - { personalTransactions: { transactions: [] }, jointTransactions: { transactions: [] }, total, personalTotal, jointTotal }
 * - { budgetTransactions: [...] }  // legacy combined list
 * - Array of transactions
 *
 * @param {any} raw - raw server response
 * @returns {{
 *   personalTransactions: { transactions: Array, count: number },
 *   jointTransactions: { transactions: Array, count: number },
 *   total: number,
 *   personalTotal: number,
 *   jointTotal: number,
 *   count: number
 * }}
 */
function normalizeRawResponse(raw) {
    try {
        // defaults
        const personal = { transactions: [], count: 0 };
        const joint = { transactions: [], count: 0 };
        let total = 0;
        let personalTotal = 0;
        let jointTotal = 0;

        if (!raw) {
            return { personalTransactions: personal, jointTransactions: joint, total, personalTotal, jointTotal, count: 0 };
        }

        // Case: server already provides personal/joint split
        if (raw.personalTransactions || raw.jointTransactions) {
            const p = raw.personalTransactions?.transactions ?? raw.personalTransactions ?? [];
            const j = raw.jointTransactions?.transactions ?? raw.jointTransactions ?? [];

            personal.transactions = Array.isArray(p) ? p : [];
            personal.count = Array.isArray(p) ? personal.transactions.length : Number(raw.personalTransactions?.count ?? 0);

            joint.transactions = Array.isArray(j) ? j : [];
            joint.count = Array.isArray(j) ? joint.transactions.length : Number(raw.jointTransactions?.count ?? 0);

            personalTotal = Number(raw.personalTotal ?? sumAmounts(personal.transactions));
            jointTotal = Number(raw.jointTotal ?? sumAmounts(joint.transactions));
            total = Number(raw.total ?? (personalTotal + jointTotal));
            const count = (personal.count || 0) + (joint.count || 0);

            return { personalTransactions: personal, jointTransactions: joint, total, personalTotal, jointTotal, count };
        }

        // Case: server returns { budgetTransactions: [...] }
        if (raw.budgetTransactions && Array.isArray(raw.budgetTransactions)) {
            const arr = raw.budgetTransactions;
            personal.transactions = arr;
            personal.count = arr.length;
            total = Number(raw.total ?? sumAmounts(arr));
            personalTotal = total;
            jointTotal = 0;
            const count = arr.length;
            return { personalTransactions: personal, jointTransactions: joint, total, personalTotal, jointTotal, count };
        }

        // Case: server returns an array directly
        if (Array.isArray(raw)) {
            personal.transactions = raw;
            personal.count = raw.length;
            total = sumAmounts(raw);
            personalTotal = total;
            jointTotal = 0;
            const count = raw.length;
            return { personalTransactions: personal, jointTransactions: joint, total, personalTotal, jointTotal, count };
        }

        // Case: server returns other wrapper shapes (try to find arrays)
        // e.g., { data: [...], total: 123 }, or { transactions: [...], total: ... }
        const maybeArr = raw.data ?? raw.transactions ?? raw.results ?? null;
        if (Array.isArray(maybeArr)) {
            personal.transactions = maybeArr;
            personal.count = maybeArr.length;
            total = Number(raw.total ?? sumAmounts(maybeArr));
            personalTotal = total;
            jointTotal = 0;
            const count = maybeArr.length;
            return { personalTransactions: personal, jointTransactions: joint, total, personalTotal, jointTotal, count };
        }

        // Fallback: empty
        return { personalTransactions: personal, jointTransactions: joint, total, personalTotal, jointTotal, count: 0 };
    } catch (err) {
        logger.error('normalizeRawResponse failed', err, raw);
        return { personalTransactions: { transactions: [], count: 0 }, jointTransactions: { transactions: [], count: 0 }, total: 0, personalTotal: 0, jointTotal: 0, count: 0 };
    }
}

/**
 * useBudgetTransactionsQuery
 *
 * @param {Object} [filters={}] - optional filters: account, statementPeriod, category, criticality, paymentMethod, page, pageSize, etc.
 * @param {Object} [options={}] - optional react-query options override
 * @returns {{
 *   personalTransactions: { transactions: Array, count: number },
 *   jointTransactions: { transactions: Array, count: number },
 *   total: number,
 *   personalTotal: number,
 *   jointTotal: number,
 *   count: number,
 *   loading: boolean,
 *   error: any,
 *   refetch: Function,
 *   data: any
 * }}
 */
export function useBudgetTransactionsQuery(filters = {}, options = {}) {
    const queryKey = buildQueryKey(filters);

    const query = useQuery({
        queryKey,
        queryFn: async () => {
            logger.info('fetchAllBudgetTransactions (queryFn) called', { filters });
            const res = await budgetTransactionApi.fetchAllBudgetTransactions(filters);
            return res;
        },
        staleTime: Infinity,
        cacheTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
        ...options,
    });

    const normalized = useMemo(() => {
        try {
            return normalizeRawResponse(query.data);
        } catch (err) {
            logger.error('normalization in useMemo failed', err, query.data);
            return { personalTransactions: { transactions: [], count: 0 }, jointTransactions: { transactions: [], count: 0 }, total: 0, personalTotal: 0, jointTotal: 0, count: 0 };
        }
    }, [query.data]);

    return {
        personalTransactions: normalized.personalTransactions,
        jointTransactions: normalized.jointTransactions,
        total: normalized.total,
        personalTotal: normalized.personalTotal,
        jointTotal: normalized.jointTotal,
        count: normalized.count,
        loading: query.isFetching || query.isPending || false,
        error: query.error ?? null,
        refetch: query.refetch,
        data: query.data,
    };
}

export default useBudgetTransactionsQuery;