/**
 * useSmartSelect.js
 *
 * Hook that encapsulates SmartSelect behaviour (query, suggestions, keyboard navigation,
 * selection application and blur handling) so the SmartSelect component can remain
 * a small presentational component that consumes this hook.
 *
 * Usage (example):
 *  const smart = useSmartSelect({
 *    name: 'category',
 *    value,
 *    allOptions,
 *    onChange: (v) => updateDraft(v),
 *    onSelectImmediate: async (v) => await saveField(v),
 *    getMappedDefault,
 *    applyMappedDefault,
 *  });
 *
 *  // In component:
 *  <input ref={smart.internalRef} value={smart.query} onChange={smart.handleInputChange} ... />
 *  // render suggestions with smart.suggestions, smart.highlightIndex, smart.handleSuggestionMouseDown
 *
 * Principles:
 * - Keep side-effects local and testable.
 * - Expose only primitives and handlers (no JSX).
 * - Use callbacks and refs to keep stable identities for consumers.
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
 * useSmartSelect options
 * @typedef {Object} UseSmartSelectOptions
 * @property {string} name
 * @property {'dropdown'|'autocomplete'} [mode]
 * @property {string[]} [options]
 * @property {string[]} [allOptions]
 * @property {string} [value]
 * @property {(val:string)=>void} [onChange]
 * @property {(val:string)=>Promise<void>|void} [onSelectImmediate]
 * @property {React.RefObject} [inputRef]
 * @property {(ev:Event)=>void} [onBlur]
 * @property {(val:string)=>any} [getMappedDefault]
 * @property {(mapped)=>any} [applyMappedDefault]
 * @property {number} [maxSuggestions]
 * @property {number} [blurDelayMs]
 */

/**
 * Hook implementation
 * @param {UseSmartSelectOptions} opts
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

    // On mount: if value empty and there's a mapper, try to derive & apply a mapped default
    useEffect(() => {
        try {
            if ((value == null || String(value).trim() === "") && typeof getMappedDefault === "function") {
                const derived = getMappedDefault(value);
                if (derived && typeof applyMappedDefault === "function") {
                    logger.info("derived mapped default on mount", { name, derived });
                    applyMappedDefault(derived);
                }
            }
        } catch (err) {
            logger.error("applyMappedDefault on mount failed", err);
        }
    }, []); // run only once on mount

    // Filtering helper (memoization not required; cheap op)
    const filter = useCallback(
        (q) => {
            if (!Array.isArray(allOptions) || allOptions.length === 0) return [];
            if (!q) return allOptions.slice(0, maxSuggestions);
            const lower = String(q).toLowerCase();
            return allOptions.filter((o) => String(o).toLowerCase().includes(lower)).slice(0, maxSuggestions);
        },
        [allOptions, maxSuggestions]
    );

    // Centralized selection application used by click/keyboard/native select
    const applySelection = useCallback(
        async (val) => {
            try {
                logger.info("applySelection", { name, value: val });
                // Controlled onChange (row editing)
                if (typeof onChange === "function") {
                    try {
                        onChange(val);
                    } catch (err) {
                        // do not throw — log and continue to allow onSelectImmediate to run
                        logger.error("onChange handler threw", err);
                    }
                }

                // Field-mode immediate persist
                if (typeof onSelectImmediate === "function") {
                    try {
                        await onSelectImmediate(val);
                    } catch (err) {
                        logger.error("onSelectImmediate failed", err);
                        // rethrow to signal caller if they need it (we swallow below)
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

    // ---- Event handlers exposed to the component ----

    const handleNativeSelectChange = useCallback(
        async (ev) => {
            const val = ev.target.value;
            setQuery(val);
            try {
                await applySelection(val);
            } catch (err) {
                // already logged in applySelection
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
            // Prevent blur before click resolves
            ev.preventDefault();
            applySelection(opt).catch(() => {
                /* errors logged in applySelection */
            });
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
                // native select: let default handler run; optionally handle Escape
                if (ev.key === "Escape") {
                    // nothing special
                }
            }
        },
        [mode, suggestions, highlightIndex, applySelection, query]
    );

    const handleBlur = useCallback(
        (ev) => {
            // small delay to allow suggestion mouse clicks to register
            try {
                if (blurTimerRef.current) {
                    clearTimeout(blurTimerRef.current);
                }
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

    // cleanup pending timers on unmount
    useEffect(() => {
        return () => {
            try {
                if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
            } catch (err) {
                logger.error("cleanup timer failed", err);
            }
        };
    }, []);

    // Expose a small API to allow programmatic control in tests or parents
    return {
        // refs & state
        internalRef,
        query,
        suggestions,
        showSuggestions,
        highlightIndex,

        // setters (for advanced usage)
        setQuery,
        setSuggestions,
        setShowSuggestions,
        setHighlightIndex,

        // core helpers
        filter,
        applySelection,

        // event handlers (bind these to inputs / select / suggestion elements)
        handleNativeSelectChange,
        handleInputChange,
        handleSuggestionMouseDown,
        handleKeyDown,
        handleBlur,

        // meta
        name,
        mode,
        placeholder,
        className: DEFAULT_INPUT_CLASS,
    };
}

export default useSmartSelect;