import React from "react";
import CategoryProgressBar from "./CategoryProgressBar";

const logger = {
    info: (...args) => console.log('[CategoryTableRow]', ...args),
    error: (...args) => console.error('[CategoryTableRow]', ...args),
};

export default function CategoryTableRow({ category, total, totalSum, fmt, onClick }) {
    const pct = totalSum > 0 ? Math.round((total / totalSum) * 100) : 0;

    function handleActivate() {
        if (typeof onClick === 'function') {
            logger.info('activating row', { category });
            onClick(category);
        }
    }

    function handleKeyDown(e) {
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleActivate();
        }
    }

    return (
        <div
            className="ct-row"
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onClick={onClick ? () => handleActivate() : undefined}
            onKeyDown={onClick ? handleKeyDown : undefined}
            aria-pressed="false"
        >
            <div className="ct-col ct-cat">{category}</div>
            <div className="ct-col ct-col-amount" style={{ flexDirection: "column", alignItems: "flex-end" }}>
                <div className="ct-amount">{fmt.format(total)}</div>
                <CategoryProgressBar pct={pct} />
            </div>
        </div>
    );
}