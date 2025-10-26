/**
 * BalanceWidget (module-scoped styles)
 *
 * - Uses a CSS Module for scoped styling to avoid global class collisions.
 * - Keeps formatting & currency helper local to the component.
 */

import React from "react";
import styles from "./BalanceWidget.module.css";

const logger = {
    info: (...args) => console.log("[BalanceWidget]", ...args),
    error: (...args) => console.error("[BalanceWidget]", ...args),
};

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
 * Props:
 * - total: number
 * - joint: number
 * - personal: number
 */
export function BalanceWidget({ total, joint, personal }) {
    return (
        <div className={styles.container} role="region" aria-label="Balances">
            <div className={styles.item} data-testid="balance-total">
                <div className={styles.amount}>{formatCurrency(total)}</div>
                <div className={styles.label}>Total Balance</div>
            </div>
            <div className={styles.item} data-testid="balance-joint">
                <div className={styles.amount}>{formatCurrency(joint)}</div>
                <div className={styles.label}>Joint Balance</div>
            </div>
            <div className={styles.item} data-testid="balance-personal">
                <div className={styles.amount}>{formatCurrency(personal)}</div>
                <div className={styles.label}>Personal Balance</div>
            </div>
        </div>
    );
}

export default BalanceWidget;