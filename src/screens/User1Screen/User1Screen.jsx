import React from "react";
import SpendingSummary from "../../features/spendingSummary/SpendingSummary";
import TransactionTable from "../../features/transactionTable/TransactionTable";
import { get } from "../../config/config.ts";
import {StatementPeriodProvider} from "../../context/StatementPeriodProvider";

/**
 * User1Screen
 * Screen for user1, wrapped in StatementPeriodProvider to provide statement period context.
 *
 * @returns {JSX.Element}
 */
const User1Screen = () => {
    const USER1FILTER = get("user1.filter", "user1");
    return (
        <StatementPeriodProvider>
            <div className="App">
                <header className="App-header">
                    <SpendingSummary account={USER1FILTER} />
                    <TransactionTable account={USER1FILTER} />
                </header>
            </div>
        </StatementPeriodProvider>
    );
};

export default User1Screen;