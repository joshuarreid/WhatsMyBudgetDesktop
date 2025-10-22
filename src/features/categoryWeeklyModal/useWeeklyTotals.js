import { useMemo } from 'react';

const logger = {
    info: (...args) => console.log('[useWeeklyTotals]', ...args),
    error: (...args) => console.error('[useWeeklyTotals]', ...args),
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * startOfDay: return a Date normalized to local midnight
 */
function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * endOfDay: return a Date at 23:59:59.999 local time
 */
function endOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/**
 * useWeeklyTotals
 *
 * Create weekly buckets and compute totals for a given transactions list and category.
 *
 * Rules:
 * - start date = 1st of month of earliest transaction (across the provided list)
 * - end date = statementCloseDay (default 5) of the month AFTER the latest transaction
 * - week length = weekLengthDays (default 7)
 *
 * @param {Array} allTransactions Normalized transactions (Date in transactionDate, numeric amount)
 * @param {Object} options
 *   - category: string|null (if provided sums only that category; pass null to include all)
 *   - weekLengthDays: number (default 7)
 *   - statementCloseDay: number (day-of-month for statement close, default 5)
 *
 * @returns {{
 *   weeks: Array<{ start: Date, end: Date, total: number, count: number }>,
 *   total: number,
 *   start: Date|null,
 *   end: Date|null
 * }}
 */
export default function useWeeklyTotals(
    allTransactions = [],
    options = {},
) {
    const {
        category = null,
        weekLengthDays = 7,
        statementCloseDay = 5,
    } = options;

    return useMemo(() => {
        try {
            const tx = Array.isArray(allTransactions) ? allTransactions : [];
            if (tx.length === 0) {
                logger.info('no transactions provided');
                return { weeks: [], total: 0, start: null, end: null };
            }

            // Compute earliest and latest transaction dates from the provided transactions
            let earliest = null;
            let latest = null;
            for (const t of tx) {
                if (!t || !t.transactionDate) continue;
                const d = t.transactionDate instanceof Date ? t.transactionDate : new Date(t.transactionDate);
                if (isNaN(d)) continue;
                if (!earliest || d < earliest) earliest = d;
                if (!latest || d > latest) latest = d;
            }

            if (!earliest || !latest) {
                logger.info('no valid dated transactions after normalization');
                return { weeks: [], total: 0, start: null, end: null };
            }

            // start at the 1st of the earliest month (local time)
            const start = new Date(earliest.getFullYear(), earliest.getMonth(), 1, 0, 0, 0, 0);

            // end at the statementCloseDay of the month AFTER latest transaction
            const end = endOfDay(new Date(latest.getFullYear(), latest.getMonth() + 1, statementCloseDay));

            // Pre-filter transactions by category if provided (and ensure they have a date)
            const filteredTx = category
                ? tx.filter((t) => t.category === category && t.transactionDate)
                : tx.filter((t) => t.transactionDate);

            const weeks = [];
            let cursor = start;

            while (cursor <= end) {
                const weekStart = startOfDay(cursor);
                // weekEnd is inclusive: weekLengthDays - 1 full days after start, end at endOfDay
                const rawWeekEnd = new Date(weekStart.getTime() + (weekLengthDays - 1) * MS_PER_DAY);
                const weekEnd = rawWeekEnd > end ? endOfDay(end) : endOfDay(rawWeekEnd);

                // Sum matching transactions inside [weekStart, weekEnd] inclusive
                let total = 0;
                let count = 0;
                for (const t of filteredTx) {
                    const d = t.transactionDate instanceof Date ? t.transactionDate : new Date(t.transactionDate);
                    if (isNaN(d)) continue;
                    if (d >= weekStart && d <= weekEnd) {
                        const amt = typeof t.amount === 'number' ? t.amount : Number(t.amount || 0);
                        total += isNaN(amt) ? 0 : amt;
                        count += 1;
                    }
                }

                weeks.push({
                    start: new Date(weekStart),
                    end: new Date(weekEnd),
                    total,
                    count,
                });

                // advance cursor by weekLengthDays
                cursor = new Date(weekStart.getTime() + weekLengthDays * MS_PER_DAY);
            }

            const totalSum = weeks.reduce((s, w) => s + (w.total || 0), 0);

            logger.info('computed weekly totals', {
                inputTx: tx.length,
                filteredTx: filteredTx.length,
                weeks: weeks.length,
                start: start.toISOString().slice(0, 10),
                end: end.toISOString().slice(0, 10),
                category,
            });

            return { weeks, total: totalSum, start, end };
        } catch (err) {
            logger.error('useWeeklyTotals error', err);
            return { weeks: [], total: 0, start: null, end: null };
        }
    }, [allTransactions, category, weekLengthDays, statementCloseDay]);
}