import React from 'react';
import PropTypes from 'prop-types';

const logger = {
    info: (...args) => console.log('[CompactTransactionRow]', ...args),
    error: (...args) => console.error('[CompactTransactionRow]', ...args),
};

/**
 * Robust date parsing for transactions.
 * Supports:
 * - JS Date instance
 * - numeric timestamps (seconds or milliseconds)
 * - numeric string timestamps
 * - ISO/other date strings
 * - Firestore Timestamp-like objects (has toDate())
 * - objects like { seconds, nanos }
 * - common field names including transactionDate (camelCase)
 */
function parseTxDate(tx) {
    // Candidate accessors (tries direct fields + some nested common locations)
    const rawCandidates = [
        // explicit common fields (most important first)
        () => tx?.transactionDate,
        () => tx?.transaction_date,
        () => tx?.date,
        () => tx?.postedDate,
        () => tx?.posted_at,
        () => tx?.posted,
        () => tx?.createdAt,
        () => tx?.transactedAt,
        () => tx?.timestamp,
        () => tx?.time,
        () => tx?.dateString,

        // nested shapes
        () => tx?.attributes?.transactionDate,
        () => tx?.attrs?.transactionDate,
        () => tx?.meta?.transactionDate,
        () => tx?.transaction?.date,
        () => tx?.transaction?.transactionDate,
        () => tx?.posted?.date,
    ];

    for (const getVal of rawCandidates) {
        let val;
        try {
            val = getVal();
        } catch (e) {
            // defensive: if accessing nested property throws, skip
            continue;
        }
        if (val == null) continue;

        // Firestore Timestamp-like: has toDate()
        try {
            if (typeof val === 'object' && typeof val.toDate === 'function') {
                const d = val.toDate();
                if (d instanceof Date && !Number.isNaN(d)) return d;
            }
        } catch (e) {
            /* ignore and continue */
        }

        // Objects with seconds/nanos (e.g. some APIs)
        if (typeof val === 'object' && typeof val.seconds === 'number') {
            const seconds = Number(val.seconds) || 0;
            const nanos = Number(val.nanos) || 0;
            const ms = seconds * 1000 + Math.floor(nanos / 1e6);
            const d = new Date(ms);
            if (!Number.isNaN(d)) return d;
        }

        // Already a Date
        if (val instanceof Date && !Number.isNaN(val)) return val;

        // Number timestamp
        if (typeof val === 'number' && !Number.isNaN(val)) {
            // Distinguish seconds vs milliseconds (seconds are < 1e12)
            const asMs = Math.abs(val) < 1e12 ? val * 1000 : val;
            const d = new Date(asMs);
            if (!Number.isNaN(d)) return d;
        }

        // String values
        if (typeof val === 'string') {
            const trimmed = val.trim();

            // numeric-like string (seconds or ms)
            if (/^-?\d+$/.test(trimmed)) {
                const num = Number(trimmed);
                const asMs = Math.abs(num) < 1e12 ? num * 1000 : num;
                const d = new Date(asMs);
                if (!Number.isNaN(d)) return d;
            }

            // Try Date parser (ISO, "YYYY-MM-DD", etc.)
            const d = new Date(trimmed);
            if (!Number.isNaN(d)) return d;
        }
    }

    return null;
}

function formatDateShort(d) {
    try {
        // Always display date in UTC to match backend
        return d.toLocaleDateString('en-US', { timeZone: 'UTC' }) ?? String(d);
    } catch (err) {
        return String(d);
    }
}

function formatAmount(amount) {
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount ?? 0);
    } catch (err) {
        return String(amount ?? 0);
    }
}

function CompactTransactionRowComponent({ tx, onClick }) {
    React.useEffect(() => {
        logger.info('mount', { id: tx?.id });
        return () => logger.info('unmount', { id: tx?.id });
    }, [tx?.id]);

    const name = tx?.name ?? tx?.description ?? tx?.payee ?? '—';

    // amount
    const amountVal = typeof tx?.amount === 'number' ? tx.amount : Number(tx?.value ?? tx?.amount ?? 0);
    const amountStr = formatAmount(amountVal);

    // date
    const dateObj = parseTxDate(tx);
    const dateStr = dateObj ? formatDateShort(dateObj) : '—';

    // If date missing, log a sample of the transaction (helps debugging)
    React.useEffect(() => {
        if (!dateObj) {
            logger.error('Could not parse date for transaction', {
                id: tx?.id,
                // include only a small preview to avoid huge logs
                candidates: {
                    transactionDate: tx?.transactionDate,
                    transaction_date: tx?.transaction_date,
                    date: tx?.date,
                    postedDate: tx?.postedDate,
                    timestamp: tx?.timestamp,
                    attributes: Boolean(tx?.attributes),
                },
                txPreview: {
                    id: tx?.id,
                    name,
                    amount: amountVal,
                },
            });
        }
    }, [dateObj, tx, name, amountVal]);

    return (
        <div
            className="ct-compact-row"
            role="listitem"
            tabIndex={onClick ? 0 : -1}
            onClick={() => onClick?.(tx)}
            onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && onClick) {
                    e.preventDefault();
                    onClick(tx);
                }
            }}
            aria-label={`${name} ${amountStr} ${dateStr}`}
        >
            <div className="ct-compact-col ct-compact-col--name" title={name}>
                {name}
            </div>

            <div className="ct-compact-col ct-compact-col--amount" title={amountStr}>
                {amountStr}
            </div>

            <div className="ct-compact-col ct-compact-col--date" title={dateStr}>
                {dateStr}
            </div>
        </div>
    );
}

CompactTransactionRowComponent.propTypes = {
    tx: PropTypes.object.isRequired,
    onClick: PropTypes.func,
};

export default React.memo(CompactTransactionRowComponent, (prev, next) => {
    // only re-render when the tx id, date or amount or onClick change
    if (prev.tx?.id !== next.tx?.id) return false;
    if (prev.tx?.transactionDate !== next.tx?.transactionDate) return false;
    if (prev.tx?.date !== next.tx?.date) return false;
    if (prev.tx?.amount !== next.tx?.amount) return false;
    if (prev.onClick !== next.onClick) return false;
    return true;
});