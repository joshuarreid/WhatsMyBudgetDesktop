import React from "react";
import CategoryProgressBar from "./CategoryProgressBar";

export default function CategoryTableRow({ category, total, totalSum, fmt }) {
    const pct = totalSum > 0 ? Math.round((total / totalSum) * 100) : 0;
    return (
        <div className="ct-row">
            <div className="ct-col ct-cat">{category}</div>
            <div className="ct-col ct-col-amount" style={{ flexDirection: "column", alignItems: "flex-end" }}>
                <div className="ct-amount">{fmt.format(total)}</div>
                <CategoryProgressBar pct={pct} />
            </div>
        </div>
    );
}