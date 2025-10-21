import React from "react";
import CategorizedTable from "../../components/categorizedTable/CategorizedTable";

const JointScreen = () => {
    const NONESSENTIAL = {
        account: "joint",
        criticality: "Nonessential"
    }

    const ESSENTIAL = {
        account: "joint",
        criticality: "essential"
    }

    return (
        <div className="App">
            <header className="App-header">
                <CategorizedTable filters={ESSENTIAL}/>
                <CategorizedTable filters={NONESSENTIAL}/>
            </header>
        </div>
    )
};

export default JointScreen;