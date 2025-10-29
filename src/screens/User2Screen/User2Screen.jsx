import React from "react";
import SpendingSummary from "../../features/spendingSummary/SpendingSummary";
import TransactionTable from "../../features/transactionTable/TransactionTable";
import { get } from "../../config/config.ts";
import {StatementPeriodProvider} from "../../context/StatementPeriodProvider";

/**
 * User2Screen
 * - Top-level screen for user2, wrapped in StatementPeriodProvider for context-driven statement period state.
 * - Ensures all child features (e.g., TransactionTable) can access statement period via context (no prop drilling).
 *
 * @returns {JSX.Element}
 */
const User2Screen = () => {
    // Safely read the user2 filter, fall back to the literal filter value from the JSON
    const USER2FILTER = get("user2.filter", "user2");
    return (
        <StatementPeriodProvider>
            <div className="App">
                <header className="App-header">
                    <SpendingSummary account={USER2FILTER} />
                    <TransactionTable account={USER2FILTER} />
                </header>
            </div>
        </StatementPeriodProvider>
    );
};

export default User2Screen;