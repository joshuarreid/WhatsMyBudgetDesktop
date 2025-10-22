import React, { useState } from 'react';
import useCategorizedTable from './useCategorizedTable';
import './CategorizedTable.css';
import CategoryTableHeader from './CategoryTableHeader';
import CategoryTableBody from './CategoryTableBody';
import CategoryTableFooter from './CategoryTableFooter';
import CategoryTableTitle from './CategoryTableTitle';
import CategoryWeeklyModal from "../categoryWeeklyModal/CategoryWeeklyModal";


const logger = {
    info: (...args) => console.log('[CategorizedTable]', ...args),
    error: (...args) => console.error('[CategorizedTable]', ...args),
};

export default function CategorizedTable(props) {
    logger.info('render start', { title: props.title });

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

    const handleRowClick = (category) => {
        logger.info('row clicked', { category });
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
            />
            <CategoryTableFooter totalSum={totalSum} fmt={fmt} />

            <CategoryWeeklyModal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                category={selectedCategory}
                transactions={transactions}
                fmt={fmt}
                options={props.weekOptions}
            />
        </div>
    );
}