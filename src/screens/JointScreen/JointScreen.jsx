import React from "react";
import CategorizedTable from "../../components/categorizedTable/CategorizedTable";
import SpendingSummary from "../../components/spendingSummary/SpendingSummary";
import config from "../../wmbservice-config.json";
import TransactionTable from "../../components/transactionTable/TransactionTable";

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