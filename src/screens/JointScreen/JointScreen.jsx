import React from "react";
import CategorizedTable from "../../features/categorizedTable/CategorizedTable";
import SpendingSummary from "../../features/spendingSummary/SpendingSummary";
import config from "../../wmbservice-config.json";
import TransactionTable from "../../features/transactionTable/TransactionTable";

const JointScreen = () => {
    const JOINTFILTER = config.jointFilter;
    return (
        <div className="App">
            <header className="App-header">
                <SpendingSummary account={JOINTFILTER} />
                <TransactionTable account={JOINTFILTER}/>
            </header>

        </div>
    )
};

export default JointScreen;