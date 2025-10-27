import React from "react";
import PropTypes from "prop-types";
import SmartSelect from "../SmartSelect/SmartSelect";
import styles from "./TransactionRowDropdown.module.css";
import MoneyInput from "../../../../components/MoneyInput/MoneyInput";


const logger = {
    info: (...args) => console.log("[TransactionRowInput]", ...args),
    error: (...args) => console.error("[TransactionRowInput]", ...args),
};

/**
 * TransactionRowInput
 *
 * Presentational component for field-level editing inputs.
 * - Keeps logic-free; behavior provided via props.
 * - Uses a CSS module for scoped styles; merges with global input class for incremental migration.
 */
export default function TransactionRowInput({
                                                   field,
                                                   tx,
                                                   value,
                                                   editValueRef,
                                                   toInputDate,
                                                   onSaveEdit,
                                                   setEditing,
                                                   onEditKey,
                                                   // SmartSelect-related props (for category/account/paymentMethod)
                                                   ALL_OPTIONS,
                                                   IS_DROPDOWN,
                                                   inputRef,
                                                   onChange,
                                                   onSelectImmediate,
                                                   onBlur,
                                                   getMappedDefault,
                                                   applyMappedDefault,
                                                   // criticality helpers
                                                   CRITICALITY_OPTIONS,
                                                   DEFAULT_CRITICALITY,
                                                   className = "tt-input",
                                               }) {
    // Merge provided global class with module class for incremental compatibility.
    const finalInputClass = `${className} ${styles.input}`.trim();
    const finalNumberClass = `${className} ${styles.input} ${styles.inputNumber}`.trim();
    const finalSelectClass = `${className} ${styles.select}`.trim();

    // Numeric amount input
    if (field === "amount") {
        return (
            <MoneyInput
                className={finalNumberClass}
                autoFocus
                value={tx.amount ?? ""}
                onChange={(valStr) => {
                    // Keep the old convention: editValueRef.current stores the raw string
                    if (editValueRef) editValueRef.current = valStr;
                }}
                onKeyDown={(e) => {
                    // Forward Enter/Escape handling to parent key handler logic (kept same shape)
                    if (e.key === "Enter") {
                        try {
                            onSaveEdit(tx.id, field, editValueRef.current);
                        } catch (err) {
                            logger.error('onSaveEdit failed', err);
                        }
                    } else if (e.key === "Escape") {
                        setEditing(null);
                    } else {
                        // delegate other keys to caller (if they want)
                        try {
                            onEditKey(e, tx.id, field);
                        } catch (err) {
                            logger.error('onEditKey threw', err);
                        }
                    }
                }}
            />
        );
    }

    // Date input
    if (field === "transactionDate") {
        return (
            <input
                className={finalInputClass}
                type="date"
                autoFocus
                defaultValue={toInputDate ? toInputDate(tx.transactionDate) : tx.transactionDate}
                onChange={(e) => (editValueRef.current = e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") onSaveEdit(tx.id, field, editValueRef.current);
                    else if (e.key === "Escape") setEditing(null);
                    else onEditKey(e, tx.id, field);
                }}
            />
        );
    }

    // Criticality native select
    if (field === "criticality") {
        const dv = (String(value ?? "").trim() !== "") ? value : DEFAULT_CRITICALITY;
        return (
            <select
                className={finalSelectClass}
                autoFocus
                defaultValue={dv}
                onChange={(e) => (editValueRef.current = e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") onSaveEdit(tx.id, field, editValueRef.current);
                    else if (e.key === "Escape") setEditing(null);
                    else onEditKey(e, tx.id, field);
                }}
            >
                {(Array.isArray(CRITICALITY_OPTIONS) ? CRITICALITY_OPTIONS : ["Essential", "Nonessential"]).map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        );
    }

    // Fields that use SmartSelect: category, account, paymentMethod
    if (["category", "account", "paymentMethod"].includes(field)) {
        return (
            <SmartSelect
                name={field}
                mode={IS_DROPDOWN ? "dropdown" : "autocomplete"}
                options={IS_DROPDOWN ? ALL_OPTIONS : undefined}
                allOptions={ALL_OPTIONS}
                value={String(value ?? "")}
                inputRef={inputRef}
                onChange={onChange}
                onSelectImmediate={onSelectImmediate}
                onBlur={onBlur}
                getMappedDefault={getMappedDefault}
                applyMappedDefault={applyMappedDefault}
                className={finalInputClass}
                ariaLabel={`${field} input`}
            />
        );
    }

    // Default text input (name, payee, memo, etc.)
    return (
        <input
            className={finalInputClass}
            autoFocus
            defaultValue={String(value ?? tx[field] ?? "")}
            onChange={(e) => (editValueRef.current = e.target.value)}
            onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit(tx.id, field, editValueRef.current);
                else if (e.key === "Escape") setEditing(null);
                else onEditKey(e, tx.id, field);
            }}
        />
    );
}

TransactionRowInput.propTypes = {
    field: PropTypes.string.isRequired,
    tx: PropTypes.object.isRequired,
    value: PropTypes.any,
    editValueRef: PropTypes.object,
    toInputDate: PropTypes.func,
    onSaveEdit: PropTypes.func.isRequired,
    setEditing: PropTypes.func.isRequired,
    onEditKey: PropTypes.func.isRequired,
    ALL_OPTIONS: PropTypes.array,
    IS_DROPDOWN: PropTypes.bool,
    inputRef: PropTypes.object,
    onChange: PropTypes.func,
    onSelectImmediate: PropTypes.func,
    onBlur: PropTypes.func,
    getMappedDefault: PropTypes.func,
    applyMappedDefault: PropTypes.func,
    CRITICALITY_OPTIONS: PropTypes.array,
    DEFAULT_CRITICALITY: PropTypes.string,
    className: PropTypes.string,
};