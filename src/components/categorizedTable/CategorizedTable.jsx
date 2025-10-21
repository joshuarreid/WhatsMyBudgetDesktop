import React, { useMemo } from 'react';
import useTransactions from '../../hooks/useTransactions';
import './CategorizedTable.css';

export default function CategorizedTable(props) {
    const filters = props.filters ?? props;
    console.log('[CategorizedTable] filters:', filters);
    const txResult = useTransactions(filters || {});
    const transactions = Array.isArray(txResult?.data) ? txResult.data : [];
    const { loading, error } = txResult || {};

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

    if (loading) return <div className="ct-empty">Loading...</div>;
    if (error) return <div className="ct-empty">Error: {error.message || String(error)}</div>;
    if (rows.length === 0) return <div className="ct-empty">No transactions</div>;

    return (
        <div className="ct-card">
            <div className="ct-header-row">
                <div>Category</div>
                <div style={{ textAlign: 'right' }}>Amount</div>
            </div>

            <div className="ct-body">
                {rows.map(([category, total]) => {
                    const pct = totalSum > 0 ? Math.round((total / totalSum) * 100) : 0;
                    return (
                        <div className="ct-row" key={category}>
                            <div className="ct-col ct-cat">{category}</div>

                            <div className="ct-col ct-col-amount" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                                <div className="ct-amount">{fmt.format(total)}</div>
                                <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                                    <div className="ct-bar" style={{ width: 140 }}>
                                        <div
                                            className="ct-bar-fill"
                                            style={{ width: `${pct}%` }}
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <div className="ct-pct">{pct}%</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="ct-footer">
                <div>Total</div>
                <div style={{ textAlign: 'right' }}>{fmt.format(totalSum)}</div>
            </div>
        </div>
    );
}