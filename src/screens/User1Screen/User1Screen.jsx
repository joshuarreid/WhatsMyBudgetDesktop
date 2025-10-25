import React from "react";
import SpendingSummary from "../../features/spendingSummary/SpendingSummary";
import TransactionTable from "../../features/transactionTable/TransactionTable";
// Use the centralized config accessor instead of the raw JSON file
import { get } from "../../config/config.ts";

const User1Screen = () => {
    // Safely read the user1 filter, fall back to the literal filter value from the JSON
    const USER1FILTER = get("user1.filter", "user1");
    return (
        <div className="App">
            <header className="App-header">
                <SpendingSummary account={USER1FILTER} />
                <TransactionTable account={USER1FILTER} />
            </header>
        </div>
    );
};

export default User1Screen;