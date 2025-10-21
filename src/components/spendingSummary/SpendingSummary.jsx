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
                    <CategorizedTable filters={ESSENTIAL} />
                    <CategorizedTable filters={NONESSENTIAL} />
                </div>
            </header>
        </div>
    )
}