/**
 * CardPaymentBreakdown
 * - Shows category breakdowns for each user on a card.
 * - Always renders the card shell for static UX; shows loading/empty/error states inside.
 *
 * @module CardPaymentBreakdown
 * @param {Object} props
 * @param {string} props.card - Card name (lowercase)
 * @param {Array<string>} props.users - Array of user names (lowercase)
 * @param {Object} props.breakdowns - breakdowns[user]: [{ category, amount, type }]
 * @param {boolean} [props.loading] - Show loading spinner
 * @param {Error|null} [props.error] - Error object if data fetch failed
 * @returns {JSX.Element}
 */
import React from "react";
import UserCategoryTable from "./UserCategoryTable";
import styles from "../styles/CardPaymentBreakdown.module.css";

/**
 * Logger for CardPaymentBreakdown.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[CardPaymentBreakdown]', ...args),
    error: (...args) => console.error('[CardPaymentBreakdown]', ...args),
};

export default function CardPaymentBreakdown({ card, users, breakdowns, loading = false, error = null }) {
    logger.info("Rendering CardPaymentBreakdown", { card, users, breakdowns, loading, error });

    return (
        <div className={styles.cardSection}>
            <h2 className={styles.cardTitle}>{card.charAt(0).toUpperCase() + card.slice(1)}</h2>
            <div className={styles.userTables}>
                {users.map(user => (
                    <UserCategoryTable
                        key={user}
                        user={user}
                        card={card}
                        categories={breakdowns?.[user] || []}
                        loading={loading}
                        error={error}
                    />
                ))}
            </div>
            {loading && <div className={styles.loading}>Loading breakdowns…</div>}
            {error && <div className={styles.error}>Error: {error.message || String(error)}</div>}
        </div>
    );
}