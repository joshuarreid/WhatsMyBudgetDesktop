/**
 * PaymentScreen
 * - Screen showing what each user owes per card and category breakdowns.
 * - Uses normalized data from usePaymentsData.
 *
 * @module PaymentScreen
 * @returns {JSX.Element}
 */
import React from "react";
import { usePaymentsData } from "../hooks/usePaymentsData";
import PaymentSummaryTable from "./PaymentSummaryTable";
import CardPaymentBreakdown from "./CardPaymentBreakdown";
import styles from "../styles/PaymentScreen.module.css";

/**
 * Logger for PaymentScreen component.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[PaymentScreen]', ...args),
    error: (...args) => console.error('[PaymentScreen]', ...args),
};

const PaymentScreen = () => {
    const { cards, users, payments, breakdowns, loading, error } = usePaymentsData();

    logger.info("Rendering PaymentScreen", { cards, users, payments, breakdowns, loading, error });

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

export default PaymentScreen;