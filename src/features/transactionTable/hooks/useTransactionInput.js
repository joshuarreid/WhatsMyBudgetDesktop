/**
 * useTransactionRowInput.js
 *
 * Hook that extracts the presentational input helpers previously embedded in
 * TransactionRowInput.jsx. Keeps JSX-free logic for class names and common event
 * handlers so TransactionRowInput remains a pure presentational component.
 *
 * Conventions:
 * - Returns className strings and factory functions that produce props for inputs.
 * - No side-effects; pure functions and stable references where reasonable.
 *
 * @module useTransactionRowInput
 */

import { useMemo, useCallback } from "react";
import styles from "../components/TransactionRowInput/TransactionRowInput.module.css";

const logger = {
    info: (...args) => console.log("[useTransactionRowInput]", ...args),
    error: (...args) => console.error("[useTransactionRowInput]", ...args),
};

/**
 * @typedef {Object} KeyHandlers
 * @property {function} onSaveEdit - (id, field, value) => Promise|void
 * @property {function} setEditing - (value) => void
 * @property {function} onEditKey - (event, id, field) => void
 * @property {Object} editValueRef - React ref object used by field-level editing
 */

/**
 * useTransactionRowInput
 *
 * Provides classNames and helper prop creators for TransactionRow input elements.
 *
 * @param {Object} params
 * @param {string} [params.className='tt-input'] - global input class to merge with local module classes
 * @returns {Object} helpers to wire inputs in TransactionRowInput.jsx
 */
