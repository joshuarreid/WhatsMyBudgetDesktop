import React from "react";
import SpendingSummary from "../../features/spendingSummary/SpendingSummary";
import TransactionTable from "../../features/transactionTable/TransactionTable";
// Use the centralized config accessor instead of the raw JSON file
import { get } from "../../config/config.ts";

const User2Screen = () => {
    // Safely read the user2 filter, fall back to the literal filter value from the JSON
    const USER2FILTER = get("user2.filter", "user2");
    return (
        <div className="App">
            <header className="App-header">
                <SpendingSummary account={USER2FILTER} />
                <TransactionTable account={USER2FILTER} />
            </header>
        </div>
    );
};

export default User2Screen;