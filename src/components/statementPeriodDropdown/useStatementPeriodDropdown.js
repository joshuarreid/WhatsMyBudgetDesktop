


const logger = {
    info: (...args) => console.log('[useStatementPeriodDropdown]', ...args),
    error: (...args) => console.error('[useStatementPeriodDropdown]', ...args),
};

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import localCacheService from "../../services/LocalCacheService";
import {generateOptions, getCurrentOption} from "../../services/StatementPeriodService";

/**
 * useStatementPeriodDropdown
 *
 * Encapsulates the statement-period dropdown logic:
 * - Generates the fallback 7-item list (i = -prev .. +forward)
 * - On mount, reads server-stored cache value via LocalCacheService.get('currentStatementPeriod')
 * - Exposes optimistic select + persist via LocalCacheService.set('currentStatementPeriod', value)
 * - Handles saving state, race safety (request id), keyboard helpers, and outside-click ref
 *
 * Params:
 * - prev (number)         - months before anchor (default 1)
 * - forward (number)      - months after anchor (default 5)
 * - onChange (function)   - optional callback invoked after successful server read on mount and after successful persist
 * - anchor (Date)         - base date (default now) - useful for tests
 *
 * Returns:
 * {
 *   options,
 *   selectedValue,
 *   selectedLabel,
 *   isOpen,
 *   isSaving,
 *   containerRef,
 *   toggleOpen,
 *   handleSelect,
 *   onButtonKeyDown,
 *   onOptionKeyDown,
 *   setSelectedValue,
 *   setIsOpen
 * }
 */
export default function useStatementPeriodDropdown({ prev = 1, forward = 5, onChange = null, anchor = new Date() } = {}) {
    const options = useMemo(() => generateOptions({ anchor, prev, forward }), [anchor, prev, forward]);
    const defaultOpt = useMemo(() => getCurrentOption(options), [options]);

    const [selectedValue, setSelectedValue] = useState(defaultOpt ? defaultOpt.value : '');
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const containerRef = useRef(null);
    const lastRequestIdRef = useRef(0);
    const mountedRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // On mount: read server-stored value and apply it (server authoritative)
    useEffect(() => {
        let mounted = true;
        async function init() {
            logger.info('init: reading currentStatementPeriod from server');
            try {
                const res = await localCacheService.get('currentStatementPeriod');
                const serverValue =
                    res && (res.cacheValue || res.cache_value || res.value || (typeof res === 'string' ? res : null));
                if (!mounted) return;
                if (serverValue) {
                    logger.info('init: server value applied', { serverValue });
                    setSelectedValue(serverValue);
                    if (typeof onChange === 'function') {
                        try { onChange(serverValue); } catch (err) { logger.error('onChange threw during init', err); }
                    }
                    return;
                }
                // fallback to generated default
                logger.info('init: no server value found; using generated default', { default: defaultOpt && defaultOpt.value });
                if (defaultOpt) setSelectedValue(defaultOpt.value);
            } catch (err) {
                logger.error('init: failed to read server cache; using generated default', err);
                if (defaultOpt) setSelectedValue(defaultOpt.value);
            }
        }
        void init();
        return () => { mounted = false; };
    }, [defaultOpt]); // onChange intentionally not included to avoid double-calls on init

    const toggleOpen = useCallback((ev) => {
        ev?.preventDefault();
        setIsOpen((s) => !s);
    }, []);

    const persistSelection = useCallback(
        async (key, newValue, revertValue, requestId) => {
            if (!mountedRef.current) return { ok: false, err: new Error('unmounted') };
            setIsSaving(true);
            logger.info('persistSelection:start', { key, newValue, requestId });
            try {
                const result = await localCacheService.set(key, newValue);
                logger.info('persistSelection:success', { key, newValue, requestId, result });
                // only clear saving if this is the latest request and component still mounted
                if (lastRequestIdRef.current === requestId && mountedRef.current) setIsSaving(false);
                if (typeof onChange === 'function') {
                    try { onChange(newValue); } catch (err) { logger.error('onChange threw after persist', err); }
                }
                return { ok: true, result };
            } catch (err) {
                logger.error('persistSelection:failed', { key, newValue, requestId, err });
                // revert only if this is the latest request and mounted
                if (lastRequestIdRef.current === requestId && mountedRef.current) {
                    setSelectedValue(revertValue);
                    setIsSaving(false);
                    if (typeof onChange === 'function') {
                        try { onChange(revertValue); } catch (cbErr) { logger.error('onChange threw during revert', cbErr); }
                    }
                } else {
                    logger.info('persistSelection: ignored revert because newer request exists', { requestId });
                }
                return { ok: false, err };
            }
        },
        [onChange]
    );

    const handleSelect = useCallback(
        (value) => {
            if (isSaving) {
                logger.info('handleSelect: selection ignored while saving', { value });
                return;
            }
            const prev = selectedValue;
            // optimistic update
            setSelectedValue(value);
            setIsOpen(false);
            logger.info('userSelect: optimistic update', { oldValue: prev, newValue: value });

            const requestId = ++lastRequestIdRef.current;
            // persist in background (fire-and-handle) - returned promise intentionally not awaited here
            void persistSelection('currentStatementPeriod', value, prev, requestId);
        },
        [selectedValue, isSaving, persistSelection]
    );

    const onButtonKeyDown = useCallback((e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((s) => !s);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    }, []);

    const onOptionKeyDown = useCallback((e, value) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSelect(value);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    }, [handleSelect]);

    const selectedLabel = useMemo(() => {
        const found = options.find((o) => o.value === selectedValue);
        return found ? found.label : selectedValue || 'SELECT PERIOD';
    }, [options, selectedValue]);

    return {
        options,
        selectedValue,
        selectedLabel,
        isOpen,
        isSaving,
        containerRef,
        toggleOpen,
        handleSelect,
        onButtonKeyDown,
        onOptionKeyDown,
        setSelectedValue,
        setIsOpen,
    };
}