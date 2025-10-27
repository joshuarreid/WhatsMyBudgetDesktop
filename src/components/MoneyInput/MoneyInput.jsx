import React from "react";
import PropTypes from "prop-types";

/**
 * MoneyInput
 *
 * Controlled text input that implements YNAB-like "shift decimal" behavior:
 * - Typing digits (0-9) appends to the cents integer (1 -> 0.01, 12 -> 0.12, 123 -> 1.23)
 * - Backspace removes the last digit (123 -> 12 -> 1 -> 0)
 * - Delete clears to 0
 * - Paste attempts to parse numeric input (decimals allowed)
 *
 * onChange receives a canonical decimal string with 2 fractional digits ("1.23")
 *
 * Bulletproof notes:
 * - Does not mutate props
 * - Keeps an internal integer centsRef for cheap updates
 * - Uses robust logging format from project guidance
 */
const logger = {
    info: (...args) => console.log("[MoneyInput]", ...args),
    error: (...args) => console.error("[MoneyInput]", ...args),
};

function toCentsFromValue(val) {
    // Accept numbers or strings. Return integer cents.
    if (val == null || val === "") return 0;
    // remove grouping commas and whitespace
    const cleaned = String(val).replace(/,/g, "").trim();
    const n = Number(cleaned);
    if (Number.isFinite(n)) return Math.round(n * 100);
    // fallback: try to extract first numeric-like substring
    const m = cleaned.match(/-?\d+(\.\d+)?/);
    return m ? Math.round(Number(m[0]) * 100) : 0;
}

function centsToDisplay(cents) {
    // Return a string like "1.23" or "0.00". Preserve sign.
    const sign = cents < 0 ? "-" : "";
    const a = Math.abs(cents);
    const whole = Math.floor(a / 100);
    const frac = String(a % 100).padStart(2, "0");
    return `${sign}${whole}.${frac}`;
}

export default function MoneyInput({
                                       value, // number or string (decimal)
                                       onChange = () => {},
                                       className = undefined,
                                       autoFocus = false,
                                       disabled = false,
                                       id,
                                       name,
                                       placeholder,
                                       onKeyDown: parentKeyDown,
                                       onBlur: parentOnBlur,
                                   }) {
    const inputRef = React.useRef(null);
    const centsRef = React.useRef(toCentsFromValue(value));
    const [display, setDisplay] = React.useState(() => centsToDisplay(centsRef.current));

    // Keep in sync when value prop changes externally (e.g., switching rows)
    React.useEffect(() => {
        try {
            const newCents = toCentsFromValue(value);
            if (newCents !== centsRef.current) {
                centsRef.current = newCents;
                setDisplay(centsToDisplay(newCents));
                logger.info("synced cents from prop", { value, cents: newCents });
            }
        } catch (err) {
            logger.error("failed to sync prop value to cents", err, value);
        }
    }, [value]);

    const commit = React.useCallback(
        (cents) => {
            centsRef.current = cents;
            const out = centsToDisplay(cents);
            setDisplay(out);
            try {
                // deliver canonical decimal string
                onChange(out);
            } catch (err) {
                logger.error("onChange threw", err);
            }
        },
        [onChange]
    );

    const handleDigit = React.useCallback(
        (digit) => {
            try {
                const d = Number(digit);
                if (!Number.isInteger(d) || d < 0 || d > 9) return;
                // shift-left behaviour: append digit to cents
                const next = Math.trunc(centsRef.current) * 10 + d;
                commit(next);
            } catch (err) {
                logger.error("handleDigit failed", err, digit);
            }
        },
        [commit]
    );

    const handleBackspace = React.useCallback(() => {
        const next = Math.floor(Math.trunc(centsRef.current) / 10);
        commit(next);
    }, [commit]);

    const handleDelete = React.useCallback(() => {
        commit(0);
    }, [commit]);

    const handleKeyDown = React.useCallback(
        (e) => {
            // Let parent have first crack for Enter/Escape navigation etc.
            if (typeof parentKeyDown === "function") {
                try {
                    parentKeyDown(e);
                } catch (err) {
                    logger.error("parentKeyDown threw", err);
                }
            }

            if (e.ctrlKey || e.metaKey || e.altKey) {
                // ignore combos
                return;
            }

            // Numeric keys: '0'..'9'
            if (/^[0-9]$/.test(e.key)) {
                e.preventDefault();
                handleDigit(e.key);
                return;
            }

            if (e.key === "Backspace") {
                e.preventDefault();
                handleBackspace();
                return;
            }

            if (e.key === "Delete") {
                e.preventDefault();
                handleDelete();
                return;
            }

            // Allow navigation/Enter/Escape to bubble normally (parentKeyDown already called).
        },
        [handleDigit, handleBackspace, handleDelete, parentKeyDown]
    );

    const handlePaste = React.useCallback(
        (e) => {
            try {
                e.preventDefault();
                const text = (e.clipboardData && e.clipboardData.getData("text")) || window.clipboardData?.getData?.("text") || "";
                if (!text) return;
                // parse first numeric-looking substring
                const m = String(text).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
                if (!m) return;
                const cents = toCentsFromValue(m[0]);
                commit(cents);
                logger.info("pasted value parsed to cents", { text, cents });
            } catch (err) {
                logger.error("paste handler failed", err);
            }
        },
        [commit]
    );

    const handleInput = React.useCallback(
        (e) => {
            // mobile keyboards or IME may send input events; attempt to parse the value
            try {
                const v = e.target.value;
                // Accept numeric-like strings with optional decimal point
                const m = String(v).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
                if (m) {
                    const cents = toCentsFromValue(m[0]);
                    commit(cents);
                } else if (v.trim() === "") {
                    commit(0);
                } else {
                    // ignore otherwise
                    logger.info("input ignored (non-numeric)", { v });
                }
            } catch (err) {
                logger.error("handleInput failed", err);
            }
        },
        [commit]
    );

    const handleBlur = React.useCallback(
        (e) => {
            if (typeof parentOnBlur === "function") {
                try {
                    parentOnBlur(e);
                } catch (err) {
                    logger.error("parentOnBlur threw", err);
                }
            }
            // ensure canonical display on blur
            setDisplay(centsToDisplay(centsRef.current));
        },
        [parentOnBlur]
    );

    return (
        <input
            id={id}
            name={name}
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoFocus={autoFocus}
            disabled={disabled}
            className={className}
            value={display}
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onInput={handleInput}
            onBlur={handleBlur}
            aria-label={name}
            autoComplete="off"
        />
    );
}

MoneyInput.propTypes = {
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func,
    className: PropTypes.string,
    autoFocus: PropTypes.bool,
    disabled: PropTypes.bool,
    id: PropTypes.string,
    name: PropTypes.string,
    placeholder: PropTypes.string,
    onKeyDown: PropTypes.func,
    onBlur: PropTypes.func,
};