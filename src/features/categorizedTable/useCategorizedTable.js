/**
 * useCategorizedTable
 *
 * - Computes the categorized table data (totals by category, rows, formatting)
 *   using the new react-query powered `useBudgetTransactionsQuery` hook.
 * - Removes TransactionEvents subscription (we no longer rely on pub/sub here).
 * - Keeps the same return shape so consuming components do not need to change.
 *
 * Responsibilities:
 * - Normalize filters (back-compat when caller passes props object)
 * - Call useBudgetTransactionsQuery directly for the data the UI needs
 * - Merge personal + joint transactions for display and compute totals-by-category
 *
 * @module hooks/useCategorizedTable
 */

import { useMemo } from 'react';
import useBudgetTransactionsQuery from "../../hooks/useBudgetTransactionQuery";


const logger = {
    info: (...args) => console.log('[useCategorizedTable]', ...args),
    error: (...args) => console.error('[useCategorizedTable]', ...args),
};

/**
 * useCategorizedTable
 *
 * @param {Object} propsOrFilters - either a filters object or the full props object (backwards compatibility)
 * @returns {{
 *   filters: Object,
 *   txResult: Object,
 *   transactions: Array,
 *   totalSum: number,
 *   loading: boolean,
 *   error: any,
 *   totalsByCategory: Record<string, number>,
 *   rows: Array<[string, number]>,
 *   fmt: Intl.NumberFormat
 * }}
 */
export default function useCategorizedTable(propsOrFilters = {}) {
    try {
        // Backwards-compatible normalization: component may pass { filters } or raw filters
        const filters = propsOrFilters?.filters ?? propsOrFilters;
        logger.info('normalized filters', filters);

        // Use the new react-query powered hook directly
        const txResult = useBudgetTransactionsQuery(filters || {});

        // Combine personal and joint transactions for display, sorted by date desc
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

        // Use the total provided by the normalized query result when possible
        const totalSum =
            typeof txResult.total === 'number' ? txResult.total : Number(txResult.total) || 0;

        const loading = txResult.loading || false;
        const error = txResult.error || null;

        logger.info(`transactions: count=${transactions.length} totalSum=${totalSum}`);

        /**
         * totalsByCategory
         * - Map of category -> summed amount
         */
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

        /**
         * rows
         * - Sorted entries suitable for rendering (category, amount)
         */
        const rows = useMemo(() => {
            try {
                return Object.entries(totalsByCategory).sort(([a], [b]) => a.localeCompare(b));
            } catch (err) {
                logger.error('rows useMemo failed', err);
                return [];
            }
        }, [totalsByCategory]);

        /**
         * Currency formatter
         */
        const fmt = useMemo(
            () =>
                new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                }),
            []
        );

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
        };
    } catch (err) {
        logger.error('hook error', err);
        throw err;
    }
}