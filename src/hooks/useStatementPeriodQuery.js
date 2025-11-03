/**
 * useStatementPeriodQuery
 * - Hook wrapping TanStack Query to fetch statement periods from the server.
 * - Normalizes server response shapes into dropdown-friendly option objects:
 *   { label, value, iso, offset }
 * - Respects environment configuration for prev/forward defaults:
 *   REACT_APP_STATEMENT_PERIOD_PREV_MONTHS and REACT_APP_STATEMENT_PERIOD_FORWARD_MONTHS
 *
 * Behavior fix:
 * - The final list of options is always derived from the generated fallback window
 *   (prev..forward around the anchor). If the server returns matching period entries,
 *   they are used to enrich/replace the corresponding fallback entries. This preserves
 *   the exact month-window and ordering (prevents showing months outside the configured
 *   prev/forward range).
 *
 * @module hooks/useStatementPeriodQuery
 */

import { useQuery } from '@tanstack/react-query';
import statementPeriodApi from '../api/statementPeriod/statementPeriod';
import statementPeriodQueryKeys from '../api/statementPeriod/statementPeriodQueryKeys';
import { generateOptions, getCurrentOption } from '../services/StatementPeriodService';

/**
 * Logger for useStatementPeriodQuery
 * @constant
 */
const logger = {
    info: (...args) => console.log('[useStatementPeriodQuery]', ...args),
    error: (...args) => console.error('[useStatementPeriodQuery]', ...args),
};

/**
 * Read integer env var with fallback.
 *
 * @param {string} name - environment variable name
 * @param {number} fallback - fallback numeric value
 * @returns {number}
 */
function readEnvInt(name, fallback) {
    try {
        const raw = (typeof process !== 'undefined' && process.env && process.env[name]) ? String(process.env[name]) : undefined;
        if (!raw) return fallback;
        const n = Number.parseInt(raw, 10);
        return Number.isNaN(n) ? fallback : n;
    } catch (err) {
        logger.error('readEnvInt failed for', name, err);
        return fallback;
    }
}

/**
 * Parse a periodName like "NOVEMBER2025" into { monthName, year }.
 *
 * @param {string} periodName
 * @returns {{ monthName: string|null, year: string|null }}
 */
function parsePeriodName(periodName) {
    try {
        if (!periodName || typeof periodName !== 'string') return { monthName: null, year: null };
        const m = String(periodName).trim().match(/^([A-Za-z]+)\s*?(\d{4})$/);
        if (m) return { monthName: m[1].toUpperCase(), year: m[2] };
        // also accept "NOVEMBER2025" (no space)
        const m2 = String(periodName).trim().match(/^([A-Za-z]+)(\d{4})$/);
        if (m2) return { monthName: m2[1].toUpperCase(), year: m2[2] };
        return { monthName: periodName.toUpperCase(), year: null };
    } catch (err) {
        logger.error('parsePeriodName failed', err, periodName);
        return { monthName: null, year: null };
    }
}

/**
 * Create ISO first-of-month from monthName and year when possible.
 *
 * @param {string|null} monthName - e.g. "NOVEMBER"
 * @param {string|null} year - "2025"
 * @returns {string|null} ISO string or null
 */
function makeIsoFromMonthYear(monthName, year) {
    try {
        if (!monthName || !year) return null;
        const candidate = new Date(`${monthName} 1, ${year}`);
        if (Number.isNaN(candidate.getTime())) return null;
        return new Date(candidate.getFullYear(), candidate.getMonth(), 1).toISOString();
    } catch (err) {
        logger.error('makeIsoFromMonthYear failed', err, { monthName, year });
        return null;
    }
}

/**
 * Normalize a server item into { label, value, iso }.
 * Offset is computed separately using the fallback map to ensure it matches the configured window.
 *
 * @param {any} it - server item
 * @returns {{label:string,value:string,iso:string|null}|null}
 */
