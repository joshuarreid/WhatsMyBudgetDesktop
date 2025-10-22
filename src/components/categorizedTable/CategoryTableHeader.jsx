import React from "react";

export default function CategoryTableHeader() {
    return (
        <div className="ct-header-row">
            <div>Category</div>
            <div style={{ textAlign: "right" }}>Amount</div>
        </div>
    );
}