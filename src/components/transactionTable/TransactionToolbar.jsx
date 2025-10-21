import React from "react";
import PropTypes from "prop-types";

/**
 * TransactionToolbar
 *
 * Props:
 * - onAdd: function
 * - onImport: function
 * - onDelete: function
 * - selectedCount: number
 * - fileInputRef: ref
 * - onFileChange: function
 * - loading?: boolean
 * - total: string (formatted currency)
 */
export default function TransactionToolbar({
                                               onAdd,
                                               onImport,
                                               onDelete,
                                               selectedCount,
                                               fileInputRef,
                                               onFileChange,
                                               loading = false,
                                               total,
                                           }) {
    return (
        <div className="tt-toolbar tt-toolbar-ynab" role="toolbar" aria-label="Transaction actions">
            <div className="tt-toolbar-left">
                <button className="tt-link-btn" onClick={onAdd} disabled={loading}>
                    <span className="tt-icon">＋</span> Add Transaction
                </button>
                <button className="tt-link-btn" onClick={onImport} disabled={loading}>
                    <span className="tt-icon">📁</span> File Import
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={onFileChange}
                />
                <button
                    className="tt-link-btn"
                    onClick={onDelete}
                    disabled={selectedCount === 0 || loading}
                >
                    <span className="tt-icon">🗑️</span> Delete Selected
                </button>
            </div>
            <div className="tt-toolbar-right">
                <div className="tt-totals">Total: {total}</div>
            </div>
        </div>
    );
}

TransactionToolbar.propTypes = {
    onAdd: PropTypes.func.isRequired,
    onImport: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    selectedCount: PropTypes.number.isRequired,
    fileInputRef: PropTypes.object.isRequired,
    onFileChange: PropTypes.func.isRequired,
    loading: PropTypes.bool,
    total: PropTypes.string.isRequired,
};