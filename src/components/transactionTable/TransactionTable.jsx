import React from 'react';
import { useTransactionTable } from './useTransactionTable';
import './TransactionTable.css';
import TransactionBalanceRow from './TransactionBalanceRow';
import TransactionToolbar from './TransactionToolbar';
import TransactionHeaderRow from './TransactionHeaderRow';
import TransactionRow from './TransactionRow';

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
        clearedBalance,
        unclearedBalance,
        workingBalance,
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
        toInputDate,
        toggleCleared,
        setEditing,
        savingIds,
        saveErrors,
        startEditingRow,
    } = useTransactionTable(filters, statementPeriod);

    if (loading) return <div className="tt-empty">Loading...</div>;
    if (error) return <div className="tt-empty">Error: {error.message || String(error)}</div>;

    if (!localTx || localTx.length === 0)
        return (
            <div className="tt-card">
                <TransactionBalanceRow
                    cleared={clearedBalance}
                    uncleared={unclearedBalance}
                    working={workingBalance}
                    showUncleared={true}
                    showWorking={true}
                />
                <TransactionToolbar
                    onAdd={handleAddTransaction}
                    onImport={openFilePicker}
                    onDelete={handleDeleteSelected}
                    selectedCount={selectedIds.size}
                    fileInputRef={fileInputRef}
                    onFileChange={handleFileChange}
                    loading={loading}
                    total={fmt.format(workingBalance)}
                />
                <div className="tt-empty">No transactions</div>
            </div>
        );

    return (
        <div className="tt-card">
            <TransactionBalanceRow
                cleared={clearedBalance}
                uncleared={unclearedBalance}
                working={workingBalance}
                showUncleared={true}
                showWorking={true}
            />
            <TransactionToolbar
                onAdd={handleAddTransaction}
                onImport={openFilePicker}
                onDelete={handleDeleteSelected}
                selectedCount={selectedIds.size}
                fileInputRef={fileInputRef}
                onFileChange={handleFileChange}
                loading={loading}
                total={fmt.format(workingBalance)}
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