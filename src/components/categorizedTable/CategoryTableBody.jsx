import React from "react";
import CategoryTableRow from "./CategoryTableRow";

export default function CategoryTableBody({ rows, totalSum, fmt }) {
    return (
        <div className="ct-body">
            {rows.map(([category, total]) => (
                <CategoryTableRow key={category} category={category} total={total} totalSum={totalSum} fmt={fmt} />
            ))}
        </div>
    );
}