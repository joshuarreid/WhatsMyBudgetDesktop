import React, { useState } from 'react';
import budgetTransactionService from '../services/BudgetTransactionService';

/**
 * PingButton - Button for testing API getTransactions call.
 * Displays JSON result of GET /api/transactions.
 * Uses budgetTransactionService for REST API call with robust logging.
 */
export default function PingButton() {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    async function doPing() {
        setLoading(true);
        setResult(null);
        try {
            // Log method entry
            console.log('[PingButton] doPing called (fetching all transactions)');
            // Fetch all transactions (no filters)
            const transactions = await budgetTransactionService.getTransactions();
            // Log result
            console.log('[PingButton] Transactions fetched', { count: Array.isArray(transactions) ? transactions.length : 0 });
            setResult(JSON.stringify(transactions, null, 2));
        } catch (err) {
            console.error('[PingButton] Error fetching transactions', err);
            setResult('Error: ' + (err && err.message ? err.message : String(err)));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <button onClick={doPing} disabled={loading}>
                {loading ? 'Loading...' : 'Get Transactions'}
            </button>
            {result && (
                <pre style={{
                    textAlign: 'left',
                    background: '#111',
                    color: '#ddd',
                    padding: 12,
                    marginTop: 16,
                    maxWidth: 800,
                    overflowX: 'auto'
                }}>
                    {result}
                </pre>
            )}
        </div>
    );
}