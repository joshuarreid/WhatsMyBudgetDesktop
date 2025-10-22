import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';

import useCategoryWeeklyData from './useCategoryWeeklyData';
import Modal, { ModalBody, ModalFooter, ModalHeader } from '../../components/modal/Modal';
import TransactionTable from "../transactionTable/TransactionTable";


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
                                                account, // required by TransactionTable
                                            }) {
    const { weeks = [], total = 0, start, end, transactionsInCategory = [] } =
    useCategoryWeeklyData(transactions, category, options) || {};

    const [selectedWeek, setSelectedWeek] = useState(null);

    logger.info('render modal', {
        isOpen,
        category,
        weeksCount: weeks.length,
        txCount: transactionsInCategory.length,
        hasAccount: Boolean(account),
    });

    const ariaLabel = category ? `Weekly breakdown for ${category}` : 'Weekly breakdown';

    const openWeekTransactions = useCallback(
        (week) => {
            if (!account) {
                logger.error('attempted to open week transactions but no account provided', { category });
                return;
            }
            try {
                setSelectedWeek({
                    start: week?.start ? new Date(week.start) : null,
                    end: week?.end ? new Date(week.end) : null,
                });
                logger.info('open week transactions', { category, weekStart: week.start, weekEnd: week.end });
            } catch (err) {
                logger.error('failed to open week transactions', err);
            }
        },
        [account, category],
    );

    const closeWeekTransactions = useCallback(() => {
        logger.info('close week transactions', { category });
        setSelectedWeek(null);
    }, [category]);

    return (
        <>
            <Modal isOpen={Boolean(isOpen)} onClose={onClose} ariaLabel={ariaLabel} closeOnBackdrop closeOnEsc>
                <ModalHeader>
                    <div style={{ fontWeight: 600 }}>{category || 'All categories'}</div>
                    <div style={{ opacity: 0.7 }}>
                        {start && end ? `${start.toLocaleDateString()} — ${end.toLocaleDateString()}` : 'No date range'}
                    </div>
                </ModalHeader>

                <ModalBody>
                    {!account && (
                        <div style={{ marginBottom: 12, padding: 8, borderRadius: 8, background: 'rgba(255,80,80,0.05)' }}>
                            <div style={{ fontWeight: 700, color: '#ffb4b4' }}>Account required</div>
                            <div style={{ opacity: 0.8 }}>
                                An account is required to view transactions. Please provide the <code>account</code> prop to this
                                component (e.g. account id or name).
                            </div>
                        </div>
                    )}

                    {weeks.length === 0 ? (
                        <div>No weekly data available.</div>
                    ) : (
                        <div style={{ display: 'grid', gap: 8 }}>
                            {weeks.map((w, idx) => {
                                const wkStart = w.start ? new Date(w.start) : null;
                                const wkEnd = w.end ? new Date(w.end) : null;
                                return (
                                    <div
                                        key={idx}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => openWeekTransactions(w)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                openWeekTransactions(w);
                                            }
                                        }}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            borderRadius: 8,
                                            background: 'rgba(255,255,255,0.02)',
                                            cursor: account ? 'pointer' : 'not-allowed',
                                            opacity: account ? 1 : 0.6,
                                        }}
                                        aria-label={`Open transactions for ${wkStart?.toLocaleDateString?.()} — ${wkEnd?.toLocaleDateString?.()}`}
                                    >
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 600 }}>
                                                {wkStart ? wkStart.toLocaleDateString() : '—'} — {wkEnd ? wkEnd.toLocaleDateString() : '—'}
                                            </div>
                                            <div style={{ fontSize: 12, opacity: 0.8 }}>
                                                {w.count} transaction{w.count !== 1 ? 's' : ''}
                                            </div>
                                        </div>

                                        <div style={{ fontWeight: 700 }}>
                                            {fmt ? fmt.format(w.total) : `$${(w.total || 0).toFixed(2)}`}
                                        </div>
                                    </div>
                                );
                            })}
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

            {/* Nested modal: show transaction table for the selected week & category */}
            <Modal
                isOpen={Boolean(selectedWeek)}
                onClose={closeWeekTransactions}
                ariaLabel={
                    category
                        ? `Transactions for ${category} ${selectedWeek?.start?.toLocaleDateString?.() ?? ''} — ${selectedWeek?.end?.toLocaleDateString?.() ?? ''}`
                        : `Transactions ${selectedWeek?.start?.toLocaleDateString?.() ?? ''} — ${selectedWeek?.end?.toLocaleDateString?.() ?? ''}`
                }
                closeOnBackdrop
                closeOnEsc
            >
                <ModalHeader>
                    <div style={{ fontWeight: 600 }}>{category ? `${category} — weekly transactions` : 'Transactions'}</div>
                    <div style={{ opacity: 0.7 }}>
                        {selectedWeek?.start && selectedWeek?.end
                            ? `${selectedWeek.start.toLocaleDateString()} — ${selectedWeek.end.toLocaleDateString()}`
                            : 'No date range'}
                    </div>
                </ModalHeader>

                <ModalBody style={{ padding: 0 }}>
                    < TransactionTable
                        filters={{
                            account, // required by TransactionTable; caller should provide this prop
                            category: category || undefined,
                            weekStart: selectedWeek?.start,
                            weekEnd: selectedWeek?.end,
                            startDate: selectedWeek?.start,
                            endDate: selectedWeek?.end,
                        }}
                    />
                </ModalBody>

                <ModalFooter>
                    <div />
                    <div>
                        <button
                            type="button"
                            onClick={closeWeekTransactions}
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
        </>
    );
}

CategoryWeeklyModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    category: PropTypes.string,
    transactions: PropTypes.array,
    fmt: PropTypes.object,
    options: PropTypes.object,
    account: PropTypes.string, // recommended to pass this
};