import './SpendingSummary.css';
import CategorizedTable from "../categorizedTable/CategorizedTable";
import React from "react";

export default function SpendingSummary(props) {
    const account = props.account ?? props;
    console.log('[SpendingSummary] account:', account);
    const NONESSENTIAL = {
        account: account,
        criticality: "Nonessential"
    }

    const ESSENTIAL = {
        account: account,
        criticality: "essential"
    }

    return (
        <div className="spending-summary">
            <header className="spending-summary__header">
                <div className="tables-row">
                    <div className="table-container">
                        <h3>Essential</h3>
                        <CategorizedTable filters={ESSENTIAL}/>
                    </div>
                    <div className="table-container">
                        <h3>Nonessential</h3>
                        <CategorizedTable filters={NONESSENTIAL}/>
                    </div>
                </div>
            </header>
        </div>
    )
}