function normalizeItemShallow(it) {
    try {
        if (!it) return null;

        // If server gives a plain string like "NOVEMBER2025"
        if (typeof it === 'string') {
            const { monthName, year } = parsePeriodName(it);
            const value = String(it);
            const label = monthName || value;
            const iso = makeIsoFromMonthYear(monthName, year);
            return { label, value, iso };
        }

        // If server returns an object with periodName (common shape in your API)
        const periodName = (it.periodName ?? it.period ?? it.value ?? null);
        if (periodName) {
            const { monthName, year } = parsePeriodName(periodName);
            const value = String(periodName);
            const label = monthName || String(periodName);
            const isoFromServer = it.iso ?? it.startDate ?? it.createdAt ?? null;
            const iso = isoFromServer ? (new Date(isoFromServer).toISOString?.() ?? null) : makeIsoFromMonthYear(monthName, year);
            return { label, value, iso };
        }

        // Generic fallback: try label/value properties
        if (it.label && it.value) {
            const label = String(it.label);
            const value = String(it.value);
            const iso = it.iso ?? null;
            return { label, value, iso };
        }

        // Last resort: stringify
        const raw = JSON.stringify(it);
        return { label: raw, value: raw, iso: null };
    } catch (err) {
        logger.error('normalizeItemShallow failed', err, it);
        return null;
    }
}

/**
 * useStatementPeriodQuery
 *
 * - Reads default prev/forward values from env when params not provided:
 *   REACT_APP_STATEMENT_PERIOD_PREV_MONTHS (default 1)
 *   REACT_APP_STATEMENT_PERIOD_FORWARD_MONTHS (default 5)
 *
 * - The final options list is derived from the generated fallback window and
 *   then enriched with server-provided entries that match values in that window.
 *
 * @param {object} [params]
 * @param {number} [params.prev] - prev months to include (if omitted, read from env)
 * @param {number} [params.forward] - forward months to include (if omitted, read from env)
 * @param {Date} [params.anchor=new Date()] - anchor date for generation fallback
 * @returns {{ options: Array, defaultOpt: object|null, isLoading: boolean, isError: boolean, data: any, error: any }}
 */
export function useStatementPeriodQuery({ prev, forward, anchor = new Date() } = {}) {
    // Default to env vars if not explicitly provided
    const defaultPrev = readEnvInt('REACT_APP_STATEMENT_PERIOD_PREV_MONTHS', readEnvInt('STATEMENT_PERIOD_PREV_MONTHS', 1));
    const defaultForward = readEnvInt('REACT_APP_STATEMENT_PERIOD_FORWARD_MONTHS', readEnvInt('STATEMENT_PERIOD_FORWARD_MONTHS', 5));

    const effectivePrev = typeof prev === 'number' ? prev : defaultPrev;
    const effectiveForward = typeof forward === 'number' ? forward : defaultForward;

    const qk = statementPeriodQueryKeys.listKey();

    // Precompute fallback options so we can compute offsets for server items
    const fallbackOptions = generateOptions({ prev: effectivePrev, forward: effectiveForward, anchor });

    // Build a quick map from value -> fallback entry (for ordering and offset)
    const fallbackMap = {};
    fallbackOptions.forEach((o) => {
        fallbackMap[o.value] = o;
    });

    const query = useQuery({
        queryKey: qk,
        queryFn: async () => {
            logger.info('fetchAllStatementPeriods (queryFn) called');
            const res = await statementPeriodApi.fetchAllStatementPeriods();
            return res;
        },
        // conservative defaults
        staleTime: Infinity,
        cacheTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: false,
    });

    // Normalize server data into a map value -> normalized object (without offset)
    const serverNormalizedMap = {};
    try {
        if (Array.isArray(query.data) && query.data.length > 0) {
            query.data.forEach((it) => {
                const norm = normalizeItemShallow(it);
                if (norm && typeof norm.value === 'string') {
                    serverNormalizedMap[norm.value] = norm;
                }
            });
        }
    } catch (err) {
        logger.error('normalizing server options failed', err, query.data);
    }

    // Build final options list by iterating the fallback window and replacing entries
    // with server-enriched versions when available. This preserves ordering and range.
    const options = fallbackOptions.map((fb) => {
        const serverEntry = serverNormalizedMap[fb.value];
        if (serverEntry) {
            return {
                label: serverEntry.label ?? fb.label,
                value: fb.value, // keep canonical value from fallback (should match serverEntry.value)
                iso: serverEntry.iso ?? fb.iso,
                offset: fb.offset,
            };
        }
        return fb;
    });

    // Compute defaultOpt: prefer the fallback's current option (offset === 0) mapped to final options
    const fallbackCurrent = getCurrentOption(fallbackOptions);
    let defaultOpt = null;
    if (fallbackCurrent) {
        defaultOpt = options.find((o) => o.value === fallbackCurrent.value) || options[0] || fallbackCurrent;
    } else {
        defaultOpt = options[0] || null;
    }

    return {
        options,
        defaultOpt,
        isLoading: query.isFetching || query.isPending || false,
        isError: query.isError || false,
        data: query.data,
        error: query.error,
    };
}

export default useStatementPeriodQuery;