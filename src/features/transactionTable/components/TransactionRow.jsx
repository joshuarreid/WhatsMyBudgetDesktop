import React from "react";
import PropTypes from "prop-types";
import { useTransactionRow } from "../useTransactionRow";
import SmartSelect from "./SmartSelect";

const logger = {
    info: (...args) => console.log('[TransactionRow]', ...args),
    error: (...args) => console.error('[TransactionRow]', ...args),
};

export default function TransactionRow({
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
        catSuggestions,
        catShowSuggestions,
        catHighlightIndex,
        accSuggestions,
        accShowSuggestions,
        accHighlightIndex,
        pmSuggestions,
        pmShowSuggestions,
        pmHighlightIndex,
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
        renderFieldInput,
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

    // --- Render ---
    return (
        <div className={`tt-row${selected ? " tt-row-selected" : ""}`} key={tx.id}>
            <div className="tt-checkbox-col">
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={onSelect}
                    aria-label={`Select transaction ${tx.name || tx.id}`}
                />
            </div>

            {/* Name */}
            <div className="tt-cell" title="Double click to edit">
                {isFieldEditing("name") ? (
                    <>
                        {renderFieldInput("name")}
                        {inlineError && <div style={{ color: '#ff8a8a', marginTop: 6 }}>{inlineError}</div>}
                    </>
                ) : isRowEditing ? (
                    <>
                        <input
                            className="tt-input"
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
            <div className="tt-cell tt-amount" title="Double click to edit" style={{ textAlign: "right" }}>
                {isFieldEditing("amount") ? (
                    <>
                        {renderFieldInput("amount")}
                        {inlineError && <div style={{ color: '#ff8a8a', marginTop: 6 }}>{inlineError}</div>}
                    </>
                ) : isRowEditing ? (
                    <>
                        <input
                            className="tt-input tt-input-number"
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
                    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(tx.amount) || 0)
                )}
            </div>

            {/* Category */}
            <div className="tt-cell" title="Double click to edit">
                {isFieldEditing("category") ? (
                    renderFieldInput("category")
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
            <div className="tt-cell" title="Double click to edit">
                {isFieldEditing("criticality") ? (
                    renderFieldInput("criticality")
                ) : isRowEditing ? (
                    <select
                        className="tt-input"
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
            <div className="tt-cell" title="Double click to edit">
                {isFieldEditing("transactionDate") ? (
                    renderFieldInput("transactionDate")
                ) : isRowEditing ? (
                    <input
                        className="tt-input"
                        type="date"
                        value={draft.transactionDate ? draft.transactionDate.slice(0, 10) : ''}
                        onChange={(e) => updateDraft('transactionDate', e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveRowClick();
                            if (e.key === 'Escape') onCancelRowLocal();
                        }}
                    />
                ) : tx.transactionDate ? (
                    new Date(tx.transactionDate).toLocaleDateString('en-US', { timeZone: 'UTC' })
                ) : (
                    ""
                )}
            </div>

            {/* Account */}
            <div className="tt-cell" title="Double click to edit">
                {isFieldEditing("account") ? (
                    renderFieldInput("account")
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
            <div className="tt-cell" title="Double click to edit">
                {isFieldEditing("paymentMethod") ? (
                    renderFieldInput("paymentMethod")
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
                <div className="tt-row-controls" role="group" aria-label="Row actions">
                    <button
                        className="tt-action-btn tt-action-outline"
                        onClick={onCancelRowLocal}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>

                    <button
                        className="tt-action-btn tt-action-primary"
                        onClick={() => onSaveRowClick(false)}
                        disabled={isSaving}
                    >
                        Save
                    </button>

                    {tx.__isNew ? (
                        <button
                            className="tt-action-btn tt-action-ghost"
                            onClick={() => onSaveRowClick(true)}
                            disabled={isSaving}
                        >
                            Save and add another
                        </button>
                    ) : null}

                    {isSaving && <span style={{ color: '#9be3a7', marginLeft: 8 }}>Saving…</span>}
                    {inlineError && <div style={{ color: '#ff8a8a', marginTop: 6 }}>{inlineError}</div>}
                </div>
            )}
        </div>
    );
}

TransactionRow.propTypes = {
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