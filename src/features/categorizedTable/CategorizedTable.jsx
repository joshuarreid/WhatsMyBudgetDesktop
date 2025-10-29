/**
 * CategorizedTable
 * - Renders a categorized transaction table with weekly modal support.
 * - Displays current balance and projected balance (in yellow) side by side in the footer.
 * - Filters on the provider's selected statement period.
 *
 * @module CategorizedTable
 * @param {object} props - Component props.
 * @returns {JSX.Element}
 */

import React, { useState, useMemo } from 'react';
import useCategorizedTable from './useCategorizedTable';
import './CategorizedTable.css';
import CategoryTableHeader from './components/CategoryTableHeader';
import CategoryTableBody from './components/CategoryTableBody';
import CategoryTableFooter from './components/CategoryTableFooter';
import CategoryTableTitle from './components/CategoryTableTitle';
import CategoryWeeklyModal from "../categoryWeeklyModal/CategoryWeeklyModal";
import { useStatementPeriodContext } from '../../context/StatementPeriodProvider';
import useProjectedTransactions from '../../hooks/useProjectedTransactions';

/**
 * Logger for CategorizedTable
 * @constant
 */
const logger = {
    info: (...args) => console.log('[CategorizedTable]', ...args),
    error: (...args) => console.error('[CategorizedTable]', ...args),
};

/**
 * CategorizedTable
 * Presentational component for categorized transactions, including
 * modal for weekly details and a footer showing current + projected balances.
 *
 * @param {object} props
 * @returns {JSX.Element}
 */
export default function CategorizedTable(props) {
    logger.info('render start', { title: props.title });

    // Consume the statement period context
    const { statementPeriod } = useStatementPeriodContext();

    /**
     * Merges filters with the selected statement period from context.
     * Memoized to prevent infinite renders and redundant API calls.
     *
     * @constant
     * @type {object}
     */
    const mergedFilters = useMemo(() => ({
        ...(props.filters || {}),
        statementPeriod,
    }), [props.filters, statementPeriod]);

    const {
        loading,
        error,
        rows,
        totalSum,
        fmt,
        filters,
        transactions,
    } = useCategorizedTable({
        ...props,
        filters: mergedFilters,
    });

    // Get projected balance using custom hook
    const { projectedTx = [] } = useProjectedTransactions({
        statementPeriod,
        account: props.account ?? filters?.account,
    });
    const projectedTotal = useMemo(() => {
        return Array.isArray(projectedTx)
            ? projectedTx.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
            : 0;
    }, [projectedTx]);

    logger.info('render data', {
        loading,
        error: Boolean(error),
        rowsCount: rows.length,
        filters,
        transactionsCount: transactions?.length ?? 0,
        projectedCount: projectedTx?.length ?? 0,
        projectedTotal,
        statementPeriod,
    });

    // Modal state (open selected category)
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);

    /**
     * Handles row click to open the weekly modal.
     * @param {string} category
     */
    const handleRowClick = (category) => {
        logger.info('row clicked', { category });

        // Ensure we have an account before opening the nested TransactionTable modal.
        const account = props.account ?? filters?.account;
        if (!account) {
            logger.error('cannot open weekly modal - account is required', { category });
            return;
        }

        setSelectedCategory(category);
        setModalOpen(true);
    };

    /**
     * Handles closing the modal.
     */
    const handleCloseModal = () => {
        logger.info('modal close requested', { category: selectedCategory });
        setModalOpen(false);
        setSelectedCategory(null);
    };

    if (error)
        return (
            <div className="ct-empty">
                Error: {error?.message || String(error)}
            </div>
        );

    return (
        <div className="ct-card">
            <CategoryTableTitle title={props.title} loading={loading} />
            <CategoryTableHeader />
            <CategoryTableBody
                rows={rows}
                totalSum={totalSum}
                fmt={fmt}
                loading={loading}
                onRowClick={handleRowClick}
            />
            <CategoryTableFooter
                totalSum={totalSum}
                projected={projectedTotal}
                fmt={fmt}
            />

            <CategoryWeeklyModal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                category={selectedCategory}
                transactions={transactions}
                fmt={fmt}
                options={{
                    ...props.weekOptions,
                    statementPeriod,
                }}
                account={props.account ?? filters?.account}
            />
        </div>
    );
}