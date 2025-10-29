/**
 * CategoryTableBody
 * - Renders the category table body rows.
 * - Dynamically adds rows for projected categories not present in actuals.
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

import React, { useMemo } from "react";
import CategoryTableRow from "./CategoryTableRow";

/**
 * Logger for CategoryTableBody
 * @constant
 */
const logger = {
    info: (...args) => console.log('[CategoryTableBody]', ...args),
    error: (...args) => console.error('[CategoryTableBody]', ...args),
};

/**
 * Merges rows with projected-only categories.
 *
 * @param {Array} rows - Array of [category, actualTotal] pairs.
 * @param {Object} projectedTotalsByCategory - Map of category => projected total.
 * @returns {Array} - Array of [category, actualTotal, projectedTotal] including projected-only categories.
 */
const mergeRowsWithProjected = (rows, projectedTotalsByCategory) => {
    const actualCategories = new Set(rows.map(([category]) => category));
    // Find projected-only categories (not in actuals)
    const projectedOnlyCategories = Object.keys(projectedTotalsByCategory).filter(
        (cat) => !actualCategories.has(cat)
    );
    // Add projected-only rows with actualTotal = 0
    const projectedRows = projectedOnlyCategories.map((cat) => [cat, 0]);
    // Merge and sort
    return [...rows, ...projectedRows].sort(([a], [b]) => a.localeCompare(b));
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

    // Merge rows w/ any projected categories missing from actuals
    const mergedRows = useMemo(
        () => mergeRowsWithProjected(rows, projectedTotalsByCategory),
        [rows, projectedTotalsByCategory]
    );

    return (
        <div className="ct-body">
            {mergedRows.length === 0 ? (
                loading ? null : <div className="ct-empty"></div>
            ) : (
                mergedRows.map(([category, total]) => (
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