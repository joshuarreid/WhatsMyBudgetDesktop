/**
 * useCategorizedTable
 *
 * - Computes the categorized table data (totals by category, rows, formatting)
 *   using the react-query powered `useBudgetTransactionsQuery` hook.
 * - Also fetches projected transactions (via useProjectedTransactions query hook)
 *   and computes projected totals (per-criticality and per-category) so UI components
 *   don't need to call query hooks themselves.
 * - Keeps the same return shape and adds:
 *     - projectedTotal
 *     - projectedTotalsByCategory
 *
 * JSDoc, logging and Bulletproof React conventions applied.
 *
 * @module hooks/useCategorizedTable
 */

import { useMemo } from 'react';
import useBudgetTransactionsQuery from '../../hooks/useBudgetTransactionQuery';
import useProjectedTransactionsQuery from '../../hooks/useProjectedTransactionQuery';

const logger = {
    info: (...args) => console.log('[useCategorizedTable]', ...args),
    error: (...args) => console.error('[useCategorizedTable]', ...args),
};

/**
 * useCategorizedTable
 *
 * @param {Object|{filters:Object}} propsOrFilters - either a filters object or the full props object (backwards compatibility)
 * @returns {{
 *   filters: Object,
 *   txResult: Object,
 *   transactions: Array,
 *   totalSum: number,
 *   loading: boolean,
 *   error: any,
 *   totalsByCategory: Record<string, number>,
 *   rows: Array<[string, number]>,
 *   fmt: Intl.NumberFormat,
 *   projectedTotal: number,
 *   projectedTotalsByCategory: Record<string, number>,
 *   projectedTx: Array,
 *   refetchProjected: Function
 * }}
 */
export default function useCategorizedTable(propsOrFilters = {}) {
    try {
        // Normalize input (support either props object or direct filters)
        const filters = propsOrFilters?.filters ?? propsOrFilters ?? {};
        logger.info('normalized filters', filters);

        // Budget transactions (react-query)
        const txResult = useBudgetTransactionsQuery(filters || {});

        // Merge personal + joint transactions
        const transactions = useMemo(() => {
            try {
                const personal = txResult.personalTransactions?.transactions ?? [];
                const joint = txResult.jointTransactions?.transactions ?? [];
                return [...personal, ...joint].sort((a, b) => {
                    const ta = a?.transactionDate ? new Date(a.transactionDate).getTime() : 0;
                    const tb = b?.transactionDate ? new Date(b.transactionDate).getTime() : 0;
                    return tb - ta;
                });
            } catch (err) {
                logger.error('transactions useMemo failed', err);
                return [];
            }
        }, [txResult.personalTransactions, txResult.jointTransactions]);

        // Totals from budgetResult
        const totalSum = typeof txResult.total === 'number' ? txResult.total : Number(txResult.total) || 0;
        const loading = txResult.loading || false;
        const error = txResult.error || null;

        logger.info(`transactions: count=${transactions.length} totalSum=${totalSum}`);

        // totalsByCategory (from budget transactions)
        const totalsByCategory = useMemo(() => {
            logger.info('calculating category totals (useMemo)');
            return transactions.reduce((acc, tx) => {
                try {
                    const cat = tx && tx.category ? tx.category : 'Uncategorized';
                    const amount = Number(tx && tx.amount ? tx.amount : 0);
                    acc[cat] = (acc[cat] || 0) + (Number.isNaN(amount) ? 0 : amount);
                    return acc;
                } catch (err) {
                    logger.error('reducer error calculating totalsByCategory', err, tx);
                    return acc;
                }
            }, /** @type {Record<string, number>} */ ({}));
        }, [transactions]);

        // rows sorted alphabetically by category
        const rows = useMemo(() => {
            try {
                return Object.entries(totalsByCategory).sort(([a], [b]) => a.localeCompare(b));
            } catch (err) {
                logger.error('rows useMemo failed', err);
                return [];
            }
        }, [totalsByCategory]);

        // currency formatter
        const fmt = useMemo(
            () =>
                new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                }),
            []
        );

        // --- Projected transactions (react-query) ---
        // Fetch projected transactions scoped to account + statementPeriod when present
        const projectedQuery = useProjectedTransactionsQuery(
            {
                account: filters?.account,
                statementPeriod: filters?.statementPeriod,
            },
            {
                // align caching behavior with budget hook defaults (callers can override)
                staleTime: Infinity,
                cacheTime: Infinity,
                refetchOnWindowFocus: false,
                refetchOnReconnect: false,
                retry: false,
            }
        );

        const projectedTx = projectedQuery.projectedTx ?? [];
        const refetchProjected = projectedQuery.refetch;

        // Compute projected totals for the hook's filters (especially criticality)
        const projectedTotalsByCategory = useMemo(() => {
            try {
                if (!Array.isArray(projectedTx)) return {};
                const critFilter = filters?.criticality ? String(filters.criticality).toLowerCase() : '';
                return projectedTx
                    .filter((tx) => {
                        if (!critFilter) return true;
                        return String(tx.criticality || '').toLowerCase() === critFilter;
                    })
                    .reduce((acc, tx) => {
                        const cat = tx?.category || 'Uncategorized';
                        const amount = Number(tx?.amount) || 0;
                        acc[cat] = (acc[cat] || 0) + amount;
                        return acc;
                    }, /** @type {Record<string, number>} */ ({}));
            } catch (err) {
                logger.error('projectedTotalsByCategory computation failed', err, projectedTx);
                return {};
            }
        }, [projectedTx, filters?.criticality]);

        const projectedTotal = useMemo(() => {
            try {
                if (!Array.isArray(projectedTx)) return 0;
                const critFilter = filters?.criticality ? String(filters.criticality).toLowerCase() : '';
                return projectedTx
                    .filter((tx) => {
                        if (!critFilter) return true;
                        return String(tx.criticality || '').toLowerCase() === critFilter;
                    })
                    .reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
            } catch (err) {
                logger.error('projectedTotal computation failed', err, projectedTx);
                return 0;
            }
        }, [projectedTx, filters?.criticality]);

        return {
            filters,
            txResult,
            transactions,
            totalSum,
            loading,
            error,
            totalsByCategory,
            rows,
            fmt,
            // projection outputs
            projectedTotal,
            projectedTotalsByCategory,
            projectedTx,
            refetchProjected,
        };
    } catch (err) {
        logger.error('hook error', err);
        throw err;
    }
}