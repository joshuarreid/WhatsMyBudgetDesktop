import React from "react";
import PropTypes from "prop-types";

/**
 * TransactionRow
 *
 * Props:
 * - tx: transaction object
 * - selected: boolean
 * - onSelect: function
 * - editing: {id, field} or null
 * - editValueRef: ref
 * - onCellDoubleClick: function
 * - onEditKey: function
 * - onSaveEdit: function
 * - toInputDate: function
 * - onToggleCleared: function
 */
export default function TransactionRow({
                                           tx,
                                           selected,
                                           onSelect,
                                           editing,
                                           editValueRef,
                                           onCellDoubleClick,
                                           onEditKey,
                                           onSaveEdit,
                                           toInputDate,
                                           onToggleCleared,
                                       }) {
    const isEditing = (field) => editing && editing.id === tx.id && editing.field === field;

    // For robust logging, you can log errors in event handlers if you add async logic here.
    // e.g. try/catch in onSaveEdit, onToggleCleared, etc.

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
            <div
                className="tt-cell"
                onDoubleClick={() => onCellDoubleClick(tx, "name")}
                title="Double click to edit"
            >
                {isEditing("name") ? (
                    <input
                        className="tt-input"
                        autoFocus
                        defaultValue={tx.name}
                        onChange={(e) => (editValueRef.current = e.target.value)}
                        onKeyDown={(e) => onEditKey(e, tx.id, "name")}
                        onBlur={() => onSaveEdit(tx.id, "name", editValueRef.current)}
                    />
                ) : (
                    tx.name
                )}
            </div>

            {/* Amount */}
            <div
                className="tt-cell tt-amount"
                onDoubleClick={() => onCellDoubleClick(tx, "amount")}
                title="Double click to edit"
                style={{ textAlign: "right" }}
            >
                {isEditing("amount") ? (
                    <input
                        className="tt-input tt-input-number"
                        type="number"
                        step="0.01"
                        autoFocus
                        defaultValue={String(tx.amount)}
                        onChange={(e) => (editValueRef.current = e.target.value)}
                        onKeyDown={(e) => onEditKey(e, tx.id, "amount")}
                        onBlur={() => onSaveEdit(tx.id, "amount", editValueRef.current)}
                    />
                ) : (
                    // Amount formatting can be moved up if desired
                    new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                    }).format(Number(tx.amount) || 0)
                )}
            </div>

            {/* Category */}
            <div
                className="tt-cell"
                onDoubleClick={() => onCellDoubleClick(tx, "category")}
                title="Double click to edit"
            >
                {isEditing("category") ? (
                    <input
                        className="tt-input"
                        autoFocus
                        defaultValue={tx.category}
                        onChange={(e) => (editValueRef.current = e.target.value)}
                        onKeyDown={(e) => onEditKey(e, tx.id, "category")}
                        onBlur={() => onSaveEdit(tx.id, "category", editValueRef.current)}
                    />
                ) : (
                    tx.category
                )}
            </div>

            {/* Criticality */}
            <div
                className="tt-cell"
                onDoubleClick={() => onCellDoubleClick(tx, "criticality")}
                title="Double click to edit"
            >
                {isEditing("criticality") ? (
                    <input
                        className="tt-input"
                        autoFocus
                        defaultValue={tx.criticality}
                        onChange={(e) => (editValueRef.current = e.target.value)}
                        onKeyDown={(e) => onEditKey(e, tx.id, "criticality")}
                        onBlur={() => onSaveEdit(tx.id, "criticality", editValueRef.current)}
                    />
                ) : (
                    tx.criticality
                )}
            </div>

            {/* Date */}
            <div
                className="tt-cell"
                onDoubleClick={() => onCellDoubleClick(tx, "transactionDate")}
                title="Double click to edit"
            >
                {isEditing("transactionDate") ? (
                    <input
                        className="tt-input"
                        type="date"
                        autoFocus
                        defaultValue={toInputDate(tx.transactionDate)}
                        onChange={(e) => (editValueRef.current = e.target.value)}
                        onKeyDown={(e) => onEditKey(e, tx.id, "transactionDate")}
                        onBlur={() => onSaveEdit(tx.id, "transactionDate", editValueRef.current)}
                    />
                ) : tx.transactionDate ? (
                    new Date(tx.transactionDate).toLocaleDateString()
                ) : (
                    ""
                )}
            </div>

            {/* Account */}
            <div
                className="tt-cell"
                onDoubleClick={() => onCellDoubleClick(tx, "account")}
                title="Double click to edit"
            >
                {isEditing("account") ? (
                    <input
                        className="tt-input"
                        autoFocus
                        defaultValue={tx.account}
                        onChange={(e) => (editValueRef.current = e.target.value)}
                        onKeyDown={(e) => onEditKey(e, tx.id, "account")}
                        onBlur={() => onSaveEdit(tx.id, "account", editValueRef.current)}
                    />
                ) : (
                    tx.account
                )}
            </div>

            {/* Payment Method */}
            <div
                className="tt-cell"
                onDoubleClick={() => onCellDoubleClick(tx, "paymentMethod")}
                title="Double click to edit"
            >
                {isEditing("paymentMethod") ? (
                    <input
                        className="tt-input"
                        autoFocus
                        defaultValue={tx.paymentMethod}
                        onChange={(e) => (editValueRef.current = e.target.value)}
                        onKeyDown={(e) => onEditKey(e, tx.id, "paymentMethod")}
                        onBlur={() => onSaveEdit(tx.id, "paymentMethod", editValueRef.current)}
                    />
                ) : (
                    tx.paymentMethod
                )}
            </div>

            {/* Cleared column: small clickable indicator */}
            <div className="tt-cleared-col" title={tx.cleared ? "Cleared" : "Uncleared"}>
                <button
                    className={`tt-cleared-btn${tx.cleared ? " cleared" : " uncleared"}`}
                    onClick={() => onToggleCleared(tx)}
                    aria-label={tx.cleared ? "Mark uncleared" : "Mark cleared"}
                >
                    {tx.cleared ? "✔" : "○"}
                </button>
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
    toInputDate: PropTypes.func.isRequired,
    onToggleCleared: PropTypes.func.isRequired,
};