import React from 'react';

/**
 * CompactTransactionHeader
 *
 * Simple, accessible header that matches the compact rows: Name | Amount | Date
 */
export default function CompactTransactionHeader() {
    return (
        <div className="ct-compact-header" role="row" aria-hidden="false">
            <div className="ct-compact-col ct-compact-col--name">Name</div>
            <div className="ct-compact-col ct-compact-col--amount" aria-label="Amount">
                Amount
            </div>
            <div className="ct-compact-col ct-compact-col--date" aria-label="Date">
                Date
            </div>
        </div>
    );
}