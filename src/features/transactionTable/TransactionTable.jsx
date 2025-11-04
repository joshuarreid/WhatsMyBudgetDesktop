/**
 * TransactionTable
 * - Main table UI for displaying, editing, and managing transactions.
 * - Uses useTransactionTable for business/data logic.
 * - Keeps table shell visible and responsive during context or data loading for smooth UX.
 *
 * @param {Object} props
 * @param {Object} props.filters - Account and other filter criteria
 * @returns {JSX.Element}
 */

import React from 'react';
import { useTransactionTable } from './hooks/useTransactionTable';
import { useStatementPeriodContext } from '../../context/StatementPeriodProvider';
import './styles/TransactionTable.css';
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
 * Logger for TransactionTable.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[TransactionTable]', ...args),
    error: (...args) => console.error('[TransactionTable]', ...args),
};

export default function TransactionTable(props) {
    logger.info('TransactionTable initialized', { props });

    const { isLoaded: isStatementPeriodLoaded, statementPeriod } = useStatementPeriodContext();

    const filters = props && Object.keys(props).length > 0 ? (props.filters ?? props) : undefined;

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
        toolbar,
        openFilePicker,
    } = useTransactionTable(filters);

    /**
     * Error handling for transaction fetch.
     */
    if (error) {
        logger.error('TransactionTable error', error);
        return (
            <div className="tt-empty">
                Error: {error.message || String(error)}
            </div>
        );
    }

    /**
     * Ensure account is present in filters.
     */
    if (!filters || !filters.account) {
        logger.error('TransactionTable missing account filter');
        return (
            <div className="tt-empty">
                Error: Account is required to display transactions.
            </div>
        );
    }

    /**
     * While the statement period is not loaded or is undefined, render table shell.
     * This ensures a consistent UX and prevents blank page flashes.
     * Always renders empty rows and zero balances during context loading or transition.
     */
    if (!isStatementPeriodLoaded || statementPeriod === undefined) {
        logger.info('TransactionTable waiting for statement period context');
        return (
            <div className="tt-card">
                <BalanceWidget
                    total={0}
                    joint={0}
                    personal={0}
                    projected={0}
                />
                <TransactionTableToolbar
                    toolbar={{
                        ...toolbar,
                        total: fmt.format(0),
                        loading: true,
                    }}
                />
                <TransactionTableHeader isAllSelected={false} toggleSelectAll={() => {}} />
                <div className="tt-body">
                    <div className="tt-empty"></div>
                </div>
            </div>
        );
    }

    /**
     * Empty state rendering: shell always stays mounted.
     * Table body shows loading spinner or empty message as needed.
     * Renders nothing while loading or if there are no transactions.
     */
    if (!localTx || localTx.length === 0) {
        logger.info('TransactionTable empty state', { loading });
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
                    <div className="tt-empty"></div>
                </div>
            </div>
        );
    }

    /**
     * Main table rendering: always keep shell visible, load rows as data arrives.
     */
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