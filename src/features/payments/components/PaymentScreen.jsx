/**
 * PaymentScreen
 * - Top-level screen for payments, wrapped in StatementPeriodProvider for context-driven statement period state.
 * - Renders payment summary and card breakdowns using normalized data from usePaymentsData.
 *
 * @module PaymentScreen
 * @returns {JSX.Element}
 */
import React from "react";
import PaymentSummaryTable from "./PaymentSummaryTable";
import CardPaymentBreakdown from "./CardPaymentBreakdown";
import styles from "../styles/PaymentScreen.module.css";
import { StatementPeriodProvider } from "../../../context/StatementPeriodProvider";
import { usePaymentsData } from "../hooks/usePaymentsData";

/**
 * Logger for PaymentScreen component.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[PaymentScreen]', ...args),
    error: (...args) => console.error('[PaymentScreen]', ...args),
};

/**
 * PaymentScreenContent
 * - Handles the actual render logic for payments, using context provided by StatementPeriodProvider.
 *
 * @returns {JSX.Element}
 */
const PaymentScreenContent = () => {
    const { cards, users, payments, breakdowns, loading, error } = usePaymentsData();

    logger.info("Rendering PaymentScreenContent", { cards, users, payments, breakdowns, loading, error });

    if (loading) return <div className={styles.loading}>Loading payments…</div>;
    if (error) return <div className={styles.error}>Error: {error.message || String(error)}</div>;

    return (
        <div className={styles.screen}>
            <PaymentSummaryTable cards={cards} users={users} payments={payments} />
            {cards.map(card => (
                <CardPaymentBreakdown
                    key={card}
                    card={card}
                    users={users}
                    breakdowns={breakdowns[card]}
                />
            ))}
        </div>
    );
};

/**
 * PaymentScreen
 * - Top-level export, wraps content in StatementPeriodProvider for context consistency.
 *
 * @returns {JSX.Element}
 */
const PaymentScreen = () => (
    <StatementPeriodProvider>
        <PaymentScreenContent />
    </StatementPeriodProvider>
);

export default PaymentScreen;