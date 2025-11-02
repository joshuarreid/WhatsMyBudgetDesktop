/**
 * CategorizedTable
 * - Renders a categorized transaction table with weekly modal support.
 * - Displays current balance and projected balance (in yellow) side by side in the footer.
 * - Filters on the provider's selected statement period.
 *
 * NOTE: Import for StatementPeriodProvider updated to the tanStack variant so consumers use the same context.
 */

import React, { useState, useMemo } from 'react';
import useCategorizedTable from './useCategorizedTable';
import './CategorizedTable.css';
import CategoryTableHeader from './components/CategoryTableHeader';
import CategoryTableBody from './components/CategoryTableBody';
import CategoryTableFooter from './components/CategoryTableFooter';
import CategoryTableTitle from './components/CategoryTableTitle';
import CategoryWeeklyModal from "../categoryWeeklyModal/CategoryWeeklyModal";
// UPDATED: consume the tanStack provider context (same one registered in App)
import { useStatementPeriodContext } from '../../context/StatementPeriodProvider(tanStack)';
import useProjectedTransactions from '../../hooks/useProjectedTransactions';

/**
 * Logger for CategorizedTable
 * @constant
 */
const logger = {
    info: (...args) => console.log('[CategorizedTable]', ...args),
    error: (...args) => console.error('[CategorizedTable]', ...args),
};

export default function CategorizedTable(props) {
    logger.info('render start', { title: props.title });

    // Consume the statement period context (tanStack)
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

    // Get projected transactions using custom hook (left as legacy for now)
    const { projectedTx = [] } = useProjectedTransactions({
        statementPeriod,
        account: props.account ?? filters?.account,
    });

    const projectedTotal = useMemo(() => {
        const crit = String(mergedFilters.criticality || '').toLowerCase();
        return Array.isArray(projectedTx)
            ? projectedTx
                .filter(tx => String(tx.criticality || '').toLowerCase() === crit)
                .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
            : 0;
    }, [projectedTx, mergedFilters.criticality]);

    const projectedTotalsByCategory = useMemo(() => {
        const crit = String(mergedFilters.criticality || '').toLowerCase();
        if (!Array.isArray(projectedTx)) return {};
        return projectedTx
            .filter(tx => String(tx.criticality || '').toLowerCase() === crit)
            .reduce((acc, tx) => {
                const cat = tx.category || 'Uncategorized';
                const amount = Number(tx.amount) || 0;
                acc[cat] = (acc[cat] || 0) + amount;
                return acc;
            }, {});
    }, [projectedTx, mergedFilters.criticality]);

    logger.info('render data', {
        loading,
        error: Boolean(error),
        rowsCount: rows.length,
        filters,
        transactionsCount: transactions?.length ?? 0,
        projectedCount: projectedTx?.length ?? 0,
        projectedTotal,
        statementPeriod,
        projectedTotalsByCategory,
    });

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const handleRowClick = (category) => {
        logger.info('row clicked', { category });

        const account = props.account ?? filters?.account;
        if (!account) {
            logger.error('cannot open weekly modal - account is required', { category });
            return;
        }

        setSelectedCategory(category);
        setModalOpen(true);
    };

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
                projectedTotalsByCategory={projectedTotalsByCategory}
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