export default function useTransactionRowInput({ className = "tt-input" } = {}) {
    // Memoize class name computations so consumers can safely use them in deps
    const finalInputClass = useMemo(() => `${className} ${styles.input}`.trim(), [className]);
    const finalNumberClass = useMemo(() => `${className} ${styles.input} ${styles.inputNumber}`.trim(), [className]);
    const finalSelectClass = useMemo(() => `${className} ${styles.select}`.trim(), [className]);

    /**
     * makeKeyDownHandler
     *
     * Factory for keydown handlers used across inputs to keep behavior consistent:
     * - Enter => save edit via onSaveEdit(id, field, editValueRef.current)
     * - Escape => cancel by clearing editing (setEditing(null))
     * - Other keys => delegate to onEditKey for custom behavior
     *
     * @param {Object} params
     * @param {Object} params.tx - transaction object (must include id)
     * @param {string} params.field - field name being edited
     * @param {KeyHandlers} params.handlers
     * @returns {function(Event): void} keydown handler
     */
    const makeKeyDownHandler = useCallback(({ tx, field, handlers }) => {
        return (e) => {
            try {
                if (!handlers) return;
                const { onSaveEdit, setEditing, onEditKey, editValueRef } = handlers;
                if (e.key === "Enter") {
                    if (typeof onSaveEdit === "function") {
                        onSaveEdit(tx.id, field, editValueRef?.current);
                    }
                } else if (e.key === "Escape") {
                    if (typeof setEditing === "function") setEditing(null);
                } else {
                    if (typeof onEditKey === "function") onEditKey(e, tx.id, field);
                }
            } catch (err) {
                logger.error("makeKeyDownHandler thrown", err);
            }
        };
    }, []);

    /**
     * getInputProps
     *
     * Common props for text-like <input> elements (name, payee, memo, etc.)
     *
     * @param {Object} params
     * @param {Object} params.tx
     * @param {string} params.field
     * @param {any} params.value
     * @param {Object} params.editValueRef
     * @param {function} params.onSaveEdit
     * @param {function} params.setEditing
     * @param {function} params.onEditKey
     * @returns {Object} props to spread on an <input>
     */
    const getInputProps = useCallback(({ tx, field, value, editValueRef, onSaveEdit, setEditing, onEditKey }) => {
        return {
            className: finalInputClass,
            autoFocus: true,
            defaultValue: String(value ?? tx[field] ?? ""),
            onChange: (e) => {
                if (editValueRef) editValueRef.current = e.target.value;
            },
            onKeyDown: makeKeyDownHandler({
                tx,
                field,
                handlers: { onSaveEdit, setEditing, onEditKey, editValueRef },
            }),
        };
    }, [finalInputClass, makeKeyDownHandler]);

    /**
     * getNumberProps
     *
     * Props for numeric MoneyInput component. MoneyInput's onChange receives a raw
     * string; we preserve the existing convention of writing that string into editValueRef.current.
     *
     * @param {Object} params
     * @param {Object} params.tx
     * @param {string} params.field
     * @param {Object} params.editValueRef
     * @param {function} params.onSaveEdit
     * @param {function} params.setEditing
     * @param {function} params.onEditKey
     * @returns {Object}
     */
    const getNumberProps = useCallback(({ tx, field, editValueRef, onSaveEdit, setEditing, onEditKey }) => {
        return {
            className: finalNumberClass,
            autoFocus: true,
            value: tx.amount ?? "",
            onChange: (valStr) => {
                if (editValueRef) editValueRef.current = valStr;
            },
            onKeyDown: makeKeyDownHandler({
                tx,
                field,
                handlers: { onSaveEdit, setEditing, onEditKey, editValueRef },
            }),
        };
    }, [finalNumberClass, makeKeyDownHandler]);

    /**
     * getDateProps
     *
     * Props for <input type="date" /> including default value resolution.
     *
     * @param {Object} params
     * @param {Object} params.tx
     * @param {string} params.field
     * @param {Object} params.editValueRef
     * @param {function} params.toInputDate - helper to normalize ISO date to yyyy-mm-dd
     * @param {function} params.onSaveEdit
     * @param {function} params.setEditing
     * @param {function} params.onEditKey
     * @returns {Object}
     */
    const getDateProps = useCallback(({ tx, field, editValueRef, toInputDate, onSaveEdit, setEditing, onEditKey }) => {
        return {
            className: finalInputClass,
            type: "date",
            autoFocus: true,
            defaultValue: toInputDate ? (toInputDate(tx.transactionDate) || "") : (tx.transactionDate || ""),
            onChange: (e) => {
                if (editValueRef) editValueRef.current = e.target.value;
            },
            onKeyDown: makeKeyDownHandler({
                tx,
                field,
                handlers: { onSaveEdit, setEditing, onEditKey, editValueRef },
            }),
        };
    }, [finalInputClass, makeKeyDownHandler]);

    /**
     * getSelectProps
     *
     * Props for native select inputs (criticality). Accepts CRITICALITY_OPTIONS and DEFAULT_CRITICALITY
     * to compute the default value when the supplied value is empty-ish.
     *
     * @param {Object} params
     * @param {Object} params.tx
     * @param {string} params.field
     * @param {any} params.value
     * @param {Object} params.editValueRef
     * @param {Array} params.CRITICALITY_OPTIONS
     * @param {string} params.DEFAULT_CRITICALITY
     * @param {function} params.onSaveEdit
     * @param {function} params.setEditing
     * @param {function} params.onEditKey
     * @returns {Object}
     */
    const getSelectProps = useCallback(({ tx, field, value, editValueRef, CRITICALITY_OPTIONS, DEFAULT_CRITICALITY, onSaveEdit, setEditing, onEditKey }) => {
        const dv = (String(value ?? "").trim() !== "") ? value : DEFAULT_CRITICALITY;
        return {
            className: finalSelectClass,
            autoFocus: true,
            defaultValue: dv,
            onChange: (e) => {
                if (editValueRef) editValueRef.current = e.target.value;
            },
            onKeyDown: makeKeyDownHandler({
                tx,
                field,
                handlers: { onSaveEdit, setEditing, onEditKey, editValueRef },
            }),
            CRITICALITY_OPTIONS: Array.isArray(CRITICALITY_OPTIONS) ? CRITICALITY_OPTIONS : ["Essential", "Nonessential"],
        };
    }, [finalSelectClass, makeKeyDownHandler]);

    /**
     * getSmartSelectProps
     *
     * Lightweight helper to produce the props object expected by SmartSelect in the
     * field-edit branches (category/account/paymentMethod). Caller still passes through
     * SmartSelect-specific callbacks.
     *
     * @param {Object} params - forwarded props required by SmartSelect consumers
     * @returns {Object}
     */
    const getSmartSelectProps = useCallback((params) => {
        // The caller (TransactionRowInput.jsx) will spread these onto <SmartSelect />
        return {
            name: params.field,
            mode: params.IS_DROPDOWN ? "dropdown" : "autocomplete",
            options: params.IS_DROPDOWN ? params.ALL_OPTIONS : undefined,
            allOptions: params.ALL_OPTIONS,
            value: String(params.value ?? ""),
            inputRef: params.inputRef,
            onChange: params.onChange,
            onSelectImmediate: params.onSelectImmediate,
            onBlur: params.onBlur,
            getMappedDefault: params.getMappedDefault,
            applyMappedDefault: params.applyMappedDefault,
            className: finalInputClass,
            ariaLabel: `${params.field} input`,
        };
    }, [finalInputClass]);

    // expose helper functions
    return {
        finalInputClass,
        finalNumberClass,
        finalSelectClass,
        makeKeyDownHandler,
        getInputProps,
        getNumberProps,
        getDateProps,
        getSelectProps,
        getSmartSelectProps,
    };
}