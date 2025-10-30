import React from "react";
import styles from "../styles/PaymentSummaryTable.module.css";

/**
 * PaymentSummaryTable
 * - Table showing what each user owes per card, plus a total row for each user.
 * - Uses lowercase keys for matching data.
 *
 * @module PaymentSummaryTable
 * @param {Object} props
 * @param {Array<string>} props.cards
 * @param {Array<string>} props.users
 * @param {Object} props.payments - payments[card][user]: amount
 * @returns {JSX.Element}
 */
export default function PaymentSummaryTable({ cards, users, payments }) {
    // Defensive: always lowercase keys for lookup
    const normalizedCards = cards.map(card => card.toLowerCase());
    const normalizedUsers = users.map(user => user.toLowerCase());

    const userTotals = normalizedUsers.reduce((acc, user) => {
        acc[user] = normalizedCards.reduce(
            (sum, card) => sum + (payments?.[card]?.[user] || 0),
            0
        );
        return acc;
    }, {});

    return (
        <table className={styles.summaryTable}>
            <thead>
            <tr>
                <th>Card</th>
                {normalizedUsers.map(u => (
                    <th key={u}>{u.charAt(0).toUpperCase() + u.slice(1)}'s Payment</th>
                ))}
            </tr>
            </thead>
            <tbody>
            {normalizedCards.map(card => (
                <tr key={card}>
                    <td>{card.charAt(0).toUpperCase() + card.slice(1)}</td>
                    {normalizedUsers.map(user => (
                        <td key={user}>
                            {payments?.[card]?.[user] !== undefined
                                ? `$${Number(payments[card][user]).toFixed(2)}`
                                : "$0.00"}
                        </td>
                    ))}
                </tr>
            ))}
            <tr>
                <td><strong>Total</strong></td>
                {normalizedUsers.map(user => (
                    <td key={user}>
                        <strong>${userTotals[user].toFixed(2)}</strong>
                    </td>
                ))}
            </tr>
            </tbody>
        </table>
    );
}