/**
 * PaymentScreen
 * - Top-level payments screen, wrapped in StatementPeriodProvider.
 * - Presents a static shell with summary and breakdown sections.
 * - Uses the new usePaymentSummary(tanStack) hook (TanStack Query) for data fetching/caching.
 *
 * NOTE: This file was patched to use the new hook during migration.
 */

import React from "react";
import PaymentSummaryTable from "./PaymentSummaryTable";
import CardPaymentBreakdown from "./CardPaymentBreakdown";
import styles from "../styles/PaymentScreen.module.css";
import { StatementPeriodProvider } from "../../../context/StatementPeriodProvider(tanStack)";
import usePaymentSummary from "../../../hooks/usePaymentSummary(tanStack)";
// NOTE: swapped to new TanStack hook (temporary filename suffix)


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
 * - Handles render logic for payments, using context from StatementPeriodProvider.
 * - Renders static shell (summary + breakdown) at all times.
 *
 * @returns {JSX.Element}
 */
const PaymentScreenContent = () => {
    const { cards, users, payments, breakdowns, loading, error } = usePaymentSummary();

    logger.info("Rendering PaymentScreenContent", { cards, users, payments, breakdowns, loading, error });

    return (
        <div className={styles.screen}>
            {/* Payments summary card */}
            <div className={styles.summarySection}>
                <div className={styles.appCard}>
                    <h2 style={{marginBottom: '10px', color: "var(--accent, #7fb7db)"}}>Payments Summary</h2>
                    <PaymentSummaryTable cards={cards} users={users} payments={payments} />
                    {loading && (
                        <div className={styles.loading}>Loading payments…</div>
                    )}
                    {error && (
                        <div className={styles.error}>Error: {error.message || String(error)}</div>
                    )}
                </div>
            </div>
            {/* Breakdown cards */}
            <div className={styles.breakdownSection}>
                {cards.length === 0 ? (
                    <div className={styles.appCard} style={{textAlign: "center", padding: "32px 0"}}>
                        No cards found.
                    </div>
                ) : (
                    cards.map(card => (
                        <div className={styles.appCard} key={card} style={{marginBottom: "32px"}}>
                            <CardPaymentBreakdown
                                card={card}
                                users={users}
                                breakdowns={breakdowns[card]}
                            />
                            {loading && (
                                <div className={styles.loading}>Loading breakdowns…</div>
                            )}
                        </div>
                    ))
                )}
            </div>
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