/**
 * Shared constants and small helpers for the transactionTable feature.
 *
 * Keep this file small and dependency-free. Prefer deriving values from a
 * centralized config (e.g. config/get) in runtime code — constants here are
 * safe defaults and utility helpers that are useful across the feature.
 *
 * Follow Bulletproof React conventions: pure helpers, stable exports, and
 * small responsibilities.
 *
 * NOTE: Additions here should remain pure (no side effects). Use the exported
 * helpers from other modules (hooks / components) to keep logic testable.
 */

const logger = {
    info: (...args) => console.log('[constants]', ...args),
    error: (...args) => console.error('[constants]', ...args),
};

/* ---------- Presentation / UI ---------- */

/**
 * INLINE_ERROR_COLOR
 * - Color used for small inline field validation messages in rows.
 * - Centralized so it can be tuned in one place for consistent UI.
 */
export const INLINE_ERROR_COLOR = '#ff8a8a';

/**
 * SAVING_TEXT_COLOR
 * - Color used for lightweight "Saving…" indicators shown inline in the row controls.
 */
export const SAVING_TEXT_COLOR = '#9be3a7';

/**
 * DEFAULT_INPUT_CLASS
 * - Default CSS classname used for lightweight input theming across the feature.
 * - Components may override by passing a className prop.
 */
export const DEFAULT_INPUT_CLASS = 'tt-input';

/* ---------- Locale / Currency ---------- */

/**
 * DEFAULT_LOCALE
 * - Locale used for date / month name generation when building statement period labels.
 */
export const DEFAULT_LOCALE = 'en-US';

/**
 * DEFAULT_CURRENCY
 * - Currency code used by presentation helpers if needed.
 */
export const DEFAULT_CURRENCY = 'USD';

/* ---------- Criticality & SmartSelect ---------- */

/**
 * DEFAULT_CRITICALITY_OPTIONS
 * - Fallback list of criticality strings used when config doesn't provide them.
 */
export const DEFAULT_CRITICALITY_OPTIONS = ['Essential', 'Nonessential'];

/**
 * DEFAULT_CRITICALITY
 * - Default criticality string (first from DEFAULT_CRITICALITY_OPTIONS).
 */
export const DEFAULT_CRITICALITY = DEFAULT_CRITICALITY_OPTIONS[0];

/**
 * DEFAULT_SMARTSELECT_MODE
 * - Default mode for SmartSelect presentation when callers don't explicitly pass one.
 */
export const DEFAULT_SMARTSELECT_MODE = 'autocomplete';

/* ---------- Statement Period (defaults) ---------- */

/**
 * STATEMENT_PERIOD_CACHE_KEY
 * - Cache key used when reading/writing the server-backed "current statement period".
 * - Keep centralized to avoid string-literal drift.
 */
export const STATEMENT_PERIOD_CACHE_KEY = 'currentStatementPeriod';

/**
 * STATEMENT_PERIOD_LOOKBACK / STATEMENT_PERIOD_FORWARD
 * - Used by statement-period generator to compute the list range (i = -lookback .. +forward).
 */
export const STATEMENT_PERIOD_LOOKBACK = 1;
export const STATEMENT_PERIOD_FORWARD = 5;

/* ---------- Autocomplete / suggestion behaviour ---------- */

/**
 * MAX_AUTOCOMPLETE_SUGGESTIONS
 * - Maximum number of suggestions returned by SmartSelect's filter function.
 */
export const MAX_AUTOCOMPLETE_SUGGESTIONS = 8;

/**
 * BLUR_DELAY_MS
 * - Small delay used on blur handlers to allow suggestion click events to fire
 *   before the suggestion list is hidden.
 */
export const BLUR_DELAY_MS = 120;

/**
 * SUGGESTION_POPUP_ZINDEX / SUGGESTION_POPUP_MAX_HEIGHT
 * - UI tokens for suggestion popup. Kept here to tune centrally and to document intent.
 */
export const SUGGESTION_POPUP_ZINDEX = 2000;
export const SUGGESTION_POPUP_MAX_HEIGHT = 220; // px

/* ---------- Transaction / local row helpers (added) ---------- */

/**
 * TEMP_ID_PREFIX
 * - Prefix used for temporary client-only transaction IDs.
 * - Used consistently across hooks and components to detect & handle local-only rows.
 */
export const TEMP_ID_PREFIX = 'new-';

/**
 * CONFIG_KEYS
 * - Centralized keys used to request values from the config accessor.
 * - Using constants reduces risk of typo-induced bugs and makes auditing easier.
 */
export const CONFIG_KEYS = {
    CRITICALITY_OPTIONS: 'criticalityOptions',
    CATEGORIES: 'categories',
    PAYMENT_METHODS: 'paymentMethods',
};

/**
 * DEFAULT_CATEGORY_FALLBACK
 * - Explicit default for category when categories are not configured.
 */
export const DEFAULT_CATEGORY_FALLBACK = '';

/**
 * INPUT_DATE_LENGTH
 * - Length of YYYY-MM-DD strings used when converting dates to input values.
 * - Centralize the magic number to improve readability and avoid scatter.
 */
export const INPUT_DATE_LENGTH = 10;

/* ---------- Helpers ---------- */

/**
 * normalizeCriticality(val, options = DEFAULT_CRITICALITY_OPTIONS, defaultOption = DEFAULT_CRITICALITY)
 *
 * - Normalizes a user-provided criticality string to one of the configured options.
 * - Case-insensitive match; falls back to the provided defaultOption when no match found.
 * - Useful for validation and for normalizing user input before persistence.
 *
 * @param {string} val - user-supplied string (may be null/undefined)
 * @param {string[]} options - available criticality options (strings)
 * @param {string} defaultOption - fallback option to use
 * @returns {string} - matched option or defaultOption
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
 * toStatementPeriodValue(date = new Date())
 *
 * - Converts a Date instance into the canonical "statement period" object used across the UI.
 * - label: MONTHNAME in ALL CAPS (e.g., OCTOBER)
 * - value: MONTHNAMEALLCAPS + YEAR (e.g., OCTOBER2025)
 *
 * Returns: { label: string, value: string }
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
        // fallback to an ISO-like safe value
        const d = new Date(date);
        const fallback = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        return { label: fallback, value: fallback };
    }
}

/**
 * parseStatementPeriodValue(v)
 *
 * - Parses server-stored statement period strings such as "OCTOBER2025" into { label, year }.
 * - Returns null if parsing is unsuccessful.
 *
 * @param {string} v
 * @returns {{ label: string, year: number } | null}
 */
export function parseStatementPeriodValue(v) {
    try {
        if (!v || typeof v !== 'string') return null;
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
 * generateStatementPeriodOptions(anchor = new Date(), prev = STATEMENT_PERIOD_LOOKBACK, forward = STATEMENT_PERIOD_FORWARD)
 *
 * - Produces the UI list for the statement period dropdown.
 * - Items cover i = -prev .. +forward months relative to anchor (normalized to the first of month).
 * - Each item contains: { label, value, date } so downstream code can use the date directly.
 *
 * @param {Date} anchor - reference date (default: now)
 * @param {number} prev - months to look back (inclusive)
 * @param {number} forward - months to look forward (inclusive)
 * @returns {{ label: string, value: string, date: Date }[]}
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