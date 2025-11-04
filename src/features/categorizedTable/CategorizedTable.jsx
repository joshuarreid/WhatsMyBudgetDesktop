/**
 * CategorizedTable
 * - Renders a categorized transaction table with weekly modal support.
 * - Presentation-only: all data and business logic pulled from useCategorizedTable hook.
 *
 * @module CategorizedTable
 */

import React, { useState, useMemo } from 'react';
import useCategorizedTable from './hooks/useCategorizedTable';
import './styles/CategorizedTable.css';
import CategoryTableHeader from './components/CategoryTableHeader';
import CategoryTableBody from './components/CategoryTableBody';
import CategoryTableFooter from './components/CategoryTableFooter';
import CategoryTableTitle from './components/CategoryTableTitle';
import CategoryWeeklyModal from '../categoryWeeklyModal/CategoryWeeklyModal';
import { useStatementPeriodContext } from '../../context/StatementPeriodProvider';

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
 *
 * UI-only component. All fetching / composition logic lives in useCategorizedTable.
 *
 * @param {object} props
 * @returns {JSX.Element}
 */
export default function CategorizedTable(props) {
    logger.info('render start', { title: props.title });

    const { statementPeriod } = useStatementPeriodContext();

    const mergedFilters = useMemo(
        () => ({
            ...(props.filters || {}),
            statementPeriod,
        }),
        [props.filters, statementPeriod]
    );

    const {
        loading,
        error,
        rows,
        totalSum,
        fmt,
        filters,
        transactions,
        projectedTotal,
        projectedTotalsByCategory,
    } = useCategorizedTable({
        ...props,
        filters: mergedFilters,
    });

    logger.info('render data', {
        loading,
        error: Boolean(error),
        rowsCount: rows.length,
        filters,
        transactionsCount: transactions?.length ?? 0,
        projectedCount: (Array.isArray(projectedTotalsByCategory) ? projectedTotalsByCategory.length : Object.keys(projectedTotalsByCategory).length) ?? 0,
        projectedTotal,
        statementPeriod,
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