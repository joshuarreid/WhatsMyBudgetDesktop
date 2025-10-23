import React from 'react';
import PropTypes from 'prop-types';

const logger = {
    info: (...args) => console.log('[CompactTransactionRow]', ...args),
    error: (...args) => console.error('[CompactTransactionRow]', ...args),
};

/**
 * Try a variety of common transaction date fields and formats.
 * Accepts Date objects, ISO strings, and numeric timestamps.
 */
function parseTxDate(tx) {
    const candidates = [
        tx?.date,
        tx?.postedDate,
        tx?.post_date,
        tx?.posted,
        tx?.createdAt,
        tx?.transactedAt,
        tx?.posted_at,
        tx?.transaction_date,
        tx?.dateString,
    ];

    for (const val of candidates) {
        if (val == null) continue;

        // If it's already a Date
        if (val instanceof Date && !isNaN(val)) return val;

        // If it's a number (timestamp)
        if (typeof val === 'number' && !Number.isNaN(val)) {
            const d = new Date(val);
            if (!Number.isNaN(d)) return d;
        }

        // If it's a numeric string like '1633024800000'
        if (typeof val === 'string') {
            const trimmed = val.trim();
            // numeric-ish
            if (/^\d+$/.test(trimmed)) {
                const num = Number(trimmed);
                const d = new Date(num);
                if (!Number.isNaN(d)) return d;
            }
            // try Date parser
            const d = new Date(trimmed);
            if (!Number.isNaN(d)) return d;
        }
    }

    return null;
}

export default function CompactTransactionRow({ tx, onClick }) {
    React.useEffect(() => {
        logger.info('mount', { id: tx?.id });
        return () => logger.info('unmount', { id: tx?.id });
    }, [tx?.id]);

    const name = tx?.name ?? tx?.description ?? tx?.payee ?? '—';
    const amountVal = typeof tx?.amount === 'number' ? tx.amount : Number(tx?.value ?? 0);

    const dateObj = parseTxDate(tx);
    const dateStr = dateObj ? dateObj.toLocaleDateString() : '—';

    const amountStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountVal);

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

CompactTransactionRow.propTypes = {
    tx: PropTypes.object.isRequired,
    onClick: PropTypes.func,
};