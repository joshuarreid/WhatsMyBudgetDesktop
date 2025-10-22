import { useMemo } from 'react';
import useCategoryTransactions from './useCategoryTransactions';
import useWeeklyTotals from './useWeeklyTotals';

const logger = {
    info: (...args) => console.log('[useCategoryWeeklyData]', ...args),
    error: (...args) => console.error('[useCategoryWeeklyData]', ...args),
};

/**
 * useCategoryWeeklyData
 *
 * Convenience hook that composes:
 *  - useCategoryTransactions (normalization + category filter)
 *  - useWeeklyTotals (buckets + totals)
 *
 * Accepts the raw transactions array (e.g., personal + joint combined) and a category string.
 *
 * Returns:
 *  {
 *    weeks: Array<{start: Date, end: Date, total: number, count: number}>,
 *    total: number,
 *    start: Date|null,
 *    end: Date|null,
 *    transactionsInCategory: Array // normalized tx used for the calculation
 *  }
 */
export default function useCategoryWeeklyData(allTransactions = [], category = null, options = {}) {
    try {
        const transactionsInCategory = useCategoryTransactions(allTransactions, category);

        const weeklyResult = useWeeklyTotals(allTransactions, {
            category,
            weekLengthDays: options.weekLengthDays ?? 7,
            statementCloseDay: options.statementCloseDay ?? 5,
        });

        // Memoize the composed result shape
        return useMemo(() => {
            const result = {
                weeks: weeklyResult.weeks,
                total: weeklyResult.total,
                start: weeklyResult.start,
                end: weeklyResult.end,
                transactionsInCategory,
            };
            logger.info('useCategoryWeeklyData result', {
                category,
                weeks: result.weeks.length,
                txCount: transactionsInCategory.length,
            });
            return result;
        }, [weeklyResult, transactionsInCategory, category]);
    } catch (err) {
        logger.error('useCategoryWeeklyData error', err);
        return {
            weeks: [],
            total: 0,
            start: null,
            end: null,
            transactionsInCategory: [],
        };
    }
}