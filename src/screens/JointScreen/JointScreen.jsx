import React from "react";
import CategorizedTable from "../../features/categorizedTable/CategorizedTable";
import SpendingSummary from "../../features/spendingSummary/SpendingSummary";
// Use the centralized config accessor (and its helpers) instead of loading the raw JSON
import config, { get } from "../../config/config.ts";
import TransactionTable from "../../features/transactionTable/TransactionTable";

const JointScreen = () => {
    // Use the config.get helper to safely read the configured filter for the joint account.
    // Fallback to the literal 'joint' if the config entry is missing.
    const JOINTFILTER = get("joint.filter", "joint");
    return (
        <div className="App">
            <header className="App-header">
                <SpendingSummary account={JOINTFILTER} />
                <TransactionTable account={JOINTFILTER} />
            </header>
        </div>
    );
};

export default JointScreen;