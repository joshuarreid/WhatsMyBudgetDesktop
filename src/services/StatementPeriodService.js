const logger = {
    info: (...args) => console.log('[StatementPeriodService]', ...args),
    error: (...args) => console.error('[StatementPeriodService]', ...args),
};

/**
 * generateOptions
 * Produces options for i = -prev .. +forward months relative to anchor date.
 * Each option: { label: 'OCTOBER', value: 'OCTOBER2025', iso: ISOStringForMonthStart, offset: number }
 */
export function generateOptions({ anchor = new Date(), prev = 1, forward = 5 } = {}) {
    try {
        const options = [];
        for (let i = -prev; i <= forward; i += 1) {
            const d = new Date(anchor.getTime());
            d.setMonth(d.getMonth() + i, 1); // stable first-of-month
            const monthName = d.toLocaleString('en-US', { month: 'long' }).toUpperCase();
            const year = d.getFullYear();
            const label = monthName;
            const value = `${monthName}${year}`;
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
 * getCurrentOption - returns the option with offset 0 if present, otherwise middle option
 */
export function getCurrentOption(options) {
    if (!Array.isArray(options) || options.length === 0) return null;
    return options.find((o) => o.offset === 0) || options[Math.floor(options.length / 2)];
}

export default {
    generateOptions,
    getCurrentOption,
};