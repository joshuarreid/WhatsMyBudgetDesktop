/**
 * SmartSelect.jsx
 *
 * Reusable select / autocomplete used for Category / Account / Payment inputs.
 *
 * This version removes inline styles and uses CSS class names.
 * The visual styles for the suggestion popup / option items are moved to
 * the feature master stylesheet (TransactionTable.css).
 *
 * Follow Bulletproof React conventions: logic in hooks, UI in components,
 * robust logging and small, testable functions.
 */

import React, { useEffect, useRef, useState } from "react";
import {
    MAX_AUTOCOMPLETE_SUGGESTIONS,
    DEFAULT_SMARTSELECT_MODE,
    BLUR_DELAY_MS,
    DEFAULT_INPUT_CLASS,
} from "../utils/constants";

const logger = {
    info: (...args) => console.log("[SmartSelect]", ...args),
    error: (...args) => console.error("[SmartSelect]", ...args),
};

export default function SmartSelect({
                                        name,
                                        mode = DEFAULT_SMARTSELECT_MODE, // 'dropdown' | 'autocomplete'
                                        options = [],
                                        allOptions = options, // alias: used for autocomplete filtering
                                        value = "",
                                        onChange = () => {}, // called for controlled updates (row draft mode)
                                        onSelectImmediate = null, // async fn(value) used for field-mode saving
                                        inputRef = null,
                                        onBlur = () => {},
                                        placeholder = "",
                                        className = DEFAULT_INPUT_CLASS,
                                        getMappedDefault = null, // fn(value) => mappedValue (e.g., criticality or paymentMethod)
                                        applyMappedDefault = null, // fn(mappedValue) => apply (updateDraft or onSaveEdit)
                                        disabled = false,
                                        ariaLabel = undefined,
                                        id = undefined,
                                    }) {
    const internalRef = inputRef || useRef(null);
    const [query, setQuery] = useState(String(value ?? ""));
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);

    useEffect(() => {
        // keep query in sync when value prop changes externally (e.g. draft updates)
        setQuery(String(value ?? ""));
    }, [value]);

    useEffect(() => {
        // if value is empty and a mapper exists, try to derive a mapped default
        try {
            if ((value == null || String(value).trim() === "") && typeof getMappedDefault === "function") {
                const derived = getMappedDefault(value);
                if (derived && typeof applyMappedDefault === "function") {
                    logger.info("derived mapped default on mount", { name, derived });
                    applyMappedDefault(derived);
                }
            }
        } catch (err) {
            logger.error("failed to apply mapped default on mount", err);
        }
    }, []); // run once on mount

    const filter = (q) => {
        if (!Array.isArray(allOptions) || allOptions.length === 0) return [];
        if (!q) return allOptions.slice(0, MAX_AUTOCOMPLETE_SUGGESTIONS);
        const lower = String(q).toLowerCase();
        return allOptions
            .filter((o) => String(o).toLowerCase().includes(lower))
            .slice(0, MAX_AUTOCOMPLETE_SUGGESTIONS);
    };

    const applySelection = async (val) => {
        try {
            logger.info("applySelection", { name, value: val });
            // If parent expects controlled onChange (row editing), call it
            if (typeof onChange === "function") {
                onChange(val);
            }
            // If immediate persist is required (field editing), call that handler too
            if (typeof onSelectImmediate === "function") {
                // Allow callers to handle persistence & mapping (they may be async)
                await onSelectImmediate(val);
            }
            // Apply any mapped default (for example mapping category -> criticality)
            if (typeof getMappedDefault === "function") {
                const mapped = getMappedDefault(val);
                if (mapped != null && typeof applyMappedDefault === "function") {
                    applyMappedDefault(mapped);
                }
            }
        } catch (err) {
            logger.error("applySelection failed", err);
        } finally {
            // keep focus on input for quick multi-select flows
            try {
                internalRef?.current?.focus?.();
            } catch (err) {
                logger.error("focus after selection failed", err);
            }
            setShowSuggestions(false);
            setHighlightIndex(-1);
        }
    };

    // ---- Handlers ----
    const handleNativeSelectChange = async (ev) => {
        const val = ev.target.value;
        setQuery(val);
        // For native select we typically want to either update draft (row) or persist immediately
        await applySelection(val);
    };

    const handleInputChange = (ev) => {
        const v = ev.target.value;
        setQuery(v);
        setSuggestions(filter(v));
        setShowSuggestions(true);
        setHighlightIndex(-1);
    };

    const handleSuggestionMouseDown = (ev, opt) => {
        // Prevent blur before click resolves
        ev.preventDefault();
        applySelection(opt);
    };

    const handleKeyDown = async (ev) => {
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
                    // commit typed text
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
            // native select: let default handler run
            if (ev.key === "Escape") {
                // nothing special
            }
        }
    };

    const handleBlur = (ev) => {
        // small delay to allow mouse click handlers on suggestions to run
        setTimeout(() => {
            setShowSuggestions(false);
            setHighlightIndex(-1);
            try {
                if (typeof onBlur === "function") onBlur(ev);
            } catch (err) {
                logger.error("onBlur handler failed", err);
            }
        }, BLUR_DELAY_MS);
    };

    // ---- Render ----
    if (mode === "dropdown" && Array.isArray(options) && options.length > 0) {
        return (
            <select
                id={id}
                name={name}
                className={className}
                value={value ?? ""}
                onChange={handleNativeSelectChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                disabled={disabled}
                aria-label={ariaLabel}
            >
                <option value="">{/* allow empty */}</option>
                {options.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        );
    }

    // autocomplete textbox + suggestions (visuals handled by CSS classes in master stylesheet)
    return (
        <div className="tt-ss-container" style={{ position: "relative" }}>
            <input
                id={id}
                name={name}
                ref={internalRef}
                className={className}
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                placeholder={placeholder}
                disabled={disabled}
                aria-label={ariaLabel}
                autoComplete="off"
            />
            {showSuggestions && suggestions && suggestions.length > 0 && (
                <div
                    role="listbox"
                    aria-label={`${name} suggestions`}
                    className="tt-ss-suggestions"
                >
                    {suggestions.map((opt, idx) => (
                        <div
                            key={opt}
                            role="option"
                            aria-selected={idx === highlightIndex}
                            onMouseDown={(ev) => handleSuggestionMouseDown(ev, opt)}
                            onMouseEnter={() => setHighlightIndex(idx)}
                            className={`tt-ss-option${idx === highlightIndex ? " tt-ss-option-highlight" : ""}`}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}