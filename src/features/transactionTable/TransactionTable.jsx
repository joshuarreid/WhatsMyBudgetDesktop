import React from 'react';
import { useTransactionTable } from './hooks/useTransactionTable';
import './TransactionTable.css';
import BalanceWidget from './components/BalanceWidget/BalanceWidget';
import TransactionToolbar from './components/TransactionToolbar';
import TransactionHeaderRow from './components/TransactionHeaderRow';
import TransactionRow from './components/TransactionRow/TransactionRow';

// Currency formatter, colocated for presentation
const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
});

export default function TransactionTable(props) {
    const filters = props && Object.keys(props).length > 0 ? (props.filters ?? props) : undefined;
    const statementPeriod = props?.statementPeriod;

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
        isAllSelected,
        toggleSelect,
        toggleSelectAll,
        handleAddTransaction,
        handleDeleteSelected,
        handleFileChange,
        openFilePicker,
        handleCellDoubleClick,
        handleEditKey,
        handleSaveEdit,
        handleSaveRow,
        handleCancelRow, // new
        toInputDate,
        toggleCleared,
        setEditing,
        savingIds,
        saveErrors,
        startEditingRow,
    } = useTransactionTable(filters, statementPeriod);

    // Don't return early on loading — render the table shell so the UI stays stable.
    if (error) return <div className="tt-empty">Error: {error.message || String(error)}</div>;

    // Ensure account is present in filters
    if (!filters || !filters.account) {
        return <div className="tt-empty">Error: Account is required to display transactions.</div>;
    }

    if (!localTx || localTx.length === 0)
        return (
            <div className="tt-card">
                <BalanceWidget
                    total={total}
                    joint={jointBalance}
                    personal={personalBalance}
                />
                <TransactionToolbar
                    onAdd={handleAddTransaction}
                    onImport={openFilePicker}
                    onDelete={handleDeleteSelected}
                    selectedCount={selectedIds.size}
                    fileInputRef={fileInputRef}
                    onFileChange={handleFileChange}
                    loading={loading}
                    total={fmt.format(total)}
                />
                {/* Keep the header so the table shell is visible during loading */}
                <TransactionHeaderRow isAllSelected={isAllSelected} toggleSelectAll={toggleSelectAll} />
                <div className="tt-body">{loading ? null : <div className="tt-empty">No transactions</div>}</div>
            </div>
        );

    return (
        <div className="tt-card">
            <BalanceWidget
                total={total}
                joint={jointBalance}
                personal={personalBalance}
            />
            <TransactionToolbar
                onAdd={handleAddTransaction}
                onImport={openFilePicker}
                onDelete={handleDeleteSelected}
                selectedCount={selectedIds.size}
                fileInputRef={fileInputRef}
                onFileChange={handleFileChange}
                loading={loading}
                total={fmt.format(total)}
            />
            <TransactionHeaderRow isAllSelected={isAllSelected} toggleSelectAll={toggleSelectAll} />
            <div className="tt-body">
                {localTx.map((tx) => (
                    <TransactionRow
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
                        onCancelRow={handleCancelRow} // pass handler
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