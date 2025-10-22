import React from "react";

export default function CategoryProgressBar({ pct }) {
    return (
        <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
            <div className="ct-bar" style={{ width: 140 }}>
                <div className="ct-bar-fill" style={{ width: `${pct}%` }} aria-hidden="true" />
            </div>
            <div className="ct-pct">{pct}%</div>
        </div>
    );
}