import React from "react";
import PropTypes from "prop-types";
import SmartSelect from "../SmartSelect/SmartSelect";
import MoneyInput from "../../../../components/MoneyInput/MoneyInput";
import useTransactionRowInput from "../../hooks/useTransactionInput";


/**
 * TransactionRowInput
 *
 * Presentational component for field-level editing inputs.
 * - Keeps logic-free; behavior provided via props.
 * - Uses a CSS module for scoped styles; merges with global input class for incremental migration.
 *
 * NOTE: The UI-only component delegates classnames and common handlers to the
 * useTransactionRowInput hook so the code is smaller and easier to test.
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
    const {
        finalInputClass,
        finalNumberClass,
        finalSelectClass,
        getNumberProps,
        getDateProps,
        getSelectProps,
        getInputProps,
        getSmartSelectProps,
    } = useTransactionRowInput({ className });

    // Numeric amount input
    if (field === "amount") {
        const numProps = getNumberProps({
            tx,
            field,
            editValueRef,
            onSaveEdit,
            setEditing,
            onEditKey,
        });
        return (
            <MoneyInput
                className={numProps.className}
                autoFocus={numProps.autoFocus}
                value={numProps.value}
                onChange={numProps.onChange}
                onKeyDown={numProps.onKeyDown}
            />
        );
    }

    // Date input
    if (field === "transactionDate") {
        const dateProps = getDateProps({
            tx,
            field,
            editValueRef,
            toInputDate,
            onSaveEdit,
            setEditing,
            onEditKey,
        });
        return (
            <input
                className={dateProps.className}
                type={dateProps.type}
                autoFocus={dateProps.autoFocus}
                defaultValue={dateProps.defaultValue}
                onChange={dateProps.onChange}
                onKeyDown={dateProps.onKeyDown}
            />
        );
    }

    // Criticality native select
    if (field === "criticality") {
        const selProps = getSelectProps({
            tx,
            field,
            value,
            editValueRef,
            CRITICALITY_OPTIONS,
            DEFAULT_CRITICALITY,
            onSaveEdit,
            setEditing,
            onEditKey,
        });
        const options = selProps.CRITICALITY_OPTIONS;
        return (
            <select
                className={selProps.className}
                autoFocus={selProps.autoFocus}
                defaultValue={selProps.defaultValue}
                onChange={selProps.onChange}
                onKeyDown={selProps.onKeyDown}
            >
                {options.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        );
    }

    // Fields that use SmartSelect: category, account, paymentMethod
    if (["category", "account", "paymentMethod"].includes(field)) {
        const smartProps = getSmartSelectProps({
            field,
            IS_DROPDOWN,
            ALL_OPTIONS,
            value,
            inputRef,
            onChange,
            onSelectImmediate,
            onBlur,
            getMappedDefault,
            applyMappedDefault,
        });
        return <SmartSelect {...smartProps} />;
    }

    // Default text input (name, payee, memo, etc.)
    const inputProps = getInputProps({
        tx,
        field,
        value,
        editValueRef,
        onSaveEdit,
        setEditing,
        onEditKey,
    });
    return (
        <input
            className={inputProps.className}
            autoFocus={inputProps.autoFocus}
            defaultValue={inputProps.defaultValue}
            onChange={inputProps.onChange}
            onKeyDown={inputProps.onKeyDown}
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