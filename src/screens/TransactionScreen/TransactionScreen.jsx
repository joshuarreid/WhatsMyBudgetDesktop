import React from "react";
import TransactionTable from "../../features/transactionTable/TransactionTable";
import SettingsScreen from "../SettingsScreen/SettingsScreen";
import { get } from "../../config/config.ts";
import {StatementPeriodProvider} from "../../context/StatementPeriodProvider";

/**
 * TransactionScreen
 * - Top-level screen for the joint account, wrapped in StatementPeriodProvider for context-driven statement period state.
 * - Ensures TransactionTable can access statement period via context (no prop drilling).
 *
 * @returns {JSX.Element}
 */
const TransactionScreen = () => {
    // Read the joint account filter via the config.get helper with a sensible fallback.
    const JOINTFILTER = get("joint.filter", "joint");
    return (
        <StatementPeriodProvider>
            <div className="App">
                <header className="App-header">
                    <TransactionTable account={JOINTFILTER} />
                </header>
            </div>
        </StatementPeriodProvider>
    );
};

export default TransactionScreen;