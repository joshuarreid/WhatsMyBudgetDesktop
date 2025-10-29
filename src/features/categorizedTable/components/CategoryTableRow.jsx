/**
 * CategoryTableRow
 * - Renders a single row in the category spending table.
 * - Displays category name, amount, and a progress bar with projected overlay.
 *
 * @module CategoryTableRow
 * @param {Object} props
 * @param {string} props.category - Category name.
 * @param {number} props.total - Actual transaction sum for the category.
 * @param {number} props.projectedTotal - Projected transaction sum for the category.
 * @param {number} props.totalSum - Grand total sum for all categories (actual).
 * @param {Object} props.fmt - Currency formatter.
 * @param {Function} [props.onClick] - Row click handler.
 * @returns {JSX.Element}
 */

import React from "react";
import CategoryProgressBar from "./CategoryProgressBar";
import styles from "./CategoryTableRow.module.css";

/**
 * Logger for CategoryTableRow
 * @constant
 */
const logger = {
    info: (...args) => console.log('[CategoryTableRow]', ...args),
    error: (...args) => console.error('[CategoryTableRow]', ...args),
};

/**
 * CategoryTableRow
 * - Renders category with actual and projected progress.
 * - Handles keyboard and mouse activation for details modal.
 *
 * @param {Object} props
 * @returns {JSX.Element}
 */
export default function CategoryTableRow({
                                             category,
                                             total,
                                             projectedTotal = 0,
                                             totalSum,
                                             fmt,
                                             onClick
                                         }) {
    /**
     * Calculates the percent of GRAND total for combined actual + projected.
     * Only the combined percent is rendered as label.
     * Blue bar for actual, yellow for projected addition.
     */
    const actualPercent = totalSum > 0 ? (total / totalSum) * 100 : 0;
    const combinedPercent = totalSum > 0 ? ((total + projectedTotal) / totalSum) * 100 : actualPercent;
    const percentLabel = Math.round(combinedPercent);

    /**
     * Handles row activation (mouse/click).
     * @function
     */
    function handleActivate() {
        if (typeof onClick === 'function') {
            logger.info('activating row', { category });
            onClick(category);
        }
    }

    /**
     * Handles keyboard activation (Enter/Space).
     * @function
     * @param {React.KeyboardEvent} e
     */
    function handleKeyDown(e) {
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleActivate();
        }
    }

    // If this is a projected-only row, do not render the green amount.
    const showProjectedOnly = total === 0 && projectedTotal > 0;

    return (
        <div
            className="ct-row"
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onClick={onClick ? () => handleActivate() : undefined}
            onKeyDown={onClick ? handleKeyDown : undefined}
            aria-pressed="false"
        >
            <div className="ct-col ct-cat">{category}</div>
            <div className="ct-col ct-col-amount" style={{ flexDirection: "column", alignItems: "flex-end" }}>
                <div className={styles.amountRow}>
                    {!showProjectedOnly && (
                        <span className={styles.amountActual}>{fmt.format(total)}</span>
                    )}
                    {projectedTotal > 0 && (
                        <span className={styles.amountProjected}>{fmt.format(projectedTotal)}</span>
                    )}
                </div>
                <CategoryProgressBar
                    actualPercent={actualPercent}
                    combinedPercent={combinedPercent}
                    percentLabel={percentLabel}
                />
            </div>
        </div>
    );
}