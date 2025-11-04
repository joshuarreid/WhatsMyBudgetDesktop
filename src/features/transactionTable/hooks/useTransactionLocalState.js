/**
 * useTransactionLocalState
 *
 * - Encapsulates all local UI state and helpers for the TransactionTable.
 * - Responsible for optimistic/local rows (localTx), selection, editing state,
 *   temporary id generation, basic row creation/cancel helpers and input helpers.
 *
 * This extraction is intentionally side-effect free (no queryClient or API calls).
 *
 * @module hooks/useTransactionLocalState
 */

import { useState, useRef, useCallback } from 'react';
import { getDefaultPaymentMethodForAccount } from '../../../config/config.js';
import { TEMP_ID_PREFIX } from '../utils/constants';

const logger = {
    info: (...args) => console.log('[useTransactionLocalState]', ...args),
    error: (...args) => console.error('[useTransactionLocalState]', ...args),
};

/**
 * useTransactionLocalState options
 * @typedef {Object} UseLocalOpts
 * @property {Array<object>} [initialServerTx] - initial server rows to seed local state
 * @property {Object} [filters] - current filters (used to pick default account / paymentMethod)
 * @property {string|null|undefined} [statementPeriod] - statementPeriod value for newly created rows
 */

/**
 * useTransactionLocalState
 *
 * @param {UseLocalOpts} opts - configuration for the hook
 * @returns {Object} - local state and helpers consumed by useTransactionTable
 */
