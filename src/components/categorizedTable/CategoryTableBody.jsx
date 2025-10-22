import React from "react";
import CategoryTableRow from "./CategoryTableRow";

export default function CategoryTableBody({ rows, totalSum, fmt, loading }) {
    return (
        <div className="ct-body">
            {rows.length === 0 ? (
                loading ? null : <div className="ct-empty">No transactions</div>
            ) : (
                rows.map(([category, total]) => (
                    <CategoryTableRow key={category} category={category} total={total} totalSum={totalSum} fmt={fmt} />
                ))
            )}
        </div>
    );
}