import React from "react";
import PropTypes from "prop-types";

import styles from "./TransactionTableToolbar.module.css";
import StatementPeriodDropdown from "../../../../components/statementPeriodDropdown/StatementPeriodDropdown";

/**
 * TransactionTableToolbar
 *
 * - Presentational toolbar for transaction actions.
 * - Uses a CSS module to scope toolbar visuals.
 *
 * Props:
 *  - onAdd: callback when "Add Transaction" is clicked
 *  - onAddProjection: callback when "Add Projection" is clicked (creates a new ProjectedTransaction)
 *  - onImport: callback to open file picker
 *  - onDelete: callback to delete selected items
 *  - selectedCount: number of selected items in the table
 *  - fileInputRef: ref for hidden file input
 *  - onFileChange: handler when file input changes
 *  - loading: boolean to disable actions while loading
 *  - total: formatted total string to display on the right
 */
export default function TransactionTableToolbar({
                                                    onAdd,
                                                    onAddProjection,
                                                    onImport,
                                                    onDelete,
                                                    selectedCount,
                                                    fileInputRef,
                                                    onFileChange,
                                                    loading = false,
                                                    total,
                                                }) {
    const logger = {
        info: (...args) => console.log("[TransactionTableToolbar]", ...args),
        error: (...args) => console.error("[TransactionTableToolbar]", ...args),
    };
    logger.info("render", { selectedCount, loading });

    return (
        <div className={styles.toolbar} role="toolbar" aria-label="Transaction actions">
            <div className={styles.left}>
                <button
                    className={styles.linkBtn}
                    onClick={onAdd}
                    disabled={loading}
                >
                    <span className={styles.icon}>＋</span> Add Transaction
                </button>

                {/* New: Add Projection button to the right of Add Transaction */}
                <button
                    className={styles.linkBtn}
                    onClick={onAddProjection}
                    disabled={loading}
                >
                    <span className={styles.icon}>＋</span> Add Projection
                </button>

                <button
                    className={styles.linkBtn}
                    onClick={onImport}
                    disabled={loading}
                >
                    <span className={styles.icon}>📁</span> File Import
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={onFileChange}
                />
                <button
                    className={styles.linkBtn}
                    onClick={onDelete}
                    disabled={selectedCount === 0 || loading}
                >
                    <span className={styles.icon}>🗑️</span> Delete Selected
                </button>

                {/* Statement period dropdown (UI-only Step 1) */}
                <StatementPeriodDropdown />
            </div>

            <div className={styles.right}>
                <div className={styles.totals}>Total: {total}</div>
            </div>
        </div>
    );
}

TransactionTableToolbar.propTypes = {
    onAdd: PropTypes.func.isRequired,
    onAddProjection: PropTypes.func.isRequired,
    onImport: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    selectedCount: PropTypes.number.isRequired,
    fileInputRef: PropTypes.object.isRequired,
    onFileChange: PropTypes.func.isRequired,
    loading: PropTypes.bool,
    total: PropTypes.string.isRequired,
};