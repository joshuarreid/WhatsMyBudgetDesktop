import React from "react";
import CategorizedTable from "../../features/categorizedTable/CategorizedTable";
import SpendingSummary from "../../features/spendingSummary/SpendingSummary";
import config from "../../wmbservice-config.json";
import TransactionTable from "../../features/transactionTable/TransactionTable";

const User2Screen = () => {
    const USER2FILTER = config.user2Filter;
    return (
        <div className="App">
            <header className="App-header">
                <SpendingSummary account={USER2FILTER} />
                <TransactionTable account={USER2FILTER}/>
            </header>
        </div>
    )
};

export default User2Screen;