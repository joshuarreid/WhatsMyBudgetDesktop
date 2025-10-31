/**
 * PaymentSummaryTable
 * - Table showing what each user owes per card, plus a total row for each user.
 * - Always renders the shell for static UX, showing loading/empty/error states inside.
 *
 * @module PaymentSummaryTable
 * @param {Object} props
 * @param {Array<string>} props.cards - Array of card names (lowercase)
 * @param {Array<string>} props.users - Array of user names (lowercase)
 * @param {Object} props.payments - payments[card][user]: amount
 * @param {boolean} [props.loading] - Show loading spinner
 * @param {Error|null} [props.error] - Error object if data fetch failed
 * @returns {JSX.Element}
 */
import React from "react";
import styles from "../styles/PaymentSummaryTable.module.css";

/**
 * Logger for PaymentSummaryTable.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[PaymentSummaryTable]', ...args),
    error: (...args) => console.error('[PaymentSummaryTable]', ...args),
};

export default function PaymentSummaryTable({ cards, users, payments, loading = false, error = null }) {
    /**
     * Calculates total owed per user across all cards.
     * @type {Object}
     */
    const userTotals = users.reduce((acc, user) => {
        acc[user] = cards.reduce(
            (sum, card) => sum + (payments?.[card]?.[user] || 0),
            0
        );
        return acc;
    }, {});

    logger.info("Rendering PaymentSummaryTable", { cards, users, payments, userTotals, loading, error });

    return (
        <div className={styles.summaryTableWrapper}>
            <div className={styles.summaryTableCard}>
                <table className={styles.summaryTable}>
                    <thead>
                    <tr>
                        <th>Card</th>
                        {users.map(u => (
                            <th key={u}>{u.charAt(0).toUpperCase() + u.slice(1)}'s Payment</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {cards.length === 0 && (
                        <tr>
                            <td colSpan={users.length + 1} style={{ textAlign: "center", color: "var(--muted, #b1bcc6)" }}>
                                No cards found.
                            </td>
                        </tr>
                    )}
                    {cards.map(card => (
                        <tr key={card}>
                            <td>{card.charAt(0).toUpperCase() + card.slice(1)}</td>
                            {users.map(user => (
                                <td key={user}>
                                    {payments?.[card]?.[user] !== undefined
                                        ? `$${Number(payments[card][user]).toFixed(2)}`
                                        : "$0.00"}
                                </td>
                            ))}
                        </tr>
                    ))}
                    <tr>
                        <td>
                            <strong>Total</strong>
                        </td>
                        {users.map(user => (
                            <td key={user}>
                                <strong>${userTotals[user].toFixed(2)}</strong>
                            </td>
                        ))}
                    </tr>
                    </tbody>
                </table>
                {loading && <div className={styles.loading}>Loading payments…</div>}
                {error && <div className={styles.error}>Error: {error.message || String(error)}</div>}
            </div>
        </div>
    );
}