/**
 * useSmartSelect.js
 *
 * Hook that encapsulates SmartSelect behaviour (query, suggestions, keyboard navigation,
 * selection application and blur handling) so the SmartSelect component can remain
 * a small presentational component that consumes this hook.
 *
 * Change: removed the mount-time auto-application of mapped defaults. Mapped defaults
 * are now applied only when a user explicitly selects a value (applySelection), which
 * matches the requested behaviour: leave fields blank by default, apply mapping only
 * when user selects a category.
 *
 * @module useSmartSelect
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
    MAX_AUTOCOMPLETE_SUGGESTIONS,
    DEFAULT_SMARTSELECT_MODE,
    BLUR_DELAY_MS,
    DEFAULT_INPUT_CLASS,
} from "../utils/constants";

const logger = {
    info: (...args) => console.log("[useSmartSelect]", ...args),
    error: (...args) => console.error("[useSmartSelect]", ...args),
};

/**
 * useSmartSelect
 *
 * @param {Object} opts
 * @param {string} opts.name
 * @param {'dropdown'|'autocomplete'} [opts.mode]
 * @param {string[]} [opts.options]
 * @param {string[]} [opts.allOptions]
 * @param {string} [opts.value]
 * @param {(val:string)=>void} [opts.onChange]
 * @param {(val:string)=>Promise<void>|void} [opts.onSelectImmediate]
 * @param {React.RefObject} [opts.inputRef]
 * @param {(ev:Event)=>void} [opts.onBlur]
 * @param {string} [opts.placeholder]
 * @param {(val:string)=>any} [opts.getMappedDefault]
 * @param {(mapped)=>any} [opts.applyMappedDefault]
 * @param {number} [opts.maxSuggestions]
 * @param {number} [opts.blurDelayMs]
 * @returns {Object} API consumed by SmartSelect component
 */
export function useSmartSelect(opts = {}) {
    const {
        name,
        mode = DEFAULT_SMARTSELECT_MODE,
        options = [],
        allOptions = options,
        value = "",
        onChange = () => {},
        onSelectImmediate = null,
        inputRef = null,
        onBlur = () => {},
        placeholder = "",
        getMappedDefault = null,
        applyMappedDefault = null,
        maxSuggestions = MAX_AUTOCOMPLETE_SUGGESTIONS,
        blurDelayMs = BLUR_DELAY_MS,
    } = opts;

    const internalRef = inputRef || useRef(null);
    const [query, setQuery] = useState(String(value ?? ""));
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);

    // Used to cancel pending blur timers on unmount
    const blurTimerRef = useRef(null);

    // Keep query synced to external value changes (controlled usage)
    useEffect(() => {
        try {
            setQuery(String(value ?? ""));
        } catch (err) {
            logger.error("sync value -> query failed", err);
        }
    }, [value]);

    // NOTE:
    // We intentionally DO NOT auto-apply mapped defaults on mount when value is empty.
    // This prevents fields like "criticality" from being filled without explicit user action.
    // Mapped defaults will be applied only via applySelection when the user selects a value.

    /**
     * filter
     * @param {string} q
     * @returns {string[]}
     */
    const filter = useCallback(
        (q) => {
            if (!Array.isArray(allOptions) || allOptions.length === 0) return [];
            if (!q) return allOptions.slice(0, maxSuggestions);
            const lower = String(q).toLowerCase();
            return allOptions.filter((o) => String(o).toLowerCase().includes(lower)).slice(0, maxSuggestions);
        },
        [allOptions, maxSuggestions]
    );

    /**
     * applySelection
     * - Invoked when the user selects a suggestion or presses Enter.
     *
     * @param {string} val
     */
    const applySelection = useCallback(
        async (val) => {
            try {
                logger.info("applySelection", { name, value: val });
                // Controlled onChange (row editing)
                if (typeof onChange === "function") {
                    try {
                        onChange(val);
                    } catch (err) {
                        logger.error("onChange handler threw", err);
                    }
                }

                // Field-mode immediate persist
                if (typeof onSelectImmediate === "function") {
                    try {
                        await onSelectImmediate(val);
                    } catch (err) {
                        logger.error("onSelectImmediate failed", err);
                        throw err;
                    }
                }

                // Apply mapped default if present (category -> criticality etc)
                if (typeof getMappedDefault === "function") {
                    const mapped = getMappedDefault(val);
                    if (mapped != null && typeof applyMappedDefault === "function") {
                        try {
                            applyMappedDefault(mapped);
                        } catch (err) {
                            logger.error("applyMappedDefault failed", err);
                        }
                    }
                }
            } catch (err) {
                logger.error("applySelection failed", err);
                throw err;
            } finally {
                try {
                    internalRef?.current?.focus?.();
                } catch (err) {
                    logger.error("focus after applySelection failed", err);
                }
                setShowSuggestions(false);
                setHighlightIndex(-1);
            }
        },
        [name, onChange, onSelectImmediate, getMappedDefault, applyMappedDefault, internalRef]
    );

    const handleNativeSelectChange = useCallback(
        async (ev) => {
            const val = ev.target.value;
            setQuery(val);
            try {
                await applySelection(val);
            } catch (err) {
                // logged above
            }
        },
        [applySelection]
    );

    const handleInputChange = useCallback(
        (ev) => {
            const v = ev.target.value;
            setQuery(v);
            setSuggestions(filter(v));
            setShowSuggestions(true);
            setHighlightIndex(-1);
        },
        [filter]
    );

    const handleSuggestionMouseDown = useCallback(
        (ev, opt) => {
            ev.preventDefault();
            applySelection(opt).catch(() => {});
        },
        [applySelection]
    );

    const handleKeyDown = useCallback(
        async (ev) => {
            if (mode === "autocomplete") {
                if (ev.key === "ArrowDown") {
                    ev.preventDefault();
                    setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
                    return;
                }
                if (ev.key === "ArrowUp") {
                    ev.preventDefault();
                    setHighlightIndex((i) => Math.max(i - 1, 0));
                    return;
                }
                if (ev.key === "Enter") {
                    ev.preventDefault();
                    if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
                        await applySelection(suggestions[highlightIndex]);
                    } else {
                        await applySelection(query);
                    }
                    return;
                }
                if (ev.key === "Escape") {
                    setShowSuggestions(false);
                    setHighlightIndex(-1);
                    return;
                }
            } else {
                if (ev.key === "Escape") {
                    // nothing special
                }
            }
        },
        [mode, suggestions, highlightIndex, applySelection, query]
    );

    const handleBlur = useCallback(
        (ev) => {
            try {
                if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                blurTimerRef.current = setTimeout(() => {
                    setShowSuggestions(false);
                    setHighlightIndex(-1);
                    try {
                        if (typeof onBlur === "function") onBlur(ev);
                    } catch (err) {
                        logger.error("onBlur handler failed", err);
                    }
                }, blurDelayMs);
            } catch (err) {
                logger.error("handleBlur failed", err);
            }
        },
        [onBlur, blurDelayMs]
    );

    useEffect(() => {
        return () => {
            try {
                if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
            } catch (err) {
                logger.error("cleanup timer failed", err);
            }
        };
    }, []);

    return {
        internalRef,
        query,
        suggestions,
        showSuggestions,
        highlightIndex,
        setQuery,
        setSuggestions,
        setShowSuggestions,
        setHighlightIndex,
        filter,
        applySelection,
        handleNativeSelectChange,
        handleInputChange,
        handleSuggestionMouseDown,
        handleKeyDown,
        handleBlur,
        name,
        mode,
        placeholder,
        className: DEFAULT_INPUT_CLASS,
    };
}

export default useSmartSelect;