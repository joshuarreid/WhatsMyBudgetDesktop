/**
 * BalanceWidget (module-scoped styles)
 *
 * - Shows Total, Joint, Personal balances and an additional Projected Balance
 *   placed at the far right of the widget.
 * - Follows Bulletproof React conventions: presentational component only,
 *   formatting helper colocated, robust logger and JSDoc.
 */

import React from "react";
import PropTypes from "prop-types";
import styles from "./BalanceWidget.module.css";

const logger = {
    info: (...args) => console.log("[BalanceWidget]", ...args),
    error: (...args) => console.error("[BalanceWidget]", ...args),
};

/**
 * formatCurrency
 *
 * Format a numeric value as USD currency. Defensive: returns the raw value
 * string if formatting fails.
 *
 * @param {number|string} amount - value to format
 * @returns {string} formatted currency
 */
function formatCurrency(amount) {
    try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(Number(amount) || 0);
    } catch (err) {
        logger.error("formatCurrency failed", err);
        return String(amount ?? "");
    }
}

/**
 * BalanceWidget
 *
 * Presentational component showing a set of balances. Projected balance is
 * rendered on the far-right side of the widget (visual emphasis via yellow).
 *
 * @param {Object} props
 * @param {number} props.total - total balance
 * @param {number} props.joint - joint balance
 * @param {number} props.personal - personal balance
 * @param {number} [props.projected] - projected balance (optional)
 * @returns {JSX.Element}
 */
export function BalanceWidget({ total, joint, personal, projected = null }) {
    logger.info("render", { total, joint, personal, projected });
    return (
        <div className={styles.container} role="region" aria-label="Balances">
            <div className={styles.group}>
                <div className={styles.item} data-testid="balance-joint">
                    <div className={styles.amount}>{formatCurrency(joint)}</div>
                    <div className={styles.label}>Joint Balance</div>
                </div>
                <div className={styles.item} data-testid="balance-personal">
                    <div className={styles.amount}>{formatCurrency(personal)}</div>
                    <div className={styles.label}>Personal Balance</div>
                </div>
                <div className={styles.item} data-testid="balance-personal">
                    <div className={styles.projectedAmount} aria-hidden={projected == null}>{formatCurrency(projected)}</div>
                    <div className={styles.projectedLabel}>Projected Balance</div>
                </div>
            </div>
        </div>
    );
}

BalanceWidget.propTypes = {
    total: PropTypes.number.isRequired,
    joint: PropTypes.number.isRequired,
    personal: PropTypes.number.isRequired,
    projected: PropTypes.number,
};

export default BalanceWidget;