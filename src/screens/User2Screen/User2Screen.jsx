import React from "react";
import CategorizedTable from "../../components/categorizedTable/CategorizedTable";
import SpendingSummary from "../../components/spendingSummary/SpendingSummary";
import config from "../../wmbservice-config.json";
import TransactionTable from "../../components/transactionTable/TransactionTable";

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