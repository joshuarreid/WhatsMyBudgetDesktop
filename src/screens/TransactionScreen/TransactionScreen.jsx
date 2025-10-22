import SpendingSummary from "../../features/spendingSummary/SpendingSummary";
import React from "react";
import TransactionTable from "../../features/transactionTable/TransactionTable";
import SettingsScreen from "../SettingsScreen/SettingsScreen";
import config from "../../wmbservice-config.json";


const TransactionScreen = () => {
    const JOINTFILTER = config.jointFilter;
    return (
        <div className="App">
            <header className="App-header">
                <TransactionTable account={JOINTFILTER}/>
            </header>
        </div>
    )
}

export default TransactionScreen