import React, { useState } from 'react';
import useCategorizedTable from './useCategorizedTable';
import './CategorizedTable.css';
import CategoryTableHeader from './components/CategoryTableHeader';
import CategoryTableBody from './components/CategoryTableBody';
import CategoryTableFooter from './components/CategoryTableFooter';
import CategoryTableTitle from './components/CategoryTableTitle';
import CategoryWeeklyModal from "../categoryWeeklyModal/CategoryWeeklyModal";
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
 * - Renders a categorized transaction table with weekly modal support.
 *
 * @param {object} props - Component props.
 * @returns {JSX.Element}
 */
export default function CategorizedTable(props) {
    logger.info('render start', { title: props.title });

    // Consume the statement period context
    const { statementPeriod } = useStatementPeriodContext();

    const {
        loading,
        error,
        rows,
        totalSum,
        fmt,
        filters,
        transactions, // useCategorizedTable exposes transactions
    } = useCategorizedTable(props);

    logger.info('render data', {
        loading,
        error: Boolean(error),
        rowsCount: rows.length,
        filters,
        transactionsCount: transactions?.length ?? 0,
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
            <CategoryTableFooter totalSum={totalSum} fmt={fmt} />

            <CategoryWeeklyModal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                category={selectedCategory}
                transactions={transactions}
                fmt={fmt}
                options={{
                    ...props.weekOptions,
                    statementPeriod, // <-- Pass statementPeriod to modal options
                }}
                account={props.account ?? filters?.account}
            />
        </div>
    );
}