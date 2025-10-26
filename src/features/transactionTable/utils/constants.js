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

/* ---------- Presentation / UI ---------- */
// Inline error color used for field-level error messages
export const INLINE_ERROR_COLOR = '#ff8a8a';
// Small green used for a saving indicator
export const SAVING_TEXT_COLOR = '#9be3a7';

// Default input classname for lightweight theming/overrides
export const DEFAULT_INPUT_CLASS = 'tt-input';

/* ---------- Locale / Currency ---------- */
export const DEFAULT_LOCALE = 'en-US';
export const DEFAULT_CURRENCY = 'USD';

/* ---------- Criticality & SmartSelect ---------- */
// Criticality options fallback (use configuration where possible)
export const DEFAULT_CRITICALITY_OPTIONS = ['Essential', 'Nonessential'];
export const DEFAULT_CRITICALITY = DEFAULT_CRITICALITY_OPTIONS[0];

// Default SmartSelect mode
export const DEFAULT_SMARTSELECT_MODE = 'autocomplete';

/* ---------- Statement Period (defaults) ---------- */
// Statement period server-backed cache key
export const STATEMENT_PERIOD_CACHE_KEY = 'currentStatementPeriod';
// How many months before/after "now" we generate by default (i = -prev .. +forward)
export const STATEMENT_PERIOD_LOOKBACK = 1;
export const STATEMENT_PERIOD_FORWARD = 5;

/* ---------- Autocomplete / suggestion behaviour ---------- */
export const MAX_AUTOCOMPLETE_SUGGESTIONS = 8;
// Small delay used in blur handlers to allow suggestion clicks to register.
export const BLUR_DELAY_MS = 120;
// Suggestion popup styling defaults (kept here so they can be tuned centrally)
export const SUGGESTION_POPUP_ZINDEX = 2000;
export const SUGGESTION_POPUP_MAX_HEIGHT = 220; // px

/* ---------- Transaction / local row helpers (added) ---------- */
// Prefix used for temporary (client-only) transaction IDs
export const TEMP_ID_PREFIX = 'new-';

// Config keys used with your config module (centralize string keys for easier refactor)
export const CONFIG_KEYS = {
    CRITICALITY_OPTIONS: 'criticalityOptions',
    CATEGORIES: 'categories',
    PAYMENT_METHODS: 'paymentMethods',
};

// Fallback/explicit default category value (if categories not configured)
export const DEFAULT_CATEGORY_FALLBACK = '';

// Length of YYYY-MM-DD date string used in some places (e.g. toInputDate checks)
export const INPUT_DATE_LENGTH = 10;

/* ---------- Helpers ---------- */
/**
 * Normalizes a criticality value into an exact option from `options`.
 * - Case-insensitive match preferred.
 * - Falls back to defaultOption if no match found.
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

/* ---------- Default export (convenience) ---------- */
const constants = {
    INLINE_ERROR_COLOR,
    SAVING_TEXT_COLOR,
    DEFAULT_INPUT_CLASS,
    DEFAULT_LOCALE,
    DEFAULT_CURRENCY,
    DEFAULT_CRITICALITY_OPTIONS,
    DEFAULT_CRITICALITY,
    DEFAULT_SMARTSELECT_MODE,
    STATEMENT_PERIOD_CACHE_KEY,
    STATEMENT_PERIOD_LOOKBACK,
    STATEMENT_PERIOD_FORWARD,
    MAX_AUTOCOMPLETE_SUGGESTIONS,
    BLUR_DELAY_MS,
    SUGGESTION_POPUP_ZINDEX,
    SUGGESTION_POPUP_MAX_HEIGHT,
    TEMP_ID_PREFIX,
    CONFIG_KEYS,
    DEFAULT_CATEGORY_FALLBACK,
    INPUT_DATE_LENGTH,
    normalizeCriticality,
    toStatementPeriodValue,
    parseStatementPeriodValue,
    generateStatementPeriodOptions,
};

export default constants;