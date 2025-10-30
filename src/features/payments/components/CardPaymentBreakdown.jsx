import React from "react";
import UserCategoryTable from "./UserCategoryTable";
import styles from "../styles/CardPaymentBreakdown.module.css";

/**
 * CardPaymentBreakdown
 * - Shows category breakdowns for each user on a card.
 * - Always uses lowercase card/user keys for lookup.
 *
 * @module CardPaymentBreakdown
 * @param {Object} props
 * @param {string} props.card
 * @param {Array<string>} props.users
 * @param {Object} props.breakdowns - breakdowns[user]: [{ category, amount, type }]
 * @returns {JSX.Element}
 */
const logger = {
    info: (...args) => console.log('[CardPaymentBreakdown]', ...args),
    error: (...args) => console.error('[CardPaymentBreakdown]', ...args),
};

export default function CardPaymentBreakdown({ card, users, breakdowns }) {
    const normalizedCard = card.toLowerCase();
    const normalizedUsers = users.map(u => u.toLowerCase());

    logger.info("Rendering CardPaymentBreakdown", { card: normalizedCard, users: normalizedUsers, breakdowns });

    return (
        <div className={styles.cardSection}>
            <h2 className={styles.cardTitle}>{normalizedCard.charAt(0).toUpperCase() + normalizedCard.slice(1)} – Category Breakdown</h2>
            <div className={styles.userTables}>
                {normalizedUsers.map(user => (
                    <UserCategoryTable
                        key={user}
                        user={user}
                        card={normalizedCard}
                        categories={breakdowns?.[user] || []}
                    />
                ))}
            </div>
        </div>
    );
}