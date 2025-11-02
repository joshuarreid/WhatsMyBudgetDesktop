/**
 * Hook: useCategorizedTable
 *
 * Extracts the logic previously inside CategorizedTable:
 * - normalizes filters
 * - calls useBudgetAndProjectedTransactionsForAccount (tanStack)
 * - computes totals by category
 * - prepares rows and formatter
 *
 * Returns a stable object (suitable for destructuring in the component).
 */

import { useMemo } from 'react';
// UPDATED: use the TanStack-backed transactions hook
import { useBudgetAndProjectedTransactionsForAccount } from '../../hooks/useTransactions(tanStack)';

const logger = {
    info: (...args) => console.log('[useCategorizedTable]', ...args),
    error: (...args) => console.error('[useCategorizedTable]', ...args),
};

/**
 * @param {Object} propsOrFilters - either a filters object or the full props object (back-compat with previous usage)
 * @returns {Object} hook result used by CategorizedTable
 */
export default function useCategorizedTable(propsOrFilters = {}) {
    try {
        const filters = propsOrFilters?.filters ?? propsOrFilters;
        logger.info('normalized filters', filters);

        // Use the new TanStack hook for account-specific transactions
        const txResult = useBudgetAndProjectedTransactionsForAccount(filters || {});
        // Combine personal and joint transactions for display, sorted by date desc
        const transactions = useMemo(
            () => [
                ...(txResult.personalTransactions?.transactions || []),
                ...(txResult.jointTransactions?.transactions || []),
            ].sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)),
            [txResult.personalTransactions, txResult.jointTransactions],
        );
        // Use the new total from the API
        const totalSum =
            typeof txResult.total === 'number'
                ? txResult.total
                : Number(txResult.total) || 0;
        const loading = txResult.loading || false;
        const error = txResult.error || null;

        logger.info(
            `transactions: count=${transactions.length} totalSum=${totalSum}`,
        );

        const totalsByCategory = useMemo(() => {
            logger.info('calculating category totals (useMemo)');
            return transactions.reduce((acc, tx) => {
                const cat = tx && tx.category ? tx.category : 'Uncategorized';
                const amount = Number(tx && tx.amount ? tx.amount : 0);
                acc[cat] = (acc[cat] || 0) + (isNaN(amount) ? 0 : amount);
                return acc;
            }, /** @type {Record<string, number>} */ ({}));
        }, [transactions]);

        const rows = useMemo(() => {
            return Object.entries(totalsByCategory).sort(([a], [b]) =>
                a.localeCompare(b),
            );
        }, [totalsByCategory]);

        const fmt = useMemo(
            () =>
                new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                }),
            [],
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
        // Re-throwing lets the component's error boundary (if present) catch it.
        throw err;
    }
}