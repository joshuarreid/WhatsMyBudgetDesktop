/**
 * CategoryTableFooter
 *
 * Footer for the categorized table, showing current balance and projected balance side by side.
 *
 * @param {Object} props
 * @param {number} props.totalSum - The sum of current transactions.
 * @param {number} props.projected - The projected balance.
 * @param {Intl.NumberFormat} props.fmt - Currency formatter.
 * @returns {JSX.Element}
 */
import React from "react";
import PropTypes from "prop-types";
import styles from "./CategoryTableFooter.module.css";

const logger = {
    info: (...args) => console.log("[CategoryTableFooter]", ...args),
    error: (...args) => console.error("[CategoryTableFooter]", ...args),
};

export default function CategoryTableFooter({ totalSum, projected, fmt }) {
    logger.info("render", { totalSum, projected });

    return (
        <div className={styles.footer}>
            <div className={styles.value}>{fmt.format(totalSum)}</div>
            <div className={styles.projected}>{fmt.format(projected)}</div>
        </div>
    );
}

CategoryTableFooter.propTypes = {
    totalSum: PropTypes.number.isRequired,
    projected: PropTypes.number,
    fmt: PropTypes.object.isRequired,
};