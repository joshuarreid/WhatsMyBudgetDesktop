import React from 'react';
import { useTransactionTable } from './hooks/useTransactionTable';
import './TransactionTable.css';
import BalanceWidget from './components/BalanceWidget/BalanceWidget';
import TransactionTableToolbar from './components/TransactionTableToolbar/TransactionTableToolbar';
import TransactionTableHeader from './components/TransactionTableHeader/TransactionTableHeader';
import TransactionTableRow from './components/TransactionTableRow/TransactionTableRow';

/**
 * Currency formatter for USD display.
 * @constant
 */
const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
});

/**
 * TransactionTable
 * - Main table UI for displaying, editing, and managing transactions.
 * - Uses useTransactionTable for business/data logic.
 *
 * @param {Object} props
 * @param {Object} props.filters - Account and other filter criteria
 * @param {string} props.statementPeriod - Statement period for transaction grouping
 * @returns {JSX.Element}
 */
export default function TransactionTable(props) {
    const filters = props && Object.keys(props).length > 0 ? (props.filters ?? props) : undefined;
    const statementPeriod = props?.statementPeriod;

    /**
     * useTransactionTable hook
     * - Provides state, handlers, and toolbar logic for table UI.
     */
    const {
        localTx,
        loading,
        error,
        selectedIds,
        editing,
        editValueRef,
        fileInputRef,
        total,
        jointBalance,
        personalBalance,
        projectedTotal,
        isAllSelected,
        toggleSelect,
        toggleSelectAll,
        handleCellDoubleClick,
        handleEditKey,
        handleSaveEdit,
        handleSaveRow,
        handleCancelRow,
        toInputDate,
        toggleCleared,
        setEditing,
        savingIds,
        saveErrors,
        startEditingRow,
        toolbar, // <-- toolbar logic object
    } = useTransactionTable(filters, statementPeriod);

    // --- UI rendering logic ---
    // Error handling
    if (error) {
        return (
            <div className="tt-empty">
                Error: {error.message || String(error)}
            </div>
        );
    }

    // Ensure account is present in filters
    if (!filters || !filters.account) {
        return (
            <div className="tt-empty">
                Error: Account is required to display transactions.
            </div>
        );
    }

    // Empty state rendering
    if (!localTx || localTx.length === 0) {
        return (
            <div className="tt-card">
                <BalanceWidget
                    total={total}
                    joint={jointBalance}
                    personal={personalBalance}
                    projected={projectedTotal}
                />
                <TransactionTableToolbar
                    toolbar={{
                        ...toolbar,
                        total: fmt.format(total),
                    }}
                />
                {/* Table header remains visible during loading */}
                <TransactionTableHeader isAllSelected={isAllSelected} toggleSelectAll={toggleSelectAll} />
                <div className="tt-body">{loading ? null : <div className="tt-empty"></div>}</div>
            </div>
        );
    }

    // Main table rendering
    return (
        <div className="tt-card">
            <BalanceWidget
                total={total}
                joint={jointBalance}
                personal={personalBalance}
                projected={projectedTotal}
            />
            <TransactionTableToolbar
                toolbar={{
                    ...toolbar,
                    total: fmt.format(total),
                }}
            />
            <TransactionTableHeader isAllSelected={isAllSelected} toggleSelectAll={toggleSelectAll} />
            <div className="tt-body">
                {localTx.map((tx) => (
                    <TransactionTableRow
                        key={tx.id}
                        tx={tx}
                        selected={selectedIds.has(tx.id)}
                        onSelect={() => toggleSelect(tx.id)}
                        editing={editing}
                        editValueRef={editValueRef}
                        onCellDoubleClick={handleCellDoubleClick}
                        onEditKey={handleEditKey}
                        onSaveEdit={handleSaveEdit}
                        onSaveRow={handleSaveRow}
                        onCancelRow={handleCancelRow}
                        toInputDate={toInputDate}
                        onToggleCleared={toggleCleared}
                        setEditing={setEditing}
                        savingIds={savingIds}
                        saveErrors={saveErrors}
                        startEditingRow={startEditingRow}
                    />
                ))}
            </div>
        </div>
    );
}