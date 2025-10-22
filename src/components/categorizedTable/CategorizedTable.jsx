import React, { useMemo } from 'react';
import useTransactions from '../../hooks/useTransactions';
import './CategorizedTable.css';
import CategoryTableHeader from './CategoryTableHeader';
import CategoryTableBody from './CategoryTableBody';
import CategoryTableFooter from './CategoryTableFooter';
import CategoryTableTitle from './CategoryTableTitle';

export default function CategorizedTable(props) {
    const logger = {
        info: (...args) => console.info('[CategorizedTable]', ...args),
        error: (...args) => console.error('[CategorizedTable]', ...args),
    };

    const filters = props.filters ?? props;
    logger.info('filters', filters);
    const txResult = useTransactions(filters || {});
    const transactions = Array.isArray(txResult?.data) ? txResult.data : [];
    const { loading, error } = txResult || {};

    logger.info('Calculating category totals');
    const totalsByCategory = useMemo(() => {
        return transactions.reduce((acc, tx) => {
            const cat = tx && tx.category ? tx.category : 'Uncategorized';
            const amount = Number(tx && tx.amount ? tx.amount : 0);
            acc[cat] = (acc[cat] || 0) + (isNaN(amount) ? 0 : amount);
            return acc;
        }, {});
    }, [transactions]);

    const rows = Object.entries(totalsByCategory).sort(([a], [b]) =>
        a.localeCompare(b)
    );

    const totalSum = rows.reduce((s, [, value]) => s + value, 0);
    const fmt = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });

    // Don't return early on loading — render the table shell so the UI stays stable.
    if (error) return <div className="ct-empty">Error: {error.message || String(error)}</div>;

    return (
        <div className="ct-card">
            <CategoryTableTitle title={props.title} loading={loading} />
            <CategoryTableHeader />
            <CategoryTableBody rows={rows} totalSum={totalSum} fmt={fmt} loading={loading} />
            <CategoryTableFooter totalSum={totalSum} fmt={fmt} />
        </div>
    );
}