export default function useTransactionLocalState(opts = {}) {
    const { initialServerTx = [], filters = {}, statementPeriod } = opts || {};

    // local rows (optimistic + server + projected composition will be handled by parent)
    const [localTx, setLocalTx] = useState(() => [...initialServerTx]);

    // selection / editing / saving / errors
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [editing, setEditing] = useState(null);
    const [savingIds, setSavingIds] = useState(() => new Set());
    const [saveErrors, setSaveErrors] = useState(() => ({}));

    // refs for inline editing & file input
    const editValueRef = useRef('');
    const fileInputRef = useRef(null);

    /**
     * makeTempId
     * - Create a temporary id used for optimistic/new rows
     * @returns {string}
     */
    const makeTempId = useCallback(
        () => `${TEMP_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        []
    );

    /**
     * toggleSelect
     * - Toggle selection for a specific id
     * @param {string} id
     */
    const toggleSelect = useCallback((id) => {
        setSelectedIds((prev) => {
            const copy = new Set(prev);
            if (copy.has(id)) copy.delete(id);
            else copy.add(id);
            return copy;
        });
    }, []);

    /**
     * isAllSelected
     * - Derived boolean whether all visible local rows are selected
     * @type {boolean}
     */
    const isAllSelected = localTx.length > 0 && selectedIds.size === localTx.length;

    /**
     * toggleSelectAll
     * - Select or unselect all visible local rows
     */
    const toggleSelectAll = useCallback(() => {
        setSelectedIds((prev) => {
            if (isAllSelected) return new Set();
            return new Set(localTx.map((t) => t.id));
        });
    }, [localTx, isAllSelected]);

    /**
     * handleAddTransaction
     * - Add a new optimistic budget transaction row and start row-edit mode
     */
    const handleAddTransaction = useCallback(() => {
        try {
            const defaultPM = getDefaultPaymentMethodForAccount(filters?.account) || '';
            const newTx = {
                id: makeTempId(),
                name: '',
                amount: 0,
                category: '',
                criticality: '',
                transactionDate: new Date().toISOString(),
                account: filters?.account || '',
                paymentMethod: defaultPM,
                memo: '',
                __isNew: true,
                statementPeriod,
            };
            setLocalTx((prev) => [newTx, ...(prev || [])]);
            setEditing({ id: newTx.id, mode: 'row' });
            editValueRef.current = '';
            logger.info('added optimistic budget transaction', { id: newTx.id });
        } catch (err) {
            logger.error('handleAddTransaction failed', err);
        }
    }, [makeTempId, filters, statementPeriod]);

    /**
     * handleAddProjection
     * - Add a new optimistic projected transaction row and start row-edit mode
     */
    const handleAddProjection = useCallback(() => {
        try {
            const defaultPM = getDefaultPaymentMethodForAccount(filters?.account) || '';
            const newProj = {
                id: makeTempId(),
                name: '',
                amount: 0,
                category: '',
                criticality: '',
                transactionDate: new Date().toISOString(),
                account: filters?.account || '',
                paymentMethod: defaultPM,
                memo: '',
                __isNew: true,
                __isProjected: true,
                statementPeriod,
            };
            setLocalTx((prev) => [newProj, ...(prev || [])]);
            setEditing({ id: newProj.id, mode: 'row' });
            editValueRef.current = '';
            logger.info('added optimistic projected transaction', { id: newProj.id });
        } catch (err) {
            logger.error('handleAddProjection failed', err);
        }
    }, [makeTempId, filters, statementPeriod]);

    /**
     * handleCancelRow
     * - Cancel an edit. If the row is a temp row, remove it from localTx.
     *
     * @param {string} id
     */
    const handleCancelRow = useCallback((id) => {
        try {
            if (String(id).startsWith(TEMP_ID_PREFIX)) {
                setLocalTx((prev) => (prev || []).filter((t) => t.id !== id));
                setSelectedIds((prev) => {
                    const copy = new Set(prev);
                    if (copy.has(id)) copy.delete(id);
                    return copy;
                });
                setSaveErrors((prev) => {
                    if (!prev[id]) return prev;
                    const copy = { ...prev };
                    delete copy[id];
                    return copy;
                });
                setEditing(null);
                logger.info('cancelled and removed temp row', id);
            } else {
                setEditing(null);
            }
        } catch (err) {
            logger.error('handleCancelRow failed', err, id);
        }
    }, []);

    /**
     * openFilePicker
     * - Trigger the hidden file input to open
     */
    const openFilePicker = useCallback(() => {
        try {
            fileInputRef.current?.click();
        } catch (err) {
            logger.error('openFilePicker failed', err);
        }
    }, []);

    /**
     * startEditingField
     * - Start field edit mode for inline editing and store initial edit value
     *
     * @param {string} id
     * @param {string} field
     * @param {string} [initial='']
     */
    const startEditingField = useCallback((id, field, initial = '') => {
        setEditing({ id, mode: 'field', field });
        editValueRef.current = initial;
    }, []);

    /**
     * startEditingRow
     * - Put a row into row-edit mode
     * @param {string} id
     */
    const startEditingRow = useCallback((id) => {
        setEditing({ id, mode: 'row' });
    }, []);

    /**
     * toInputDate
     * - Convert ISO date to YYYY-MM-DD suitable for <input type="date">
     *
     * @param {string} iso
     * @returns {string}
     */
    const toInputDate = useCallback((iso) => {
        try {
            const d = new Date(iso);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        } catch (err) {
            logger.error('toInputDate failed', err);
            return '';
        }
    }, []);

    /**
     * handleCellDoubleClick
     * - Convenience handler to start editing a specific field when the cell is double clicked
     *
     * @param {object} tx
     * @param {string} field
     */
    const handleCellDoubleClick = useCallback((tx, field) => {
        const initial =
            field === 'transactionDate'
                ? tx.transactionDate
                    ? toInputDate(tx.transactionDate)
                    : toInputDate(new Date().toISOString())
                : tx[field] != null
                    ? String(tx[field])
                    : '';
        startEditingField(tx.id, field, initial);
    }, [startEditingField, toInputDate]);

    /**
     * handleEditKey
     * - Handle keyboard events in inline editors (Enter/Escape)
     *
     * @param {KeyboardEvent} e
     */
    const handleEditKey = useCallback((e) => {
        if (e?.key === 'Enter') {
            e.preventDefault();
        } else if (e?.key === 'Escape') {
            setEditing(null);
        }
    }, []);

    // Expose API surface
    return {
        // state
        localTx,
        setLocalTx,
        selectedIds,
        setSelectedIds,
        editing,
        setEditing,
        savingIds,
        setSavingIds,
        saveErrors,
        setSaveErrors,
        editValueRef,
        fileInputRef,

        // helpers
        makeTempId,
        toggleSelect,
        isAllSelected,
        toggleSelectAll,
        handleAddTransaction,
        handleAddProjection,
        handleCancelRow,
        openFilePicker,
        startEditingField,
        startEditingRow,
        toInputDate,
        handleCellDoubleClick,
        handleEditKey,
    };
}