import React from "react";
import PropTypes from "prop-types";
import SmartSelect from "./SmartSelect";

const logger = {
    info: (...args) => console.log("[TransactionRowDropdown]", ...args),
    error: (...args) => console.error("[TransactionRowDropdown]", ...args),
};

/**
 * TransactionRowDropdown
 *
 * Pure presentational component that renders the appropriate input control for
 * field-level editing. All business logic (persistence, derived defaults, filters)
 * is expected to be provided via props from the useTransactionRow hook / parent.
 *
 * Props are intentionally explicit so this component remains simple and testable.
 */
export default function TransactionRowDropdown({
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
    // Numeric amount input
    if (field === "amount") {
        return (
            <input
                className="tt-input tt-input-number"
                type="number"
                step="0.01"
                autoFocus
                defaultValue={String(tx.amount ?? "")}
                onChange={(e) => (editValueRef.current = e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") onSaveEdit(tx.id, field, editValueRef.current);
                    else if (e.key === "Escape") setEditing(null);
                    else onEditKey(e, tx.id, field);
                }}
            />
        );
    }

    // Date input
    if (field === "transactionDate") {
        return (
            <input
                className={className}
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
                className={className}
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
                className={className}
                ariaLabel={`${field} input`}
            />
        );
    }

    // Default text input (name, payee, memo, etc.)
    return (
        <input
            className={className}
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

TransactionRowDropdown.propTypes = {
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