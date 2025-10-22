import React from 'react';
import PropTypes from 'prop-types';

import useCategoryWeeklyData from './useCategoryWeeklyData';
import Modal, {ModalBody, ModalFooter, ModalHeader} from "../../components/modal/Modal";

const logger = {
    info: (...args) => console.log('[CategoryWeeklyModal]', ...args),
    error: (...args) => console.error('[CategoryWeeklyModal]', ...args),
};

export default function CategoryWeeklyModal({
                                                isOpen,
                                                onClose,
                                                category,
                                                transactions = [],
                                                fmt,
                                                options = {},
                                            }) {
    // Keep this hook pure and safe for SSR (it internally handles arrays and dates)
    const { weeks = [], total = 0, start, end, transactionsInCategory = [] } =
    useCategoryWeeklyData(transactions, category, options) || {};

    logger.info('render modal', {
        isOpen,
        category,
        weeksCount: weeks.length,
        txCount: transactionsInCategory.length,
    });

    // Friendly label for aria
    const ariaLabel = category ? `Weekly breakdown for ${category}` : 'Weekly breakdown';

    return (
        <Modal
            isOpen={Boolean(isOpen)}
            onClose={onClose}
            ariaLabel={ariaLabel}
            closeOnBackdrop
            closeOnEsc
        >
            <ModalHeader>
                <div style={{ fontWeight: 600 }}>
                    {category || 'All categories'}
                </div>
                <div style={{ opacity: 0.7 }}>
                    {start && end
                        ? `${start.toLocaleDateString()} — ${end.toLocaleDateString()}`
                        : 'No date range'}
                </div>
            </ModalHeader>

            <ModalBody>
                {weeks.length === 0 ? (
                    <div>No weekly data available.</div>
                ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                        {weeks.map((w, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    background: 'rgba(255,255,255,0.02)',
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                                        {new Date(w.start).toLocaleDateString()} —{' '}
                                        {new Date(w.end).toLocaleDateString()}
                                    </div>
                                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                                        {w.count} transaction{w.count !== 1 ? 's' : ''}
                                    </div>
                                </div>

                                <div style={{ fontWeight: 700 }}>
                                    {fmt ? fmt.format(w.total) : `$${(w.total || 0).toFixed(2)}`}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ModalBody>

            <ModalFooter>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontWeight: 700 }}>Total</div>
                    <div>{fmt ? fmt.format(total) : `$${(total || 0).toFixed(2)}`}</div>
                </div>

                <div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.06)',
                            color: 'inherit',
                            cursor: 'pointer',
                        }}
                    >
                        Close
                    </button>
                </div>
            </ModalFooter>
        </Modal>
    );
}

CategoryWeeklyModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    category: PropTypes.string,
    transactions: PropTypes.array,
    fmt: PropTypes.object, // Intl.NumberFormat
    options: PropTypes.object,
};