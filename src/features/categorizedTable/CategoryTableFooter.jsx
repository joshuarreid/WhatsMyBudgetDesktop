import React from "react";

export default function CategoryTableFooter({ totalSum, fmt }) {
    return (
        <div className="ct-footer">
            <div>Total</div>
            <div style={{ textAlign: "right" }}>{fmt.format(totalSum)}</div>
        </div>
    );
}