import React from "react";
import CategorizedTable from "../../components/categorizedTable/CategorizedTable";
import SpendingSummary from "../../components/spendingSummary/SpendingSummary";
import config from "../../wmbservice-config.json";
import TransactionTable from "../../components/transactionTable/TransactionTable";

const User1Screen = () => {
    const USER1FILTER = config.user1Filter;
    return (
        <div className="App">
            <header className="App-header">
                <SpendingSummary account={USER1FILTER} />
                <TransactionTable account={USER1FILTER}/>
            </header>
        </div>
    )
};

export default User1Screen;