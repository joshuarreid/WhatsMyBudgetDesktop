import React from "react";
import PropTypes from "prop-types";

/**
 * TransactionHeaderRow
 *
 * Props:
 * - isAllSelected: boolean
 * - toggleSelectAll: function
 *
 * Note: cleared column removed to match updated row layout.
 */
export default function TransactionHeaderRow({ isAllSelected, toggleSelectAll }) {
    return (
        <div className="tt-header-row" role="row">
            <div className="tt-checkbox-col" role="columnheader">
                <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                />
            </div>
            <div role="columnheader">Name</div>
            <div role="columnheader" style={{ textAlign: 'right' }}>Amount</div>
            <div role="columnheader">Category</div>
            <div role="columnheader">Criticality</div>
            <div role="columnheader">Date</div>
            <div role="columnheader">Account</div>
            <div role="columnheader">Payment Method</div>
        </div>
    );
}

TransactionHeaderRow.propTypes = {
    isAllSelected: PropTypes.bool.isRequired,
    toggleSelectAll: PropTypes.func.isRequired,
};