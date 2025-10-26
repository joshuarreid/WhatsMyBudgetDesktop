/**
 * SmartSelect.jsx
 *
 * Presentational wrapper that delegates behavior to the useSmartSelect hook.
 * - Keeps visuals (CSS classes) and markup here.
 * - Delegates all state, timers, keyboard handling and selection logic to the hook.
 *
 * This file expects the hook to live at ../hooks/useSmartSelect.js and the
 * visual styles to be available in the master feature stylesheet (TransactionTable.css).
 *
 * Follow Bulletproof React conventions: small presentational component, robust logging,
 * and logic living in a hook (useSmartSelect).
 */

import React from "react";
import PropTypes from "prop-types";
import useSmartSelect from "../hooks/useSmartSelect";
import { DEFAULT_INPUT_CLASS } from "../utils/constants";

const logger = {
    info: (...args) => console.log("[SmartSelect]", ...args),
    error: (...args) => console.error("[SmartSelect]", ...args),
};

export default function SmartSelect({
                                        name,
                                        mode = undefined, // delegate default to hook
                                        options = [],
                                        allOptions = undefined, // delegate default to hook
                                        value = "",
                                        onChange = () => {},
                                        onSelectImmediate = null,
                                        inputRef = null,
                                        onBlur = () => {},
                                        placeholder = "",
                                        className = undefined,
                                        getMappedDefault = null,
                                        applyMappedDefault = null,
                                        disabled = false,
                                        ariaLabel = undefined,
                                        id = undefined,
                                        maxSuggestions = undefined,
                                        blurDelayMs = undefined,
                                    }) {
    // Use the hook to encapsulate behavior
    const smart = useSmartSelect({
        name,
        mode,
        options,
        allOptions,
        value,
        onChange,
        onSelectImmediate,
        inputRef,
        onBlur,
        placeholder,
        getMappedDefault,
        applyMappedDefault,
        maxSuggestions,
        blurDelayMs,
    });

    // Pick final input class: explicit prop -> hook default -> global default
    const inputClass = className ?? smart.className ?? DEFAULT_INPUT_CLASS;

    // Dropdown (native select) mode
    if (smart.mode === "dropdown" && Array.isArray(options) && options.length > 0) {
        return (
            <select
                id={id}
                name={name}
                className={inputClass}
                value={value ?? ""}
                onChange={smart.handleNativeSelectChange}
                onKeyDown={smart.handleKeyDown}
                onBlur={smart.handleBlur}
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

    // Autocomplete textbox + suggestions (visuals handled by CSS)
    // Keep position:relative inline as a defensive fallback in case consumer forgets to import CSS
    return (
        <div className="tt-ss-container" style={{ position: "relative" }}>
            <input
                id={id}
                name={name}
                ref={smart.internalRef}
                className={inputClass}
                value={smart.query}
                onChange={smart.handleInputChange}
                onKeyDown={smart.handleKeyDown}
                onBlur={smart.handleBlur}
                placeholder={placeholder}
                disabled={disabled}
                aria-label={ariaLabel}
                autoComplete="off"
            />
            {smart.showSuggestions && smart.suggestions && smart.suggestions.length > 0 && (
                <div role="listbox" aria-label={`${name} suggestions`} className="tt-ss-suggestions">
                    {smart.suggestions.map((opt, idx) => (
                        <div
                            key={opt}
                            role="option"
                            aria-selected={idx === smart.highlightIndex}
                            onMouseDown={(ev) => smart.handleSuggestionMouseDown(ev, opt)}
                            onMouseEnter={() => smart.setHighlightIndex(idx)}
                            className={`tt-ss-option${idx === smart.highlightIndex ? " tt-ss-option-highlight" : ""}`}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

SmartSelect.propTypes = {
    name: PropTypes.string.isRequired,
    mode: PropTypes.oneOf(["dropdown", "autocomplete"]),
    options: PropTypes.array,
    allOptions: PropTypes.array,
    value: PropTypes.any,
    onChange: PropTypes.func,
    onSelectImmediate: PropTypes.func,
    inputRef: PropTypes.object,
    onBlur: PropTypes.func,
    placeholder: PropTypes.string,
    className: PropTypes.string,
    getMappedDefault: PropTypes.func,
    applyMappedDefault: PropTypes.func,
    disabled: PropTypes.bool,
    ariaLabel: PropTypes.string,
    id: PropTypes.string,
    maxSuggestions: PropTypes.number,
    blurDelayMs: PropTypes.number,
};