/**
 * UserCategoryTable
 * - Shows breakdown of categories for a user and card.
 * - Data is filled directly from normalized usePaymentsData.
 *
 * @module UserCategoryTable
 * @param {Object} props
 * @param {string} props.user - Username (lowercase)
 * @param {string} props.card - Card name (lowercase)
 * @param {Array} props.categories - [{ category, amount, type }]
 * @returns {JSX.Element}
 */
import React from "react";
import styles from "../styles/UserCategoryTable.module.css";

/**
 * UserCategoryTable
 * - Renders a category breakdown for a user's card.
 * - Defensive rendering for missing/empty data.
 */
const logger = {
    info: (...args) => console.log('[UserCategoryTable]', ...args),
    error: (...args) => console.error('[UserCategoryTable]', ...args),
};

export default function UserCategoryTable({ user, card, categories }) {
    const safeCategories = Array.isArray(categories) ? categories : [];
    const total = safeCategories.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    logger.info("Rendering UserCategoryTable", { user, card, total, categories: safeCategories });

    return (
        <div className={styles.userCategoryTable}>
            <h3 className={styles.userTitle}>
                {user.charAt(0).toUpperCase() + user.slice(1)} — {card.charAt(0).toUpperCase() + card.slice(1)}
            </h3>
            <table>
                <thead>
                <tr>
                    <th>Category</th>
                    <th>Total Amount</th>
                    <th>Type</th>
                </tr>
                </thead>
                <tbody>
                {safeCategories.length === 0 && (
                    <tr>
                        <td colSpan={3}>No categories found.</td>
                    </tr>
                )}
                {safeCategories.map(({ category, amount, type }) => (
                    <tr key={category}>
                        <td>{category.charAt(0).toUpperCase() + category.slice(1)}</td>
                        <td>${Number(amount).toFixed(2)}</td>
                        <td>{type || "Actual"}</td>
                    </tr>
                ))}
                <tr className={styles.totalRow}>
                    <td><strong>TOTAL</strong></td>
                    <td><strong>${total.toFixed(2)}</strong></td>
                    <td></td>
                </tr>
                </tbody>
            </table>
        </div>
    );
}