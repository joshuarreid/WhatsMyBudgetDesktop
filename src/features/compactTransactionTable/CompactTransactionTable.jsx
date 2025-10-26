import React from 'react';
import PropTypes from 'prop-types';
import { useTransactionTable } from '../transactionTable/hooks/useTransactionTable';
import CompactTransactionHeader from './components/CompactTransactionHeader';
import CompactTransactionRow from './components/CompactTransactionRow';
import CompactTransactionBalanceRow from './components/CompactTransactionBalanceRow';
import './CompactTransactionTable.css';

const logger = {
    info: (...args) => console.log('[CompactTransactionTable]', ...args),
    error: (...args) => console.error('[CompactTransactionTable]', ...args),
};

/**
 * CompactTransactionTable
 *
 * Read-only, minimal transaction table optimized for the weekly modal.
 * - Always shows balances at the top.
 * - Columns: Name | Amount | Date (in that order).
 * - No selection/toolbar/editing UI.
 *
 * Props:
 * - filters: object (account is required)
 * - statementPeriod: optional
 * - onRowClick(tx): optional handler when a row is clicked
 */
export default function CompactTransactionTable({ filters, statementPeriod, onRowClick }) {
    logger.info('render', { hasFilters: Boolean(filters), account: filters?.account });

    const { localTx, loading, error, total, jointBalance, personalBalance } =
        useTransactionTable(filters, statementPeriod);

    if (error) {
        logger.error('useTransactionTable error', error);
        return <div className="ct-compact-empty">Error: {error.message || String(error)}</div>;
    }

    if (!filters || !filters.account) {
        logger.error('missing account in filters', { filters });
        return <div className="ct-compact-empty">Error: Account is required to display transactions.</div>;
    }

    return (
        <div className="ct-compact-card" role="region" aria-label="Compact transactions">
            <CompactTransactionBalanceRow total={total} joint={jointBalance} personal={personalBalance} />

            <CompactTransactionHeader />

            <div className="ct-compact-body" role="list" aria-busy={loading ? 'true' : 'false'}>
                {loading && <div className="ct-compact-loading">Loading…</div>}

                {!loading && (!localTx || localTx.length === 0) && (
                    <div className="ct-compact-empty">No transactions for this week.</div>
                )}

                {!loading &&
                    localTx &&
                    localTx.map((tx) => (
                        <CompactTransactionRow key={tx.id} tx={tx} onClick={() => onRowClick?.(tx)} />
                    ))}
            </div>
        </div>
    );
}

CompactTransactionTable.propTypes = {
    filters: PropTypes.object.isRequired,
    statementPeriod: PropTypes.object,
    onRowClick: PropTypes.func,
};