import React from "react";
import PropTypes from "prop-types";
import styles from "./TransactionTableToolbar.module.css";
import StatementPeriodDropdown from "../../../../components/statementPeriodDropdown/StatementPeriodDropdown";

/**
 * Logger for TransactionTableToolbar
 */
const logger = {
    info: (...args) => console.log("[TransactionTableToolbar]", ...args),
    error: (...args) => console.error("[TransactionTableToolbar]", ...args),
};

/**
 * TransactionTableToolbar
 * Presentational toolbar for transaction actions.
 * Uses Bulletproof React conventions: UI only, logic in hooks.
 *
 * Props:
 *  - toolbar: toolbar logic object from useTransactionToolbar
 */
export default function TransactionTableToolbar({ toolbar }) {
    logger.info("render", { selectedCount: toolbar.selectedCount, loading: toolbar.loading });

    return (
        <div className={styles.toolbar} role="toolbar" aria-label="Transaction actions">
            <div className={styles.left}>
                <button
                    className={styles.linkBtn}
                    onClick={toolbar.handleAdd}
                    disabled={toolbar.loading}
                >
                    <span className={styles.icon}>＋</span> Add Transaction
                </button>
                <button
                    className={styles.linkBtn}
                    onClick={toolbar.handleAddProjection}
                    disabled={toolbar.loading}
                >
                    <span className={styles.icon}>＋</span> Add Projection
                </button>
                <button
                    className={styles.linkBtn}
                    onClick={toolbar.handleImport}
                    disabled={toolbar.loading}
                >
                    <span className={styles.icon}>📁</span> File Import
                </button>
                <input
                    ref={toolbar.fileInputRef}
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={toolbar.handleFileChange}
                />
                <button
                    className={styles.linkBtn}
                    onClick={toolbar.handleDelete}
                    disabled={toolbar.selectedCount === 0 || toolbar.loading}
                >
                    <span className={styles.icon}>🗑️</span> Delete Selected
                </button>
                <StatementPeriodDropdown />
            </div>
            <div className={styles.right}>
                <div className={styles.totals}>Total: {toolbar.total}</div>
            </div>
        </div>
    );
}

TransactionTableToolbar.propTypes = {
    toolbar: PropTypes.shape({
        handleAdd: PropTypes.func.isRequired,
        handleAddProjection: PropTypes.func.isRequired,
        handleImport: PropTypes.func.isRequired,
        handleDelete: PropTypes.func.isRequired,
        selectedCount: PropTypes.number.isRequired,
        fileInputRef: PropTypes.object.isRequired,
        handleFileChange: PropTypes.func.isRequired,
        loading: PropTypes.bool,
        total: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    }).isRequired,
};