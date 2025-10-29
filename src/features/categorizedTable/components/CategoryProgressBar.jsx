/**
 * CategoryProgressBar
 * - Renders a category progress bar with actual (blue) and projected (yellow) overlay.
 * - Shows only the updated percent including projected as a single label, styled as before.
 *
 * @module CategoryProgressBar
 * @param {Object} props
 * @param {number} props.actualPercent - percent of actual (0-100).
 * @param {number} props.combinedPercent - percent of actual+projected (0-100).
 * @param {number} props.percentLabel - rounded combined percent.
 * @returns {JSX.Element}
 */

import React from "react";
import styles from "./CategoryProgressBar.module.css";

/**
 * Logger for CategoryProgressBar
 * @constant
 */
const logger = {
    info: (...args) => console.log('[CategoryProgressBar]', ...args),
    error: (...args) => console.error('[CategoryProgressBar]', ...args),
};

/**
 * CategoryProgressBar
 * - Shows actual (blue) up to actualPercent, projected (yellow) from actualPercent to combinedPercent.
 * - Shows only the combined percent as label, styled as before.
 *
 * @param {Object} props
 * @returns {JSX.Element}
 */
export default function CategoryProgressBar({ actualPercent, combinedPercent, percentLabel }) {
    logger.info("render", { actualPercent, combinedPercent, percentLabel });

    return (
        <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
            <div className={styles.ctBar} style={{ width: 140, position: "relative" }}>
                <div
                    className={styles.ctBarFill}
                    style={{ width: `${actualPercent}%` }}
                    aria-hidden="true"
                />
                {combinedPercent > actualPercent && (
                    <div
                        className={styles.ctBarProjected}
                        style={{
                            width: `${combinedPercent - actualPercent}%`,
                            left: `${actualPercent}%`,
                        }}
                        aria-hidden="true"
                    />
                )}
            </div>
            <div className={styles.ctPct}>{percentLabel}%</div>
        </div>
    );
}