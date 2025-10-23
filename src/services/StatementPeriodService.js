const logger = {
    info: (...args) => console.log('[StatementPeriodService]', ...args),
    error: (...args) => console.error('[StatementPeriodService]', ...args),
};

/**
 * generateOptions
 *
 * Produce an array of statement period options relative to `anchor` date:
 * - prev: how many months backward (default 1)
 * - forward: how many months forward (default 5)
 *
 * Each option: { label: 'OCTOBER', value: 'OCTOBER2025', date: ISOStringForMonthStart }
 */
export function generateOptions({ anchor = new Date(), prev = 1, forward = 5 } = {}) {
    try {
        const options = [];
        // i runs -prev .. +forward inclusive
        for (let i = -prev; i <= forward; i += 1) {
            const d = new Date(anchor.getTime());
            d.setMonth(d.getMonth() + i, 1); // set to first of month for stable ISO
            const monthName = d.toLocaleString('en-US', { month: 'long' }).toUpperCase();
            const year = d.getFullYear();
            const label = monthName; // display label
            const value = `${monthName}${year}`; // API value format
            const iso = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
            options.push({ label, value, iso, offset: i });
        }
        logger.info('generateOptions produced', { count: options.length, anchor: anchor.toISOString() });
        return options;
    } catch (err) {
        logger.error('generateOptions failed', err);
        return [];
    }
}

/**
 * getCurrentOption
 *
 * Convenience: return the option representing the current month (offset 0).
 */
export function getCurrentOption(opts) {
    if (!Array.isArray(opts) || opts.length === 0) return null;
    return opts.find((o) => o.offset === 0) || opts[Math.floor(opts.length / 2)];
}

export default {
    generateOptions,
    getCurrentOption,
};