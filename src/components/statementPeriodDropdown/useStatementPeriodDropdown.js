import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import localCacheService from "../../services/LocalCacheService";
import { generateOptions, getCurrentOption } from "../../services/StatementPeriodService";

const logger = {
    info: (...args) => console.log('[useStatementPeriodDropdown]', ...args),
    error: (...args) => console.error('[useStatementPeriodDropdown]', ...args),
};

/**
 * useStatementPeriodDropdown.
 * Manages statement period dropdown logic, including options generation,
 * server cache integration, optimistic updates, keyboard navigation,
 * and outside click handling.
 *
 * @function useStatementPeriodDropdown
 * @param {object} [params]
 * @param {number} [params.prev=1] - Months before anchor.
 * @param {number} [params.forward=5] - Months after anchor.
 * @param {function} [params.onChange=null] - Callback after period change.
 * @param {Date} [params.anchor=new Date()] - Anchor date for generating periods.
 * @returns {object} Dropdown state/actions for UI consumption.
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
        logger.info('Dropdown mounted');
        return () => {
            mountedRef.current = false;
            logger.info('Dropdown unmounted');
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        /**
         * Initializes dropdown by fetching server-stored value.
         * Applies server value or falls back to default.
         */
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
                logger.info('init: no server value found; using generated default', { default: defaultOpt && defaultOpt.value });
                if (defaultOpt) setSelectedValue(defaultOpt.value);
            } catch (err) {
                logger.error('init: failed to read server cache; using generated default', err);
                if (defaultOpt) setSelectedValue(defaultOpt.value);
            }
        }
        void init();
        return () => { mounted = false; };
    }, [defaultOpt]);

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
     * Persists selected period to server cache.
     * Handles optimistic UI and revert on errors.
     *
     * @async
     * @function persistSelection
     * @param {string} key
     * @param {string} newValue
     * @param {string} revertValue
     * @param {number} requestId
     * @returns {Promise<object>} Result object: ok, result, err
     */
    const persistSelection = useCallback(
        async (key, newValue, revertValue, requestId) => {
            if (!mountedRef.current) return { ok: false, err: new Error('unmounted') };
            setIsSaving(true);
            logger.info('persistSelection:start', { key, newValue, requestId });
            try {
                const result = await localCacheService.set(key, newValue);
                logger.info('persistSelection:success', { key, newValue, requestId, result });
                if (lastRequestIdRef.current === requestId && mountedRef.current) setIsSaving(false);
                if (typeof onChange === 'function') {
                    try { onChange(newValue); } catch (err) { logger.error('onChange threw after persist', err); }
                }
                return { ok: true, result };
            } catch (err) {
                logger.error('persistSelection:failed', { key, newValue, requestId, err });
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

    /**
     * Handles user selection of a statement period.
     * Optimistically updates UI and persists the selection.
     *
     * @function handleSelect
     * @param {string} value
     */
    const handleSelect = useCallback(
        (value) => {
            if (isSaving) {
                logger.info('handleSelect: selection ignored while saving', { value });
                return;
            }
            const prev = selectedValue;
            setSelectedValue(value);
            setIsOpen(false);
            logger.info('userSelect: optimistic update', { oldValue: prev, newValue: value });

            const requestId = ++lastRequestIdRef.current;
            void persistSelection('currentStatementPeriod', value, prev, requestId);
        },
        [selectedValue, isSaving, persistSelection]
    );

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
            handleSelect(value);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    }, [handleSelect]);

    /**
     * Returns label for selected value.
     * @function selectedLabel
     * @returns {string}
     */
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