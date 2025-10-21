import SpendingSummary from "../../components/spendingSummary/SpendingSummary";
import React from "react";
import TransactionTable from "../../components/transactionTable/TransactionTable";
import SettingsScreen from "../SettingsScreen/SettingsScreen";


const TransactionScreen = () => {
    return (
        <div className="App">
            <header className="App-header">
                <TransactionTable />
            </header>
        </div>
    )
}

export default TransactionScreen