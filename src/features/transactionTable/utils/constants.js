/**
 * Shared constants and small helpers for the transactionTable feature.
 *
 * Keep this file small and dependency-free. Prefer deriving values from a
 * centralized config (e.g. config/get) in runtime code — constants here are
 * safe defaults and utility helpers that are useful across the feature.
 *
 * Follow Bulletproof React conventions: pure helpers, stable exports, and
 * small responsibilities.
 */

const logger = {
    info: (...args) => console.log('[constants]', ...args),
    error: (...args) => console.error('[constants]', ...args),
};

/* ---------- Defaults ---------- */

// Criticality options fallback (use configuration where possible)
export const DEFAULT_CRITICALITY_OPTIONS = ['Essential', 'Nonessential'];
export const DEFAULT_CRITICALITY = DEFAULT_CRITICALITY_OPTIONS[0];

// Statement period server-backed cache key
export const STATEMENT_PERIOD_CACHE_KEY = 'currentStatementPeriod';

// How many months before/after "now" we generate by default (i = -prev .. +forward)
export const STATEMENT_PERIOD_LOOKBACK = 1;
export const STATEMENT_PERIOD_FORWARD = 5;

// Autocomplete / suggestion behaviour
export const MAX_AUTOCOMPLETE_SUGGESTIONS = 8;

// Presentation defaults
export const DEFAULT_LOCALE = 'en-US';
export const DEFAULT_CURRENCY = 'USD';

/* ---------- Helpers ---------- */

/**
 * Normalizes a criticality value into an exact option from `options`.
 * - Case-insensitive match preferred.
 * - Falls back to defaultOption if no match found.
 *
 * @param {string} val
 * @param {string[]} options
 * @param {string} defaultOption
 * @returns {string}
 */
export function normalizeCriticality(val, options = DEFAULT_CRITICALITY_OPTIONS, defaultOption = DEFAULT_CRITICALITY) {
    try {
        if (val == null) return defaultOption;
        const s = String(val).trim();
        if (s === '') return defaultOption;
        const exact = options.find((o) => String(o).toLowerCase() === s.toLowerCase());
        return exact || defaultOption;
    } catch (err) {
        logger.error('normalizeCriticality failed', err);
        return defaultOption;
    }
}

/**
 * Convert a Date instance to the server value format for statement periods:
 * - label: MONTHNAME in ALL CAPS (e.g., OCTOBER)
 * - value: MONTHNAMEALLCAPS + YEAR (e.g., OCTOBER2025)
 *
 * @param {Date} date
 * @returns {{ label: string, value: string }}
 */
export function toStatementPeriodValue(date = new Date()) {
    try {
        const monthName = date.toLocaleString(DEFAULT_LOCALE, { month: 'long' }).toUpperCase();
        const year = date.getFullYear();
        return {
            label: monthName,
            value: `${monthName}${year}`,
        };
    } catch (err) {
        logger.error('toStatementPeriodValue failed', err);
        // fallback to ISO-like safe value
        const d = new Date(date);
        const fallback = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        return { label: fallback, value: fallback };
    }
}

/**
 * Parse server-stored statement period string (e.g. "OCTOBER2025") into { label, year }.
 * If parsing fails, returns null.
 *
 * @param {string} v
 * @returns {{ label: string, year: number } | null}
 */
export function parseStatementPeriodValue(v) {
    try {
        if (!v || typeof v !== 'string') return null;
        // find trailing year digits
        const m = v.match(/^([A-Z]+)(\d{4})$/i);
        if (!m) return null;
        const label = m[1].toUpperCase();
        const year = Number(m[2]);
        return { label, year };
    } catch (err) {
        logger.error('parseStatementPeriodValue failed', err);
        return null;
    }
}

/**
 * Generate statement period options for UI.
 * Produces an array for i = -prev .. +forward relative to `anchor` (default: now).
 * Each item: { label: 'OCTOBER', value: 'OCTOBER2025', date: Date }
 *
 * @param {Date} anchor
 * @param {number} prev
 * @param {number} forward
 * @returns {{label: string, value: string, date: Date}[]}
 */
export function generateStatementPeriodOptions(anchor = new Date(), prev = STATEMENT_PERIOD_LOOKBACK, forward = STATEMENT_PERIOD_FORWARD) {
    try {
        const list = [];
        const base = new Date(anchor.getFullYear(), anchor.getMonth(), 1); // normalize to first-of-month
        for (let i = -prev; i <= forward; i++) {
            const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
            const { label, value } = toStatementPeriodValue(d);
            list.push({ label, value, date: d });
        }
        return list;
    } catch (err) {
        logger.error('generateStatementPeriodOptions failed', err);
        // return at least current month as fallback
        const cur = toStatementPeriodValue(new Date());
        return [{ label: cur.label, value: cur.value, date: new Date() }];
    }
}

/* ---------- Exports (default) ---------- */

const constants = {
    DEFAULT_CRITICALITY_OPTIONS,
    DEFAULT_CRITICALITY,
    STATEMENT_PERIOD_CACHE_KEY,
    STATEMENT_PERIOD_LOOKBACK,
    STATEMENT_PERIOD_FORWARD,
    MAX_AUTOCOMPLETE_SUGGESTIONS,
    DEFAULT_LOCALE,
    DEFAULT_CURRENCY,
    normalizeCriticality,
    toStatementPeriodValue,
    parseStatementPeriodValue,
    generateStatementPeriodOptions,
};

export default constants;