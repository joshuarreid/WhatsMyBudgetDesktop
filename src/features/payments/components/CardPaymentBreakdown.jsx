/**
 * CardPaymentBreakdown
 * - Shows category breakdowns for each user on a card.
 * - Data is filled directly from normalized usePaymentsData.
 *
 * @module CardPaymentBreakdown
 * @param {Object} props
 * @param {string} props.card - Card name (lowercase)
 * @param {Array<string>} props.users - Array of user names (lowercase)
 * @param {Object} props.breakdowns - breakdowns[user]: [{ category, amount, type }]
 * @returns {JSX.Element}
 */
import React from "react";
import UserCategoryTable from "./UserCategoryTable";
import styles from "../styles/CardPaymentBreakdown.module.css";

/**
 * CardPaymentBreakdown
 * - Renders a list of UserCategoryTable components for each user/card.
 * - Defensive rendering for missing/empty data.
 */
const logger = {
    info: (...args) => console.log('[CardPaymentBreakdown]', ...args),
    error: (...args) => console.error('[CardPaymentBreakdown]', ...args),
};

export default function CardPaymentBreakdown({ card, users, breakdowns }) {
    logger.info("Rendering CardPaymentBreakdown", { card, users, breakdowns });

    return (
        <div className={styles.cardSection}>
            <h2 className={styles.cardTitle}>{card.charAt(0).toUpperCase() + card.slice(1)} – Category Breakdown</h2>
            <div className={styles.userTables}>
                {users.map(user => (
                    <UserCategoryTable
                        key={user}
                        user={user}
                        card={card}
                        categories={breakdowns?.[user] || []}
                    />
                ))}
            </div>
        </div>
    );
}