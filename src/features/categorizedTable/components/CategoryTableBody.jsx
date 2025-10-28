import React from "react";
import CategoryTableRow from "./CategoryTableRow";

export default function CategoryTableBody({ rows, totalSum, fmt, loading, onRowClick }) {
    return (
        <div className="ct-body">
            {rows.length === 0 ? (
                loading ? null : <div className="ct-empty"></div>
            ) : (
                rows.map(([category, total]) => (
                    <CategoryTableRow
                        key={category}
                        category={category}
                        total={total}
                        totalSum={totalSum}
                        fmt={fmt}
                        onClick={onRowClick}
                    />
                ))
            )}
        </div>
    );
}