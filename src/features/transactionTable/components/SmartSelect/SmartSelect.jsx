/**
 * SmartSelect.jsx
 *
 * Presentational wrapper that delegates behavior to the useSmartSelect hook.
 * Uses a local CSS module for suggestion popup styles (migrated from global styles).
 *
 * Accessibility improvements:
 * - options receive stable ids so the input can set aria-activedescendant when an item is highlighted.
 *
 * Notes:
 * - Input keeps using DEFAULT_INPUT_CLASS (global) for now for incremental migration.
 * - The suggestion popup uses scoped module classes to avoid global collisions.
 */

import React from "react";
import PropTypes from "prop-types";
import useSmartSelect from "../../hooks/useSmartSelect";
import { DEFAULT_INPUT_CLASS } from "../../utils/constants";
import styles from "./SmartSelect.module.css";

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

    // Merge global input class with optional module override so styling is incremental-safe
    const finalInputClass = `${inputClass} ${styles.input ?? ""}`.trim();

    // Defensive id base for option ids (used for aria-activedescendant)
    const idBase = id || `${name || "smartselect"}-ss`;

    // Dropdown (native select) mode
    if (smart.mode === "dropdown" && Array.isArray(options) && options.length > 0) {
        // Ensure the current value is present in the options list. If it isn't,
        // inject it (without mutating the original options array) so the native
        // select shows the correct selected value instead of the blank placeholder.
        let finalOptions = Array.isArray(options) ? [...options] : [];

        try {
            // Only inject when value is non-empty and not already included.
            const normalizedValue = value == null ? "" : String(value);
            const hasValue = finalOptions.some((opt) => String(opt) === normalizedValue);
            if (normalizedValue !== "" && !hasValue) {
                logger.info("SmartSelect: injecting missing option into dropdown options", { name, value: normalizedValue });
                // Prepend so it's visible at top; you could also append if preferred
                finalOptions = [normalizedValue, ...finalOptions];
            }
        } catch (err) {
            logger.error("SmartSelect: failed to normalize/inspect options", err);
        }

        return (
            <select
                id={id}
                name={name}
                className={finalInputClass}
                value={value ?? ""}
                onChange={smart.handleNativeSelectChange}
                onKeyDown={smart.handleKeyDown}
                onBlur={smart.handleBlur}
                disabled={disabled}
                aria-label={ariaLabel}
            >
                <option value="">{/* allow empty */}</option>
                {finalOptions.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        );
    }

    // Autocomplete textbox + suggestions (visuals handled by CSS module)
    // Keep position:relative inline as a defensive fallback in case consumer forgets to import CSS
    return (
        <div className={styles.container} style={{ position: "relative" }}>
            <input
                id={id}
                name={name}
                ref={smart.internalRef}
                className={finalInputClass}
                value={smart.query}
                onChange={smart.handleInputChange}
                onKeyDown={smart.handleKeyDown}
                onBlur={smart.handleBlur}
                placeholder={placeholder}
                disabled={disabled}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={smart.showSuggestions ? "true" : "false"}
                aria-activedescendant={
                    smart.highlightIndex >= 0 ? `${idBase}-opt-${smart.highlightIndex}` : undefined
                }
                autoComplete="off"
            />
            {smart.showSuggestions && smart.suggestions && smart.suggestions.length > 0 && (
                <div
                    role="listbox"
                    aria-label={`${name} suggestions`}
                    className={styles.suggestions}
                >
                    {smart.suggestions.map((opt, idx) => {
                        const optId = `${idBase}-opt-${idx}`;
                        const isHighlighted = idx === smart.highlightIndex;
                        return (
                            <div
                                key={opt}
                                id={optId}
                                role="option"
                                aria-selected={isHighlighted}
                                onMouseDown={(ev) => smart.handleSuggestionMouseDown(ev, opt)}
                                onMouseEnter={() => smart.setHighlightIndex(idx)}
                                className={`${styles.option} ${isHighlighted ? styles.optionHighlighted : ""}`}
                            >
                                {opt}
                            </div>
                        );
                    })}
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