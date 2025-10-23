import React from 'react';
import PropTypes from 'prop-types';

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const logger = {
    info: (...args) => console.log('[CompactTransactionBalanceRow]', ...args),
    error: (...args) => console.error('[CompactTransactionBalanceRow]', ...args),
};

/**
 * CompactTransactionBalanceRow
 *
 * Small balance row shown at top of compact table.
 */
export default function CompactTransactionBalanceRow({ total, joint, personal }) {
    logger.info('render', { total, joint, personal });
    return (
        <div className="ct-compact-balances" role="group" aria-label="Balances">
            <div className="ct-compact-balance-item">
                <div className="ct-compact-balance-label">Total</div>
                <div className="ct-compact-balance-value">{fmt.format(total ?? 0)}</div>
            </div>

            <div className="ct-compact-balance-item">
                <div className="ct-compact-balance-label">Joint</div>
                <div className="ct-compact-balance-value">{fmt.format(joint ?? 0)}</div>
            </div>

            <div className="ct-compact-balance-item">
                <div className="ct-compact-balance-label">Personal</div>
                <div className="ct-compact-balance-value">{fmt.format(personal ?? 0)}</div>
            </div>
        </div>
    );
}

CompactTransactionBalanceRow.propTypes = {
    total: PropTypes.number,
    joint: PropTypes.number,
    personal: PropTypes.number,
};