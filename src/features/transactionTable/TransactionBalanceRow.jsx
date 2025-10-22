import React from "react";

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(Number(amount) || 0);
}

/**
 * TransactionBalanceRow
 *
 * Props:
 * - total: number
 * - joint: number
 * - personal: number
 */
export function TransactionBalanceRow({
    total,
    joint,
    personal,
}) {
    return (
        <div className="tt-balance-row" role="region" aria-label="Balances">
            <div className="tt-balance-item" data-testid="balance-total">
                <div className="tt-balance-amount">{formatCurrency(total)}</div>
                <div className="tt-balance-label">Total Balance</div>
            </div>
            <div className="tt-balance-item" data-testid="balance-joint">
                <div className="tt-balance-amount">{formatCurrency(joint)}</div>
                <div className="tt-balance-label">Joint Balance</div>
            </div>
            <div className="tt-balance-item" data-testid="balance-personal">
                <div className="tt-balance-amount">{formatCurrency(personal)}</div>
                <div className="tt-balance-label">Personal Balance</div>
            </div>
        </div>
    );
}

export default TransactionBalanceRow;