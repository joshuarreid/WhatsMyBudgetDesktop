/**
 * CategoryTableBody
 * - Renders the category table body rows.
 * - Passes actual and projected totals for progress bar rendering.
 *
 * @module CategoryTableBody
 * @param {Object} props
 * @param {Array} props.rows - Array of [category, actualTotal] pairs.
 * @param {Object} props.projectedTotalsByCategory - Map of category => projected total.
 * @param {number} props.totalSum - Actual sum for all categories.
 * @param {Object} props.fmt - Currency formatter.
 * @param {boolean} props.loading - Loading state.
 * @param {Function} props.onRowClick - Row click handler.
 * @returns {JSX.Element}
 */

import React from "react";
import CategoryTableRow from "./CategoryTableRow";

/**
 * Logger for CategoryTableBody
 * @constant
 */
const logger = {
    info: (...args) => console.log('[CategoryTableBody]', ...args),
    error: (...args) => console.error('[CategoryTableBody]', ...args),
};

export default function CategoryTableBody({
                                              rows,
                                              projectedTotalsByCategory = {},
                                              totalSum,
                                              fmt,
                                              loading,
                                              onRowClick
                                          }) {
    logger.info("render", { rowsCount: rows.length, totalSum, loading });

    return (
        <div className="ct-body">
            {rows.length === 0 ? (
                loading ? null : <div className="ct-empty"></div>
            ) : (
                rows.map(([category, total]) => (
                    <CategoryTableRow
                        key={category}
                        category={category}
                        total={total}
                        projectedTotal={projectedTotalsByCategory[category] || 0}
                        totalSum={totalSum}
                        fmt={fmt}
                        onClick={onRowClick}
                    />
                ))
            )}
        </div>
    );
}