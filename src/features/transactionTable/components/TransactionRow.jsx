import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

const logger = {
    info: (...args) => console.log('[TransactionRow]', ...args),
    error: (...args) => console.error('[TransactionRow]', ...args),
};

/**
 * TransactionRow
 *
 * Supports:
 * - field edit mode (existing behaviour)
 * - whole-row edit mode: edit all fields locally, then Save or Cancel
 */
export default function TransactionRow({
                                           tx,
                                           selected,
                                           onSelect,
                                           editing,
                                           editValueRef,
                                           onCellDoubleClick,
                                           onEditKey,
                                           onSaveEdit, // single-field save (kept for compatibility)
                                           onSaveRow, // new: save whole row
                                           toInputDate,
                                           onToggleCleared,
                                           setEditing,
                                           savingIds = new Set(),
                                           saveErrors = {},
                                           startEditingRow,
                                       }) {
    const isFieldEditing = (field) => editing && editing.id === tx.id && editing.mode === 'field' && editing.field === field;
    const isRowEditing = editing && editing.id === tx.id && editing.mode === 'row';
    const isSaving = savingIds && savingIds.has(tx.id);
    const inlineError = saveErrors && saveErrors[tx.id];

    // local draft state used only when editing the whole row
    const [draft, setDraft] = useState(() => ({ ...tx }));

    // keep draft in sync when tx changes and not currently editing row
    useEffect(() => {
        if (!isRowEditing) {
            setDraft({ ...tx });
        }
    }, [tx.id, tx]);

    const updateDraft = (field, value) => {
        setDraft((prev) => ({ ...prev, [field]: value }));
    };

    const onSaveRowClick = () => {
        // normalize date input if needed (if transactionDate is in yyyy-mm-dd)
        const normalized = { ...draft };
        if (normalized.transactionDate && normalized.transactionDate.length === 10) {
            // assume yyyy-mm-dd -> convert to ISO
            normalized.transactionDate = new Date(normalized.transactionDate).toISOString();
        }
        onSaveRow(tx.id, normalized);
    };

    const onCancelRow = () => {
        setEditing(null);
        setDraft({ ...tx });
        logger.info('cancel row edit', { id: tx.id });
    };

    const onStartRowEdit = () => {
        startEditingRow(tx.id);
        setDraft({ ...tx });
    };

    // helper for field inputs (unchanged behaviour except no onBlur save)
    const renderFieldInput = (field, props = {}) => {
        if (field === "amount") {
            return (
                <input
                    className="tt-input tt-input-number"
                    type="number"
                    step="0.01"
                    autoFocus
                    defaultValue={String(tx.amount)}
                    onChange={(e) => (editValueRef.current = e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") onSaveEdit(tx.id, field, editValueRef.current);
                        else if (e.key === "Escape") setEditing(null);
                        else onEditKey(e, tx.id, field);
                    }}
                    {...props}
                />
            );
        }

        if (field === "transactionDate") {
            return (
                <input
                    className="tt-input"
                    type="date"
                    autoFocus
                    defaultValue={toInputDate(tx.transactionDate)}
                    onChange={(e) => (editValueRef.current = e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") onSaveEdit(tx.id, field, editValueRef.current);
                        else if (e.key === "Escape") setEditing(null);
                        else onEditKey(e, tx.id, field);
                    }}
                    {...props}
                />
            );
        }

        return (
            <input
                className="tt-input"
                autoFocus
                defaultValue={tx[field]}
                onChange={(e) => (editValueRef.current = e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") onSaveEdit(tx.id, field, editValueRef.current);
                    else if (e.key === "Escape") setEditing(null);
                    else onEditKey(e, tx.id, field);
                }}
                {...props}
            />
        );
    };

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
                                if (e.key === 'Escape') onCancelRow();
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
                                if (e.key === 'Escape') onCancelRow();
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
                    <input
                        className="tt-input"
                        value={draft.category || ''}
                        onChange={(e) => updateDraft('category', e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveRowClick();
                            if (e.key === 'Escape') onCancelRow();
                        }}
                    />
                ) : (
                    <div onDoubleClick={() => onCellDoubleClick(tx, "category")}>{tx.category}</div>
                )}
            </div>

            {/* Criticality */}
            <div className="tt-cell" title="Double click to edit">
                {isFieldEditing("criticality") ? (
                    renderFieldInput("criticality")
                ) : isRowEditing ? (
                    <input
                        className="tt-input"
                        value={draft.criticality || ''}
                        onChange={(e) => updateDraft('criticality', e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveRowClick();
                            if (e.key === 'Escape') onCancelRow();
                        }}
                    />
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
                            if (e.key === 'Escape') onCancelRow();
                        }}
                    />
                ) : tx.transactionDate ? (
                    new Date(tx.transactionDate).toLocaleDateString()
                ) : (
                    ""
                )}
            </div>

            {/* Account */}
            <div className="tt-cell" title="Double click to edit">
                {isFieldEditing("account") ? (
                    renderFieldInput("account")
                ) : isRowEditing ? (
                    <input
                        className="tt-input"
                        value={draft.account || ''}
                        onChange={(e) => updateDraft('account', e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveRowClick();
                            if (e.key === 'Escape') onCancelRow();
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
                    <input
                        className="tt-input"
                        value={draft.paymentMethod || ''}
                        onChange={(e) => updateDraft('paymentMethod', e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveRowClick();
                            if (e.key === 'Escape') onCancelRow();
                        }}
                    />
                ) : (
                    <div onDoubleClick={() => onCellDoubleClick(tx, "paymentMethod")}>{tx.paymentMethod}</div>
                )}
            </div>

            {/* Cleared column: small clickable indicator + edit controls */}
            <div className="tt-cleared-col" title={tx.cleared ? "Cleared" : "Uncleared"} style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                <button
                    className={`tt-cleared-btn${tx.cleared ? " cleared" : " uncleared"}`}
                    onClick={() => onToggleCleared(tx)}
                    aria-label={tx.cleared ? "Mark uncleared" : "Mark cleared"}
                >
                    {tx.cleared ? "✔" : "○"}
                </button>

                {/* Edit / Save / Cancel controls */}
                {isRowEditing ? (
                    <>
                        <button className="tt-link-btn" onClick={onSaveRowClick} disabled={isSaving}>Save</button>
                        <button className="tt-link-btn" onClick={onCancelRow} disabled={isSaving}>Cancel</button>
                        {isSaving && <span style={{ color: '#9be3a7' }}>Saving…</span>}
                        {inlineError && <div style={{ color: '#ff8a8a', marginTop: 6 }}>{inlineError}</div>}
                    </>
                ) : (
                    <>
                        <button className="tt-link-btn" onClick={onStartRowEdit}>Edit</button>
                    </>
                )}
            </div>
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
    toInputDate: PropTypes.func.isRequired,
    onToggleCleared: PropTypes.func.isRequired,
    setEditing: PropTypes.func.isRequired,
    savingIds: PropTypes.object,
    saveErrors: PropTypes.object,
    startEditingRow: PropTypes.func.isRequired,
};