import React from "react";
import PropTypes from "prop-types";
import { useTransactionRow } from "../../hooks/useTransactionRow";
import SmartSelect from "../SmartSelect/SmartSelect";
import TransactionRowDropdown from "../TransactionRowDropdown/TransactionRowDropdown";
import styles from "./TransactionRow.module.css";
import {
    INLINE_ERROR_COLOR,
    SAVING_TEXT_COLOR,
    DEFAULT_INPUT_CLASS,
    DEFAULT_LOCALE,
    DEFAULT_CURRENCY,
} from "../../utils/constants";

const logger = {
    info: (...args) => console.log('[TransactionTableRow]', ...args),
    error: (...args) => console.error('[TransactionTableRow]', ...args),
};

export default function TransactionTableRow({
                                                tx,
                                                selected,
                                                onSelect,
                                                editing,
                                                editValueRef,
                                                onCellDoubleClick,
                                                onEditKey,
                                                onSaveEdit,
                                                onSaveRow,
                                                onCancelRow,
                                                toInputDate,
                                                setEditing,
                                                savingIds = new Set(),
                                                saveErrors = {},
                                                startEditingRow,
                                            }) {
    const {
        isFieldEditing,
        isRowEditing,
        isSaving,
        inlineError,
        ALL_CATEGORIES,
        ALL_ACCOUNTS,
        ALL_PAYMENT_METHODS,
        IS_CATEGORY_DROPDOWN,
        IS_ACCOUNT_DROPDOWN,
        IS_PAYMENT_DROPDOWN,
        draft,
        updateDraft,
        categoryInputRef,
        accountInputRef,
        paymentInputRef,
        handleSelectCategoryForRow,
        handleSelectAccountForRow,
        handleSelectPaymentForRow,
        handleSelectCategoryForFieldEdit,
        handleSelectAccountForFieldEdit,
        handleSelectPaymentForFieldEdit,
        handleCategoryBlurForRow,
        handleAccountBlurForRow,
        handlePaymentBlurForRow,
        handleCategoryBlurForField,
        handleAccountBlurForField,
        handlePaymentBlurForField,
        onSaveRowClick,
        onCancelRowLocal,
        onStartRowEdit,
        CRITICALITY_OPTIONS,
        DEFAULT_CRITICALITY,
        getCriticalityForCategory,
        getDefaultPaymentMethodForAccount,
    } = useTransactionRow({
        tx,
        editing,
        editValueRef,
        onSaveEdit,
        onSaveRow,
        onCancelRow,
        toInputDate,
        setEditing,
        savingIds,
        saveErrors,
        startEditingRow,
        onEditKey,
    });

    // Helper to merge the global input class with local module class for backward compatibility
    const inputClass = `${DEFAULT_INPUT_CLASS} ${styles.input}`;

    return (
        <div className={`${styles.row} ${selected ? styles.rowSelected : ""}`} key={tx.id}>
            <div className={styles.checkboxCol}>
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={onSelect}
                    aria-label={`Select transaction ${tx.name || tx.id}`}
                />
            </div>

            {/* Name */}
            <div className={styles.cell} title="Double click to edit">
                {isFieldEditing("name") ? (
                    <>
                        <TransactionRowDropdown
                            field="name"
                            tx={tx}
                            value={tx.name}
                            editValueRef={editValueRef}
                            toInputDate={toInputDate}
                            onSaveEdit={onSaveEdit}
                            setEditing={setEditing}
                            onEditKey={onEditKey}
                        />
                        {inlineError && <div className={styles.inlineError}>{inlineError}</div>}
                    </>
                ) : isRowEditing ? (
                    <>
                        <input
                            className={inputClass}
                            autoFocus
                            value={draft.name || ''}
                            onChange={(e) => updateDraft('name', e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onSaveRowClick();
                                if (e.key === 'Escape') onCancelRowLocal();
                            }}
                        />
                    </>
                ) : (
                    <div onDoubleClick={() => onCellDoubleClick(tx, "name")}>{tx.name}</div>
                )}
            </div>

            {/* Amount */}
            <div className={`${styles.cell} ${styles.amount}`} title="Double click to edit" style={{ textAlign: "right" }}>
                {isFieldEditing("amount") ? (
                    <>
                        <TransactionRowDropdown
                            field="amount"
                            tx={tx}
                            value={tx.amount}
                            editValueRef={editValueRef}
                            toInputDate={toInputDate}
                            onSaveEdit={onSaveEdit}
                            setEditing={setEditing}
                            onEditKey={onEditKey}
                        />
                        {inlineError && <div className={styles.inlineError}>{inlineError}</div>}
                    </>
                ) : isRowEditing ? (
                    <>
                        <input
                            className={`${inputClass} ${styles.inputNumber}`}
                            type="number"
                            step="0.01"
                            value={draft.amount ?? 0}
                            onChange={(e) => updateDraft('amount', e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onSaveRowClick();
                                if (e.key === 'Escape') onCancelRowLocal();
                            }}
                            style={{ textAlign: 'right' }}
                        />
                    </>
                ) : (
                    new Intl.NumberFormat(DEFAULT_LOCALE, { style: "currency", currency: DEFAULT_CURRENCY }).format(Number(tx.amount) || 0)
                )}
            </div>

            {/* Category */}
            <div className={styles.cell} title="Double click to edit">
                {isFieldEditing("category") ? (
                    <TransactionRowDropdown
                        field="category"
                        tx={tx}
                        value={tx.category}
                        editValueRef={editValueRef}
                        toInputDate={toInputDate}
                        onSaveEdit={onSaveEdit}
                        setEditing={setEditing}
                        onEditKey={onEditKey}
                        ALL_OPTIONS={ALL_CATEGORIES}
                        IS_DROPDOWN={IS_CATEGORY_DROPDOWN}
                        inputRef={categoryInputRef}
                        onSelectImmediate={async (val) => {
                            await handleSelectCategoryForFieldEdit(val);
                            setEditing(null);
                        }}
                        onBlur={handleCategoryBlurForField}
                        getMappedDefault={getCriticalityForCategory}
                        applyMappedDefault={async (mapped) => {
                            if (mapped && typeof onSaveEdit === 'function') {
                                try { await onSaveEdit(tx.id, 'criticality', mapped); } catch (err) { logger.error('persist mapped criticality failed', err); }
                            }
                        }}
                    />
                ) : isRowEditing ? (
                    <SmartSelect
                        name="category"
                        mode={IS_CATEGORY_DROPDOWN ? "dropdown" : "autocomplete"}
                        options={ALL_CATEGORIES}
                        allOptions={ALL_CATEGORIES}
                        value={draft.category || ''}
                        inputRef={categoryInputRef}
                        onChange={(v) => {
                            updateDraft('category', v);
                            const mapped = getCriticalityForCategory(v);
                            if (mapped) updateDraft('criticality', mapped);
                        }}
                        onSelectImmediate={handleSelectCategoryForRow}
                        onBlur={handleCategoryBlurForRow}
                        getMappedDefault={getCriticalityForCategory}
                        applyMappedDefault={(mapped) => {
                            if (mapped) updateDraft('criticality', mapped);
                        }}
                    />
                ) : (
                    <div onDoubleClick={() => onCellDoubleClick(tx, "category")}>{tx.category}</div>
                )}
            </div>

            {/* Criticality (dropdown) */}
            <div className={styles.cell} title="Double click to edit">
                {isFieldEditing("criticality") ? (
                    <TransactionRowDropdown
                        field="criticality"
                        tx={tx}
                        value={tx.criticality}
                        editValueRef={editValueRef}
                        toInputDate={toInputDate}
                        onSaveEdit={onSaveEdit}
                        setEditing={setEditing}
                        onEditKey={onEditKey}
                        CRITICALITY_OPTIONS={CRITICALITY_OPTIONS}
                        DEFAULT_CRITICALITY={DEFAULT_CRITICALITY}
                    />
                ) : isRowEditing ? (
                    <select
                        className={inputClass}
                        value={draft.criticality ? draft.criticality : DEFAULT_CRITICALITY}
                        onChange={(e) => updateDraft('criticality', e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveRowClick();
                            if (e.key === 'Escape') onCancelRowLocal();
                        }}
                    >
                        {CRITICALITY_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                ) : (
                    <div onDoubleClick={() => onCellDoubleClick(tx, "criticality")}>{tx.criticality}</div>
                )}
            </div>

            {/* Date */}
            <div className={styles.cell} title="Double click to edit">
                {isFieldEditing("transactionDate") ? (
                    <TransactionRowDropdown
                        field="transactionDate"
                        tx={tx}
                        value={tx.transactionDate}
                        editValueRef={editValueRef}
                        toInputDate={toInputDate}
                        onSaveEdit={onSaveEdit}
                        setEditing={setEditing}
                        onEditKey={onEditKey}
                    />
                ) : isRowEditing ? (
                    <input
                        className={inputClass}
                        type="date"
                        /* use toInputDate helper to render a browser-friendly yyyy-mm-dd value */
                        value={draft.transactionDate ? toInputDate(draft.transactionDate) : ''}
                        onChange={(e) => updateDraft('transactionDate', e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveRowClick();
                            if (e.key === 'Escape') onCancelRowLocal();
                        }}
                    />
                ) : tx.transactionDate ? (
                    new Date(tx.transactionDate).toLocaleDateString(DEFAULT_LOCALE, { timeZone: 'UTC' })
                ) : (
                    ""
                )}
            </div>

            {/* Account */}
            <div className={styles.cell} title="Double click to edit">
                {isFieldEditing("account") ? (
                    <TransactionRowDropdown
                        field="account"
                        tx={tx}
                        value={tx.account}
                        editValueRef={editValueRef}
                        toInputDate={toInputDate}
                        onSaveEdit={onSaveEdit}
                        setEditing={setEditing}
                        onEditKey={onEditKey}
                        ALL_OPTIONS={ALL_ACCOUNTS}
                        IS_DROPDOWN={IS_ACCOUNT_DROPDOWN}
                        inputRef={accountInputRef}
                        onSelectImmediate={async (val) => {
                            await handleSelectAccountForFieldEdit(val);
                            setEditing(null);
                        }}
                        onBlur={handleAccountBlurForField}
                        getMappedDefault={getDefaultPaymentMethodForAccount}
                        applyMappedDefault={async (mapped) => {
                            if (mapped && typeof onSaveEdit === 'function') {
                                try { await onSaveEdit(tx.id, 'paymentMethod', mapped); } catch (err) { logger.error('persist mapped paymentMethod failed', err); }
                            }
                        }}
                    />
                ) : isRowEditing ? (
                    <SmartSelect
                        name="account"
                        mode={IS_ACCOUNT_DROPDOWN ? "dropdown" : "autocomplete"}
                        options={ALL_ACCOUNTS}
                        allOptions={ALL_ACCOUNTS}
                        value={draft.account || ''}
                        inputRef={accountInputRef}
                        onChange={(v) => {
                            updateDraft('account', v);
                            const defaultPm = getDefaultPaymentMethodForAccount(v);
                            if (defaultPm) updateDraft('paymentMethod', defaultPm);
                        }}
                        onSelectImmediate={handleSelectAccountForRow}
                        onBlur={handleAccountBlurForRow}
                        getMappedDefault={getDefaultPaymentMethodForAccount}
                        applyMappedDefault={(mapped) => {
                            if (mapped) updateDraft('paymentMethod', mapped);
                        }}
                    />
                ) : (
                    <div onDoubleClick={() => onCellDoubleClick(tx, "account")}>{tx.account}</div>
                )}
            </div>

            {/* Payment Method */}
            <div className={styles.cell} title="Double click to edit">
                {isFieldEditing("paymentMethod") ? (
                    <TransactionRowDropdown
                        field="paymentMethod"
                        tx={tx}
                        value={tx.paymentMethod}
                        editValueRef={editValueRef}
                        toInputDate={toInputDate}
                        onSaveEdit={onSaveEdit}
                        setEditing={setEditing}
                        onEditKey={onEditKey}
                        ALL_OPTIONS={ALL_PAYMENT_METHODS}
                        IS_DROPDOWN={IS_PAYMENT_DROPDOWN}
                        inputRef={paymentInputRef}
                        onSelectImmediate={async (val) => {
                            await handleSelectPaymentForFieldEdit(val);
                            setEditing(null);
                        }}
                        onBlur={handlePaymentBlurForField}
                    />
                ) : isRowEditing ? (
                    <SmartSelect
                        name="paymentMethod"
                        mode={IS_PAYMENT_DROPDOWN ? "dropdown" : "autocomplete"}
                        options={ALL_PAYMENT_METHODS}
                        allOptions={ALL_PAYMENT_METHODS}
                        value={draft.paymentMethod || ''}
                        inputRef={paymentInputRef}
                        onChange={(v) => updateDraft('paymentMethod', v)}
                        onSelectImmediate={handleSelectPaymentForRow}
                        onBlur={handlePaymentBlurForRow}
                    />
                ) : (
                    <div onDoubleClick={() => onCellDoubleClick(tx, "paymentMethod")}>{tx.paymentMethod}</div>
                )}
            </div>

            {/* Row-level controls that span across the data columns (appears underneath inputs) */}
            {isRowEditing && (
                <div className={styles.rowControls} role="group" aria-label="Row actions">
                    <button
                        className={`${styles.actionBtn} ${styles.actionOutline}`}
                        onClick={onCancelRowLocal}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>

                    <button
                        className={`${styles.actionBtn} ${styles.actionPrimary}`}
                        onClick={() => onSaveRowClick(false)}
                        disabled={isSaving}
                    >
                        Save
                    </button>

                    {tx.__isNew ? (
                        <button
                            className={`${styles.actionBtn} ${styles.actionGhost}`}
                            onClick={() => onSaveRowClick(true)}
                            disabled={isSaving}
                        >
                            Save and add another
                        </button>
                    ) : null}

                    {isSaving && <span className={styles.savingText}>Saving…</span>}
                    {inlineError && <div className={styles.inlineError}>{inlineError}</div>}
                </div>
            )}
        </div>
    );
}

TransactionTableRow.propTypes = {
    tx: PropTypes.object.isRequired,
    selected: PropTypes.bool.isRequired,
    onSelect: PropTypes.func.isRequired,
    editing: PropTypes.object,
    editValueRef: PropTypes.object.isRequired,
    onCellDoubleClick: PropTypes.func.isRequired,
    onEditKey: PropTypes.func.isRequired,
    onSaveEdit: PropTypes.func.isRequired,
    onSaveRow: PropTypes.func.isRequired,
    onCancelRow: PropTypes.func, // optional
    toInputDate: PropTypes.func.isRequired,
    setEditing: PropTypes.func.isRequired,
    savingIds: PropTypes.object,
    saveErrors: PropTypes.object,
    startEditingRow: PropTypes.func.isRequired,
};