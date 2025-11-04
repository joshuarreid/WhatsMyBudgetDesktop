import React from 'react';
import PropTypes from 'prop-types';

import Modal, { ModalBody, ModalFooter, ModalHeader } from '../../components/modal/Modal';
import CompactTransactionTable from '../compactTransactionTable/CompactTransactionTable';
import useCategoryWeeklyModalData from './hooks/useCategoryWeeklyModalData';
import './styles/CategoryWeeklyModal.css';

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
                                                account, // required by the table
                                            }) {
    const { weeks, total, start, end, transactionsInCategory, filtersForTable, weeklyAverage } =
    useCategoryWeeklyModalData({ transactions, category, options, account }) || {};

    logger.info('render modal', {
        isOpen,
        category,
        weeksCount: weeks.length,
        txCount: transactionsInCategory.length,
        hasAccount: Boolean(account),
        filtersForTable,
    });

    const ariaLabel = category ? `Weekly breakdown for ${category}` : 'Weekly breakdown';

    return (
        <Modal isOpen={Boolean(isOpen)} onClose={onClose} ariaLabel={ariaLabel} closeOnBackdrop closeOnEsc>
            <ModalHeader className="cwm-header">
                <div className="cwm-title">{category || 'All categories'}</div>
                <div className="cwm-range">{start && end ? `${start.toLocaleDateString('en-US', { timeZone: 'UTC' })} — ${end.toLocaleDateString('en-US', { timeZone: 'UTC' })}` : 'No date range'}</div>
            </ModalHeader>

            <ModalBody>
                {!account && (
                    <div className="cwm-account-warning" role="alert">
                        <div className="cwm-account-warning__title">Account required</div>
                        <div className="cwm-account-warning__body">
                            An account is required to view transactions. Please provide the <code>account</code> prop to this component (e.g. account id or
                            name).
                        </div>
                    </div>
                )}

                {weeks.length === 0 ? (
                    <div className="cwm-no-data">No weekly data available.</div>
                ) : (
                    <div className="cwm-weeks-grid" role="list">
                        {weeks.map((w, idx) => {
                            const wkStart = w.start ? new Date(w.start) : null;
                            const wkEnd = w.end ? new Date(w.end) : null;
                            const ariaLabelWeek = `Week ${idx + 1}: ${wkStart?.toLocaleDateString?.('en-US', { timeZone: 'UTC' }) ?? '—'} — ${wkEnd?.toLocaleDateString?.('en-US', { timeZone: 'UTC' }) ?? '—'}`;

                            return (
                                <div
                                    key={idx}
                                    className={`cwm-week-item ${!account ? 'cwm-week-item--disabled' : ''}`}
                                    role="listitem"
                                    aria-label={ariaLabelWeek}
                                >
                                    <div className="cwm-week-left">
                                        <div className="cwm-week-dates">{wkStart ? wkStart.toLocaleDateString('en-US', { timeZone: 'UTC' }) : '—'} — {wkEnd ? wkEnd.toLocaleDateString('en-US', { timeZone: 'UTC' }) : '—'}</div>
                                        <div className="cwm-week-count">{w.count} transaction{w.count !== 1 ? 's' : ''}</div>
                                    </div>

                                    <div className="cwm-week-total">{fmt ? fmt.format(w.total) : `$${(w.total || 0).toFixed(2)}`}</div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <section className="cwm-transactions-region" role="region" aria-label="Transactions for selected date range">
                    <div className="cwm-transactions-body">
                        <CompactTransactionTable
                            filters={filtersForTable}
                            onRowClick={(tx) => {
                                // Kept for observability — no UI navigation/hide by default
                                logger.info('compact row clicked (always-visible table)', { txId: tx?.id });
                            }}
                        />
                    </div>
                </section>
            </ModalBody>

            <ModalFooter>
                <div className="cwm-footer-stats" aria-hidden="true">
                    <div className="cwm-footer-stats__label">Weekly Average</div>
                    <div className="cwm-footer-stats__value">{fmt ? fmt.format(weeklyAverage) : `$${(weeklyAverage || 0).toFixed(2)}`}</div>
                </div>

                <div>
                    <button type="button" onClick={onClose} className="cwm-close-btn">
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
    fmt: PropTypes.object,
    options: PropTypes.object,
    account: PropTypes.string,
};