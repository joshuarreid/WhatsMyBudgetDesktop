import React from 'react';
import useCategorizedTable from './useCategorizedTable';
import './CategorizedTable.css';
import CategoryTableHeader from './CategoryTableHeader';
import CategoryTableBody from './CategoryTableBody';
import CategoryTableFooter from './CategoryTableFooter';
import CategoryTableTitle from './CategoryTableTitle';

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
    } = useCategorizedTable(props);

    logger.info('render data', {
        loading,
        error: Boolean(error),
        rowsCount: rows.length,
        filters,
    });


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
            />
            <CategoryTableFooter totalSum={totalSum} fmt={fmt} />
        </div>
    );
}