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
 * - cleared: number
 * - uncleared?: number
 * - working?: number
 * - showUncleared?: boolean (default: false)
 * - showWorking?: boolean (default: false)
 */
export function TransactionBalanceRow({
                                          cleared,
                                          uncleared,
                                          working,
                                          showUncleared = false,
                                          showWorking = false,
                                      }) {
    return (
        <div className="tt-balance-row" role="region" aria-label="Balances">
            <div className="tt-balance-item" data-testid="balance-cleared">
                <div className="tt-balance-amount">{formatCurrency(cleared)}</div>
                <div className="tt-balance-label">Projected Balance</div>
            </div>
            {showUncleared && (
                <div className="tt-balance-item" data-testid="balance-uncleared">
                    <div className="tt-balance-amount">{formatCurrency(uncleared)}</div>
                    <div className="tt-balance-label">Uncleared</div>
                </div>
            )}
            {showWorking && (
                <div className="tt-balance-item tt-working" data-testid="balance-working">
                    <div className="tt-balance-amount">{formatCurrency(working)}</div>
                    <div className="tt-balance-label">Working Balance</div>
                </div>
            )}
        </div>
    );
}

export default TransactionBalanceRow;