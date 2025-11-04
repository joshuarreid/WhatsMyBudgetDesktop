// Hook extracted to consolidate modal-specific logic for CategoryWeeklyModal.
// Location: same directory as CategoryWeeklyModal.jsx and other hooks.

import { useMemo } from 'react';
import useCategoryWeeklyData from './useCategoryWeeklyData';

const logger = {
    info: (...args) => console.log('[useCategoryWeeklyModalData]', ...args),
    error: (...args) => console.error('[useCategoryWeeklyModalData]', ...args),
};

/**
 * useCategoryWeeklyModalData
 *
 * Encapsulates all data and derived values required by CategoryWeeklyModal so the
 * component can stay presentation-focused.
 *
 * Inputs:
 *  - transactions: Array
 *  - category: string|null
 *  - options: object (forwarded to useCategoryWeeklyData)
 *  - account: string (used to build filters for CompactTransactionTable)
 *
 * Returns:
 *  {
 *    weeks, total, start, end, transactionsInCategory,
 *    filtersForTable, weeklyAverage
 *  }
 *
 * Notes:
 *  - weeklyAverage excludes the last week when its total === 0 (original UX choice).
 *  - filtersForTable mirrors what CompactTransactionTable expects.
 */
export default function useCategoryWeeklyModalData({ transactions = [], category = null, options = {}, account = undefined }) {
    try {
        const {
            weeks = [],
            total = 0,
            start = null,
            end = null,
            transactionsInCategory = [],
        } = useCategoryWeeklyData(transactions, category, options) || {};

        const filtersForTable = useMemo(() => {
            return {
                account, // required by the CompactTransactionTable hook
                category: category || undefined,
                // Use the modal's overall range (start..end) so the table shows transactions for the period
                weekStart: start ?? undefined,
                weekEnd: end ?? undefined,
                startDate: start ?? undefined,
                endDate: end ?? undefined,
            };
        }, [account, category, start, end]);

        const weeksForAverage = useMemo(() => {
            if (weeks.length > 0 && weeks[weeks.length - 1].total === 0) {
                return weeks.slice(0, -1);
            }
            return weeks;
        }, [weeks]);

        const weeklyAverage = useMemo(() => {
            return weeksForAverage.length > 0 ? total / weeksForAverage.length : 0;
        }, [weeksForAverage, total]);

        logger.info('hook result', {
            category,
            weeksCount: weeks.length,
            transactionsCount: transactionsInCategory.length,
            start: start ? start.toISOString().slice(0, 10) : null,
            end: end ? end.toISOString().slice(0, 10) : null,
            hasAccount: Boolean(account),
        });

        return {
            weeks,
            total,
            start,
            end,
            transactionsInCategory,
            filtersForTable,
            weeklyAverage,
        };
    } catch (err) {
        logger.error('failed to compute modal data', err);
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
        };
    }
}