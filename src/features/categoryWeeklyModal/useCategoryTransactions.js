import { useMemo } from 'react';

/**
 * Logger for useCategoryTransactions hook.
 */
const logger = {
    info: (...args) => console.log('[useCategoryTransactions]', ...args),
    error: (...args) => console.error('[useCategoryTransactions]', ...args),
};

/**
 * Normalizes and optionally filters transactions by category.
 *
 * - Ensures transactionDate is a Date
 * - Ensures amount is a Number
 * - Ensures category is a string (falls back to 'Uncategorized')
 *
 * @function useCategoryTransactions
 * @param {Array} transactions - Raw transactions array (may contain personal/joint)
 * @param {string|null} category - If provided, only returns transactions that match the category
 * @returns {Array} Normalized & optionally filtered transactions sorted asc by date
 */
export default function useCategoryTransactions(transactions = [], category = null) {
    return useMemo(() => {
        try {
            logger.info('initializing with input', { count: Array.isArray(transactions) ? transactions.length : 0, category });
            if (!Array.isArray(transactions)) {
                logger.info('received non-array transactions, returning empty array');
                return [];
            }

            const normalized = transactions
                .map((t) => {
                    if (!t) return null;
                    // defensive normalization
                    const date = t.transactionDate ? new Date(t.transactionDate) : null;
                    const validDate = date instanceof Date && !isNaN(date) ? date : null;
                    const amount = typeof t.amount === 'number' ? t.amount : Number(t.amount || 0);
                    const categoryName = t.category ? String(t.category) : 'Uncategorized';

                    return {
                        ...t,
                        transactionDate: validDate,
                        amount: isNaN(amount) ? 0 : amount,
                        category: categoryName,
                    };
                })
                .filter(Boolean)
                // remove entries without a valid date — weekly bucketing relies on dates
                .filter((t) => t.transactionDate)
                .sort((a, b) => a.transactionDate - b.transactionDate); // ascending order

            if (category) {
                const filtered = normalized.filter((t) => t.category === category);
                logger.info('normalized & filtered transactions', {
                    inputCount: transactions.length,
                    normalizedCount: normalized.length,
                    filteredCount: filtered.length,
                    category,
                });
                return filtered;
            }

            logger.info('normalized transactions', {
                inputCount: transactions.length,
                normalizedCount: normalized.length,
            });
            return normalized;
        } catch (err) {
            logger.error('normalization error', err);
            return [];
        }
    }, [transactions, category]);
}