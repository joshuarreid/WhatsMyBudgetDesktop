import React from "react";
import CategorizedTable from "../../features/categorizedTable/CategorizedTable";
import SpendingSummary from "../../features/spendingSummary/SpendingSummary";
import TransactionTable from "../../features/transactionTable/TransactionTable";
// Use the centralized config accessor (and its helpers)
import { get } from "../../config/config.ts";
import {StatementPeriodProvider} from "../../context/StatementPeriodProvider";


/**
 * JointScreen
 * Top-level screen for viewing the joint account,
 * wrapped in StatementPeriodProvider for context-driven statement period state.
 *
 * @returns {JSX.Element}
 */
const JointScreen = () => {
    // Safely read the configured filter for the joint account (fallback: 'joint')
    const JOINTFILTER = get("joint.filter", "joint");
    return (
        <StatementPeriodProvider>
            <div className="App">
                <header className="App-header">
                    <SpendingSummary account={JOINTFILTER} />
                    <TransactionTable account={JOINTFILTER} />
                    {/* If you need CategorizedTable to use statement period, it will get it from context here */}
                </header>
            </div>
        </StatementPeriodProvider>
    );
};

export default JointScreen;