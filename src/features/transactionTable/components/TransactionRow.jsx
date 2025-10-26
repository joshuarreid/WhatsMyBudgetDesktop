import React from "react";
import PropTypes from "prop-types";
import { useTransactionRow } from "../useTransactionRow";

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
                    IS_CATEGORY_DROPDOWN ? (
                        <select
                            className="tt-input"
                            value={draft.category || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                updateDraft('category', val);
                                const mapped = getCriticalityForCategory(val);
                                if (mapped) updateDraft('criticality', mapped);
                            }}
                            onBlur={handleCategoryBlurForRow}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onSaveRowClick();
                                if (e.key === 'Escape') onCancelRowLocal();
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                }
                                if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                }
                            }}
                        >
                            <option value="">{/* allow empty */}</option>
                            {ALL_CATEGORIES.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <input
                                ref={categoryInputRef}
                                className="tt-input"
                                value={draft.category || ''}
                                onChange={(e) => {
                                    updateDraft('category', e.target.value);
                                }}
                                onBlur={handleCategoryBlurForRow}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onSaveRowClick();
                                    if (e.key === 'Escape') onCancelRowLocal();
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                    }
                                    if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                    }
                                    if (e.key === 'Tab') {
                                        // let blur handler run
                                    }
                                }}
                            />
                            {catShowSuggestions && catSuggestions.length > 0 && (
                                <div
                                    role="listbox"
                                    aria-label="Category suggestions"
                                    style={{
                                        position: 'absolute',
                                        zIndex: 2000,
                                        background: 'white',
                                        border: '1px solid rgba(0,0,0,0.12)',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                        width: '100%',
                                        maxHeight: 220,
                                        overflowY: 'auto',
                                        marginTop: 6,
                                    }}
                                >
                                    {catSuggestions.map((opt, idx) => (
                                        <div
                                            key={opt}
                                            role="option"
                                            aria-selected={idx === catHighlightIndex}
                                            onMouseDown={(ev) => {
                                                ev.preventDefault();
                                                handleSelectCategoryForRow(opt);
                                            }}
                                            onMouseEnter={() => { /* highlight handled inside hook state */ }}
                                            style={{
                                                padding: '6px 8px',
                                                background: idx === catHighlightIndex ? 'rgba(0,0,0,0.04)' : 'white',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
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
                    IS_ACCOUNT_DROPDOWN ? (
                        <select
                            className="tt-input"
                            value={draft.account || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                updateDraft('account', val);
                                const defaultPm = getDefaultPaymentMethodForAccount(val);
                                if (defaultPm) updateDraft('paymentMethod', defaultPm);
                            }}
                            onBlur={handleAccountBlurForRow}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onSaveRowClick();
                                if (e.key === 'Escape') onCancelRowLocal();
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                }
                                if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                }
                            }}
                        >
                            <option value="">{/* allow empty */}</option>
                            {ALL_ACCOUNTS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <input
                                ref={accountInputRef}
                                className="tt-input"
                                value={draft.account || ''}
                                onChange={(e) => {
                                    updateDraft('account', e.target.value);
                                }}
                                onBlur={handleAccountBlurForRow}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onSaveRowClick();
                                    if (e.key === 'Escape') onCancelRowLocal();
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                    }
                                    if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                    }
                                    if (e.key === 'Tab') {
                                        // let blur handler run
                                    }
                                }}
                            />
                            {accShowSuggestions && accSuggestions.length > 0 && (
                                <div
                                    role="listbox"
                                    aria-label="Account suggestions"
                                    style={{
                                        position: 'absolute',
                                        zIndex: 2000,
                                        background: 'white',
                                        border: '1px solid rgba(0,0,0,0.12)',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                        width: '100%',
                                        maxHeight: 220,
                                        overflowY: 'auto',
                                        marginTop: 6,
                                    }}
                                >
                                    {accSuggestions.map((opt, idx) => (
                                        <div
                                            key={opt}
                                            role="option"
                                            aria-selected={idx === accHighlightIndex}
                                            onMouseDown={(ev) => {
                                                ev.preventDefault();
                                                handleSelectAccountForRow(opt);
                                            }}
                                            onMouseEnter={() => {}}
                                            style={{
                                                padding: '6px 8px',
                                                background: idx === accHighlightIndex ? 'rgba(0,0,0,0.04)' : 'white',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    <div onDoubleClick={() => onCellDoubleClick(tx, "account")}>{tx.account}</div>
                )}
            </div>

            {/* Payment Method */}
            <div className="tt-cell" title="Double click to edit">
                {isFieldEditing("paymentMethod") ? (
                    renderFieldInput("paymentMethod")
                ) : isRowEditing ? (
                    IS_PAYMENT_DROPDOWN ? (
                        <select
                            className="tt-input"
                            value={draft.paymentMethod || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                updateDraft('paymentMethod', val);
                            }}
                            onBlur={handlePaymentBlurForRow}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onSaveRowClick();
                                if (e.key === 'Escape') onCancelRowLocal();
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                }
                                if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                }
                            }}
                        >
                            <option value="">{/* allow empty */}</option>
                            {ALL_PAYMENT_METHODS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <input
                                ref={paymentInputRef}
                                className="tt-input"
                                value={draft.paymentMethod || ''}
                                onChange={(e) => {
                                    updateDraft('paymentMethod', e.target.value);
                                }}
                                onBlur={handlePaymentBlurForRow}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onSaveRowClick();
                                    if (e.key === 'Escape') onCancelRowLocal();
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                    }
                                    if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                    }
                                    if (e.key === 'Tab') {
                                        // let blur handler run
                                    }
                                }}
                            />
                            {pmShowSuggestions && pmSuggestions.length > 0 && (
                                <div
                                    role="listbox"
                                    aria-label="Payment method suggestions"
                                    style={{
                                        position: 'absolute',
                                        zIndex: 2000,
                                        background: 'white',
                                        border: '1px solid rgba(0,0,0,0.12)',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                        width: '100%',
                                        maxHeight: 220,
                                        overflowY: 'auto',
                                        marginTop: 6,
                                    }}
                                >
                                    {pmSuggestions.map((opt, idx) => (
                                        <div
                                            key={opt}
                                            role="option"
                                            aria-selected={idx === pmHighlightIndex}
                                            onMouseDown={(ev) => {
                                                ev.preventDefault();
                                                handleSelectPaymentForRow(opt);
                                            }}
                                            onMouseEnter={() => {}}
                                            style={{
                                                padding: '6px 8px',
                                                background: idx === pmHighlightIndex ? 'rgba(0,0,0,0.04)' : 'white',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
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