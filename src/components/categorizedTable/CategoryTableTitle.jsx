import React from "react";
import PropTypes from "prop-types";

export default function CategoryTableTitle({ title }) {
    if (!title) return null;
    return (
        <div className="ct-title" style={{
            fontWeight: 800,
            fontSize: "2rem",
            color: "#e6eef8",
            padding: "16px 0 2px 8px",
            letterSpacing: "0.01em"
        }}>
            {title}
        </div>
    );
}

CategoryTableTitle.propTypes = {
    title: PropTypes.string
};