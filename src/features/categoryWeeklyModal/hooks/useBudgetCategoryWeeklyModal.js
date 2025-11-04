/**
 * useBudgetCategoryWeeklyModal
 *
 * - Replaces legacy useBudgetTransactionsForAccount with the react-query powered
 *   useBudgetTransactionsQuery hook.
 * - Merges personal and joint transactions into a flat list and reuses the existing
 *   useCategoryWeeklyData to compute weekly buckets.
 * - Preserves the public return shape so the consuming modal/component can remain unchanged.
 *
 * @module hooks/useBudgetCategoryWeeklyModal
 */

import { useMemo } from 'react';

import useCategoryWeeklyData from './useCategoryWeeklyData';
import useBudgetTransactionsQuery from "../../../hooks/useBudgetTransactionQuery";

/**
 * Standardized logger for this module.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[useBudgetCategoryWeeklyModalData]', ...args),
    error: (...args) => console.error('[useBudgetCategoryWeeklyModalData]', ...args),
};

/**
 * useBudgetCategoryWeeklyModalData
 *
 * @param {Object} params
 * @param {Object} params.filters - Filters for account, statementPeriod, etc.
 * @param {string|null} params.category - Category filter
 * @param {Object} [params.options={}] - Options for weekly calculation
 * @param {string} [params.account] - Account identifier
 * @returns {{
 *   weeks: Array,
 *   total: number,
 *   start: Date|null,
 *   end: Date|null,
 *   transactionsInCategory: Array,
 *   filtersForTable: Object,
 *   weeklyAverage: number,
 *   loading: boolean,
 *   error: any
 * }}
 */
export default function useBudgetCategoryWeeklyModalData({ filters = {}, category = null, options = {}, account } = {}) {
    try {
        // Build effective filters (prefer explicit account param)
        const effectiveFilters = useMemo(() => {
            const merged = { ...(filters || {}) };
            if (account) merged.account = account;
            logger.info('effectiveFilters computed', merged);
            return merged;
        }, [filters, account]);

        // Use the new react-query powered hook to fetch budget transactions
        const txResult = useBudgetTransactionsQuery(effectiveFilters);

        // Merge personal and joint transactions into flat array (legacy consumers expect flat list)
        const transactions = useMemo(() => {
            try {
                const personal = txResult.personalTransactions?.transactions ?? [];
                const joint = txResult.jointTransactions?.transactions ?? [];
                const merged = [...personal, ...joint];
                logger.info('merged transactions', { personal: personal.length, joint: joint.length, merged: merged.length });
                return merged;
            } catch (err) {
                logger.error('error merging transactions', err);
                return [];
            }
        }, [txResult.personalTransactions, txResult.jointTransactions]);

        logger.info('initializing with params', {
            category,
            options,
            account,
            txCount: Array.isArray(transactions) ? transactions.length : 0,
        });

        // Reuse existing weekly calculation logic
        const weeklyData = useCategoryWeeklyData(transactions, category, options);

        // Filters for the CompactTransactionTable / modal table
        const filtersForTable = useMemo(() => {
            const filtersTable = {
                account: effectiveFilters.account || account,
                category: category || undefined,
                weekStart: weeklyData.start ?? undefined,
                weekEnd: weeklyData.end ?? undefined,
                startDate: weeklyData.start ?? undefined,
                endDate: weeklyData.end ?? undefined,
            };
            logger.info('computed filtersForTable', filtersTable);
            return filtersTable;
        }, [effectiveFilters.account, account, category, weeklyData.start, weeklyData.end]);

        // Exclude last week with zero total from average (preserve prior UX)
        const weeksForAverage = useMemo(() => {
            try {
                if (Array.isArray(weeklyData.weeks) && weeklyData.weeks.length > 0 && weeklyData.weeks[weeklyData.weeks.length - 1].total === 0) {
                    logger.info('excluding last week with zero total from average calculation');
                    return weeklyData.weeks.slice(0, -1);
                }
                return weeklyData.weeks ?? [];
            } catch (err) {
                logger.error('weeksForAverage computation failed', err);
                return weeklyData.weeks ?? [];
            }
        }, [weeklyData.weeks]);

        const weeklyAverage = useMemo(() => {
            try {
                const avg = weeksForAverage.length > 0 ? (weeklyData.total || 0) / weeksForAverage.length : 0;
                logger.info('computed weeklyAverage', { weeklyAverage: avg, total: weeklyData.total, weekCount: weeksForAverage.length });
                return avg;
            } catch (err) {
                logger.error('weeklyAverage computation failed', err);
                return 0;
            }
        }, [weeksForAverage, weeklyData.total]);

        return {
            weeks: weeklyData.weeks,
            total: weeklyData.total,
            start: weeklyData.start,
            end: weeklyData.end,
            transactionsInCategory: weeklyData.transactionsInCategory,
            filtersForTable,
            weeklyAverage,
            loading: txResult.loading || false,
            error: txResult.error ?? null,
        };
    } catch (err) {
        logger.error('useBudgetCategoryWeeklyModalData fatal error', err);
        // Preserve return shape on error
        return {
            weeks: [],
            total: 0,
            start: null,
            end: null,
            transactionsInCategory: [],
            filtersForTable: {
                account,
                category: category || undefined,
            },
            weeklyAverage: 0,
            loading: false,
            error: err,
        };
    }
}