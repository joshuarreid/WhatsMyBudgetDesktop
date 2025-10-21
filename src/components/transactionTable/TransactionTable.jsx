import React from 'react';
import useTransactions from '../../hooks/useTransactions';
import './TransactionTable.css';

export default function TransactionTable(props) {
    // Determine if the component was rendered without props (empty object).
    const hasProps = props && Object.keys(props).length > 0;

    // If no props were provided, pass undefined to useTransactions so it fetches all.
    // Otherwise use props.filters (preferred) or props as the filters object.
    const filters = hasProps ? (props.filters ?? props) : undefined;

    const txResult = useTransactions(filters);
    const transactions = Array.isArray(txResult?.data) ? txResult.data : [];
    const { loading, error } = txResult || {};

    const fmt = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });

    if (loading) return <div className="tt-empty">Loading...</div>;
    if (error) return <div className="tt-empty">Error: {error.message || String(error)}</div>;
    if (transactions.length === 0) return <div className="tt-empty">No transactions</div>;

    return (
        <div className="tt-card">
            <div className="tt-header-row">
                <div>Name</div>
                <div style={{ textAlign: 'right' }}>Amount</div>
                <div>Category</div>
                <div>Criticality</div>
                <div>Date</div>
                <div>Account</div>
                <div>Payment Method</div>
            </div>

            <div className="tt-body">
                {transactions.map((tx) => (
                    <div className="tt-row" key={tx.id}>
                        <div>{tx.name}</div>
                        <div style={{ textAlign: 'right' }}>{fmt.format(tx.amount)}</div>
                        <div>{tx.category}</div>
                        <div>{tx.criticality}</div>
                        <div>{new Date(tx.transaction_date).toLocaleDateString()}</div>
                        <div>{tx.account}</div>
                        <div>{tx.payment_method}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
