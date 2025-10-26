/**
 * TransactionTableHeader (module-scoped)
 *
 * - Uses CSS Modules for scoped styling to eliminate reliance on global classnames.
 * - Keeps the header layout in a module so it aligns with component-scoped row styles.
 *
 * Bulletproof notes:
 * - This is a presentational component with minimal props.
 * - Logging included for visibility (render passes).
 */

import React from "react";
import PropTypes from "prop-types";
import styles from "./TransactionTableHeader.module.css";

const logger = {
    info: (...args) => console.log("[TransactionTableHeader]", ...args),
    error: (...args) => console.error("[TransactionTableHeader]", ...args),
};

export default function TransactionTableHeader({ isAllSelected, toggleSelectAll }) {
    logger.info("render", { isAllSelected });

    return (
        <div className={styles.header} role="row">
            <div className={styles.checkboxCol} role="columnheader">
                <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                />
            </div>

            <div className={styles.column} role="columnheader">Name</div>

            <div className={`${styles.column} ${styles.columnRight}`} role="columnheader" aria-label="Amount">
                Amount
            </div>

            <div className={styles.column} role="columnheader">Category</div>

            <div className={styles.column} role="columnheader">Criticality</div>

            <div className={styles.column} role="columnheader">Date</div>

            <div className={styles.column} role="columnheader">Account</div>

            <div className={styles.column} role="columnheader">Payment Method</div>
        </div>
    );
}

TransactionTableHeader.propTypes = {
    isAllSelected: PropTypes.bool.isRequired,
    toggleSelectAll: PropTypes.func.isRequired,
};