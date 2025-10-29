import { useMemo } from 'react';
import { useBudgetTransactionsForAccount } from './useBudgetTransactionsForAccount';
import useCategoryWeeklyData from './useCategoryWeeklyData';

/**
 * Logger for useBudgetCategoryWeeklyModalData hook.
 */
const logger = {
    info: (...args) => console.log('[useBudgetCategoryWeeklyModalData]', ...args),
    error: (...args) => console.error('[useBudgetCategoryWeeklyModalData]', ...args),
};

/**
 * Prepares weekly breakdown data using budget transactions only.
 *
 * @function useBudgetCategoryWeeklyModalData
 * @param {Object} params
 * @param {Object} params.filters - Filters for account, statementPeriod, etc.
 * @param {string|null} params.category - Category filter
 * @param {Object} params.options - Options for weekly calculation
 * @param {string} params.account - Account identifier
 * @returns {Object} Modal data for weekly breakdown
 */
export default function useBudgetCategoryWeeklyModalData({ filters, category, options = {}, account }) {
    const { transactions, total, loading, error } = useBudgetTransactionsForAccount(filters);

    logger.info('initializing with params', { category, options, account, txCount: Array.isArray(transactions) ? transactions.length : 0 });

    const weeklyData = useCategoryWeeklyData(transactions, category, options);

    const filtersForTable = useMemo(() => {
        const filtersTable = {
            account,
            category: category || undefined,
            weekStart: weeklyData.start ?? undefined,
            weekEnd: weeklyData.end ?? undefined,
            startDate: weeklyData.start ?? undefined,
            endDate: weeklyData.end ?? undefined,
        };
        logger.info('computed filtersForTable', filtersTable);
        return filtersTable;
    }, [account, category, weeklyData.start, weeklyData.end]);

    const weeksForAverage = useMemo(() => {
        if (weeklyData.weeks.length > 0 && weeklyData.weeks[weeklyData.weeks.length - 1].total === 0) {
            logger.info('excluding last week with zero total from average calculation');
            return weeklyData.weeks.slice(0, -1);
        }
        return weeklyData.weeks;
    }, [weeklyData.weeks]);

    const weeklyAverage = useMemo(() => {
        const avg = weeksForAverage.length > 0 ? weeklyData.total / weeksForAverage.length : 0;
        logger.info('computed weeklyAverage', { weeklyAverage: avg, total: weeklyData.total, weekCount: weeksForAverage.length });
        return avg;
    }, [weeksForAverage, weeklyData.total]);

    return {
        weeks: weeklyData.weeks,
        total: weeklyData.total,
        start: weeklyData.start,
        end: weeklyData.end,
        transactionsInCategory: weeklyData.transactionsInCategory,
        filtersForTable,
        weeklyAverage,
        loading,
        error,
    };
}