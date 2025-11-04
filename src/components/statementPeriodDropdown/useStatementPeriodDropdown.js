/**
 * useStatementPeriodDropdown
 * - Controlled dropdown hook for statement periods.
 * - Respects environment-configured prev/forward defaults.
 * - Uses the statement-period query hook (useStatementPeriodsQuery) and falls back
 *   to locally-generated options when server data is absent or errors.
 *
 * Notes:
 * - This file no longer depends on StatementPeriodService; generateOptions and
 *   getCurrentOption are implemented locally to remove the last service import.
 *
 * @module components/statementPeriodDropdown/useStatementPeriodDropdown
 */

import { useMemo, useRef, useState, useCallback } from 'react';
import { useStatementPeriodsQuery } from '../../hooks/useStatementPeriodQuery';

/**
 * Logger for useStatementPeriodDropdown
 * @constant
 */
const logger = {
    info: (...args) => console.log('[useStatementPeriodDropdown]', ...args),
    error: (...args) => console.error('[useStatementPeriodDropdown]', ...args),
};

/**
 * Read integer env var with fallback (local copy to avoid additional imports).
 *
 * @param {string} name
 * @param {number} fallback
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
 * generateOptions
 * - Local implementation that mirrors previous StatementPeriodService.generateOptions
 *
 * @param {Object} params
 * @param {Date} [params.anchor=new Date()]
 * @param {number} [params.prev=1]
 * @param {number} [params.forward=5]
 * @returns {Array<{label:string,value:string,iso:string,offset:number}>}
 */
function generateOptions({ anchor = new Date(), prev = 1, forward = 5 } = {}) {
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
 * getCurrentOption
 * - Local implementation that mirrors previous StatementPeriodService.getCurrentOption
 *
 * @param {Array} options
 * @returns {object|null}
 */
function getCurrentOption(options = []) {
    if (!Array.isArray(options) || options.length === 0) return null;
    return options.find((o) => o.offset === 0) || options[Math.floor(options.length / 2)];
}

/**
 * useStatementPeriodDropdown.
 * Generates dropdown options, manages open/close, saving state, and keyboard logic.
 * Does NOT own selectedValue; expects it to be managed by provider/context.
 *
 * @param {object} [params]
 * @param {number} [params.prev] - override prev months (defaults to env or 1)
 * @param {number} [params.forward] - override forward months (defaults to env or 5)
 * @param {Date} [params.anchor=new Date()]
 * @returns {object} Dropdown state/actions for UI consumption.
 */
export default function useStatementPeriodDropdown({ prev, forward, anchor = new Date() } = {}) {
    // Resolve defaults from env when not provided
    const envPrev = readEnvInt('REACT_APP_STATEMENT_PERIOD_PREV_MONTHS', readEnvInt('STATEMENT_PERIOD_PREV_MONTHS', 1));
    const envForward = readEnvInt('REACT_APP_STATEMENT_PERIOD_FORWARD_MONTHS', readEnvInt('STATEMENT_PERIOD_FORWARD_MONTHS', 5));

    const effectivePrev = typeof prev === 'number' ? prev : envPrev;
    const effectiveForward = typeof forward === 'number' ? forward : envForward;

    // Server-backed normalized options via hook (respects the effective prev/forward)
    // useStatementPeriodsQuery is a named export from hooks/useStatementPeriodQuery
    const {
        options: serverOptions = [],
        defaultOpt: serverDefault = null,
        isLoading: serverLoading = false,
        isError = false,
    } = useStatementPeriodsQuery?.({ prev: effectivePrev, forward: effectiveForward, anchor }) || {};

    // Local fallback (identical to prior behavior)
    const fallbackOptions = useMemo(
        () => generateOptions({ anchor, prev: effectivePrev, forward: effectiveForward }),
        [anchor, effectivePrev, effectiveForward]
    );
    const fallbackDefault = useMemo(() => getCurrentOption(fallbackOptions), [fallbackOptions]);

    // Choose options: prefer server when present (and not empty)
    const options = useMemo(() => {
        if (Array.isArray(serverOptions) && serverOptions.length > 0) return serverOptions;
        return fallbackOptions;
    }, [serverOptions, fallbackOptions]);

    const defaultOpt = serverDefault || fallbackDefault;

    // Only open/close, saving, and UI refs are managed here
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const containerRef = useRef(null);

    /**
     * Toggles dropdown open/closed.
     * @function toggleOpen
     * @param {Event} [ev]
     */
    const toggleOpen = useCallback((ev) => {
        ev?.preventDefault();
        setIsOpen((s) => !s);
        logger.info('toggleOpen called', { isOpen: !isOpen });
    }, [isOpen]);

    /**
     * Handles keyboard events for dropdown button.
     *
     * @function onButtonKeyDown
     * @param {KeyboardEvent} e
     */
    const onButtonKeyDown = useCallback((e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((s) => !s);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    }, []);

    /**
     * Handles keyboard events for dropdown options.
     *
     * @function onOptionKeyDown
     * @param {KeyboardEvent} e
     * @param {string} value
     */
    const onOptionKeyDown = useCallback((e, value) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Consumer should call updateStatementPeriod(value)
            setIsOpen(false);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    }, []);

    /**
     * setSelectedValue
     * Allows provider to update selected value and trigger UI refresh if needed.
     * @param {string} value
     */
    const setSelectedValue = useCallback((value) => {
        // No-op here; provider owns the canonical value
        logger.info('setSelectedValue called (noop in dropdown hook)', { value });
    }, []);

    return {
        options,
        defaultOpt,
        isOpen,
        isSaving,
        isLoading: serverLoading,
        isError,
        containerRef,
        toggleOpen,
        onButtonKeyDown,
        onOptionKeyDown,
        setSelectedValue,
        setIsOpen,
    };
}