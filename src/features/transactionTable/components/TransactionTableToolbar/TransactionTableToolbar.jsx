import React from "react";
import PropTypes from "prop-types";

import styles from "./TransactionTableToolbar.module.css";
import StatementPeriodDropdown from "../../../../components/statementPeriodDropdown/StatementPeriodDropdown";

/**
 * TransactionTableToolbar
 *
 * - Presentational toolbar for transaction actions.
 * - Uses a CSS module to scope toolbar visuals.
 */
export default function TransactionTableToolbar({
                                               onAdd,
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
    onImport: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    selectedCount: PropTypes.number.isRequired,
    fileInputRef: PropTypes.object.isRequired,
    onFileChange: PropTypes.func.isRequired,
    loading: PropTypes.bool,
    total: PropTypes.string.isRequired,
};