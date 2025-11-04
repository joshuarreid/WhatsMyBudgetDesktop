import { useMemo } from 'react';
import useCategoryTransactions from './useCategoryTransactions';
import useWeeklyTotals from './useWeeklyTotals';

/**
 * Logger for useCategoryWeeklyData hook.
 */
const logger = {
    info: (...args) => console.log('[useCategoryWeeklyData]', ...args),
    error: (...args) => console.error('[useCategoryWeeklyData]', ...args),
};

/**
 * Composes weekly breakdowns of transactions for a given category.
 *
 * - Uses useCategoryTransactions for normalization and filtering.
 * - Uses useWeeklyTotals for bucketing and totals.
 *
 * @function useCategoryWeeklyData
 * @param {Array} allTransactions - Raw transactions array
 * @param {string|null} category - Filter by category
 * @param {Object} options - Additional options for weekly calculation
 * @returns {Object} { weeks, total, start, end, transactionsInCategory }
 */
export default function useCategoryWeeklyData(allTransactions = [], category = null, options = {}) {
    try {
        logger.info('initializing with transactions', { count: Array.isArray(allTransactions) ? allTransactions.length : 0, category, options });
        const transactionsInCategory = useCategoryTransactions(allTransactions, category);

        const weeklyResult = useWeeklyTotals(allTransactions, {
            category,
            weekLengthDays: options.weekLengthDays ?? 7,
            statementCloseDay: options.statementCloseDay ?? 5,
        });

        return useMemo(() => {
            const result = {
                weeks: weeklyResult.weeks,
                total: weeklyResult.total,
                start: weeklyResult.start,
                end: weeklyResult.end,
                transactionsInCategory,
            };
            logger.info('computed weekly data', {
                category,
                weeks: result.weeks.length,
                txCount: transactionsInCategory.length,
                total: result.total,
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