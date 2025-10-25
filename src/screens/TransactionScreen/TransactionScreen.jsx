import React from "react";
import TransactionTable from "../../features/transactionTable/TransactionTable";
import SettingsScreen from "../SettingsScreen/SettingsScreen";
// Use centralized config accessor and its safe getter instead of importing the raw JSON
import config, { get } from "../../config/config.ts";

const TransactionScreen = () => {
    // Read the joint account filter via the config.get helper with a sensible fallback.
    const JOINTFILTER = get("joint.filter", "joint");
    return (
        <div className="App">
            <header className="App-header">
                <TransactionTable account={JOINTFILTER} />
            </header>
        </div>
    );
};

export default TransactionScreen;