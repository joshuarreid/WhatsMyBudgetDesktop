const logger = {
    info: (...args) => console.log('[useTransactionTable]', ...args),
    error: (...args) => console.error('[useTransactionTable]', ...args),
};

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import budgetTransactionService from '../../services/BudgetTransactionService';
import {useTransactionsForAccount} from "../../hooks/useTransactions";


/**
 * useTransactionTable(filters, statementPeriod)
 *
 * - Maintains localTx state (server transactions + local new rows)
 * - Supports add / cancel /save / save-and-add flows for new rows
 * - Persists created transactions with the provided statementPeriod
 *
 * NOTE: cleared/uncleared functionality removed as it's unused.
 */
export function useTransactionTable(filters, statementPeriod) {
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [editing, setEditing] = useState(null); // { id, mode: 'field'|'row', field? }
    const [savingIds, setSavingIds] = useState(() => new Set());
    const [saveErrors, setSaveErrors] = useState(() => ({})); // { [id]: message }

    const txResult = useTransactionsForAccount(filters || {});

    // Combine personal and joint transactions for display, sorted by date desc
    const serverTx = useMemo(
        () => [
            ...(txResult.personalTransactions?.transactions || []),
            ...(txResult.jointTransactions?.transactions || [])
        ].sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)),
        [txResult.personalTransactions, txResult.jointTransactions]
    );

    // localTx state contains any local new rows (id starts with 'new-') + serverTx (server authoritative)
    const [localTx, setLocalTx] = useState(() => serverTx);

    // keep localTx in sync with server results while preserving local-only "new-" rows
    useEffect(() => {
        setLocalTx((prev) => {
            const localOnly = (prev || []).filter((t) => String(t.id).startsWith('new-'));
            return [...localOnly, ...serverTx];
        });
    }, [serverTx]);

    const total = typeof txResult.total === 'number' ? txResult.total : Number(txResult.total) || 0;
    const personalBalance = typeof txResult.personalTotal === 'number'
        ? txResult.personalTotal
        : Number(txResult.personalTotal) || 0;
    const jointBalance = typeof txResult.jointTotal === 'number'
        ? txResult.jointTotal
        : Number(txResult.jointTotal) || 0;
    const count = (txResult.personalTransactions?.count || 0) + (txResult.jointTransactions?.count || 0);
    const loading = txResult.loading || false;
    const error = txResult.error || null;

    const editValueRef = useRef('');
    const fileInputRef = useRef(null);

    // Selection
    const toggleSelect = useCallback((id) => {
        setSelectedIds((prev) => {
            const copy = new Set(prev);
            if (copy.has(id)) copy.delete(id);
            else copy.add(id);
            return copy;
        });
    }, []);

    const isAllSelected = localTx.length > 0 && selectedIds.size === localTx.length;
    const toggleSelectAll = useCallback(() => {
        setSelectedIds((prev) => {
            if (isAllSelected) return new Set();
            return new Set(localTx.map((t) => t.id));
        });
    }, [localTx, isAllSelected]);

    // Utility to generate a unique temp id for new rows
    const makeTempId = useCallback(() => `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, []);

    // Add transaction (local-only draft)
    const handleAddTransaction = useCallback(() => {
        const newTx = {
            id: makeTempId(),
            name: '',
            amount: 0,
            category: '',
            criticality: '',
            transactionDate: new Date().toISOString(),
            account: filters?.account || '',
            paymentMethod: '',
            memo: '',
            __isNew: true,
        };
        setLocalTx((prev) => [newTx, ...(prev || [])]);
        setEditing({ id: newTx.id, mode: 'row' });
        editValueRef.current = '';
        logger.info('handleAddTransaction: created local new tx', { tempId: newTx.id });
    }, [makeTempId, filters]);

    // Delete selected
    const handleDeleteSelected = useCallback(
        async () => {
            if (selectedIds.size === 0) return;
            const ids = Array.from(selectedIds);
            const localOnly = ids.filter((id) => String(id).startsWith('new-'));
            const toDeleteFromAPI = ids.filter((id) => !String(id).startsWith('new-'));

            if (localOnly.length) {
                setLocalTx((prev) => prev.filter((t) => !localOnly.includes(t.id)));
                setSelectedIds((prev) => {
                    const copy = new Set(prev);
                    localOnly.forEach((id) => copy.delete(id));
                    return copy;
                });
                logger.info('handleDeleteSelected: removed local-only ids', { localOnly });
            }

            if (toDeleteFromAPI.length === 0) return;

            try {
                await Promise.all(
                    toDeleteFromAPI.map((id) =>
                        budgetTransactionService.deleteTransaction(id).catch((err) => {
                            logger.error(`Failed to delete ${id}`, err);
                        })
                    )
                );
                await txResult.refetch();
                logger.info('handleDeleteSelected: deleted server ids', { toDeleteFromAPI });
            } catch (err) {
                logger.error('Error deleting transactions', err);
            }
        },
        [selectedIds, txResult]
    );

    // File import (unchanged)
    const handleFileChange = useCallback(
        async (ev) => {
            const file = ev.target.files && ev.target.files[0];
            if (!file) return;
            try {
                await budgetTransactionService.uploadTransactions(file, statementPeriod);
                await txResult.refetch();
                logger.info('handleFileChange: upload complete');
            } catch (err) {
                logger.error('Upload failed', err);
            } finally {
                ev.target.value = '';
            }
        },
        [txResult, statementPeriod]
    );

    const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);

    // Editing helpers
    const startEditingField = useCallback((id, field, initial = '') => {
        setEditing({ id, mode: 'field', field });
        editValueRef.current = initial;
        logger.info('startEditingField', { id, field, initial });
    }, []);

    const startEditingRow = useCallback((id) => {
        setEditing({ id, mode: 'row' });
        logger.info('startEditingRow', { id });
    }, []);

    function toInputDate(iso) {
        try {
            const d = new Date(iso);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        } catch {
            return '';
        }
    }

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
    }, [startEditingField]);

    const handleEditKey = useCallback(
        (e, id, field) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            } else if (e.key === 'Escape') {
                setEditing(null);
            }
        },
        []
    );

    // validate helper
    const validateForCreate = useCallback((tx) => {
        const errors = [];
        if (!tx.name || String(tx.name).trim() === '') errors.push('Name is required');
        if (tx.amount == null || Number.isNaN(Number(tx.amount))) errors.push('Amount must be a number');
        return errors;
    }, []);

    // Helper to strip client-only fields before sending to server (do not send id)
    const stripClientFields = useCallback((tx) => {
        const copy = { ...tx };
        delete copy.id;
        delete copy.__isNew;
        return copy;
    }, []);

    // Save whole-row (explicit Save). addAnother = boolean indicates "save and add another"
    const handleSaveRow = useCallback(
        async (id, updatedFields = {}, addAnother = false) => {
            // merge changes into localTx synchronously (functional update)
            let txToPersist = null;
            setLocalTx((prev) =>
                prev.map((t) => {
                    if (t.id !== id) return t;
                    const updated = { ...t, ...updatedFields };
                    txToPersist = updated;
                    return updated;
                })
            );

            setEditing(null);

            if (!txToPersist) {
                logger.error('handleSaveRow: transaction not found locally', { id, updatedFields });
                return;
            }

            // clear previous errors
            setSaveErrors((prev) => {
                if (!prev[id]) return prev;
                const copy = { ...prev };
                delete copy[id];
                return copy;
            });

            const isNew = String(id).startsWith('new-') || txToPersist.__isNew;
            if (isNew) {
                const validationErrors = validateForCreate(txToPersist);
                if (validationErrors.length > 0) {
                    setSaveErrors((prev) => ({ ...prev, [id]: validationErrors.join('. ') }));
                    logger.info('handleSaveRow: validation failed for create', { id, validationErrors });
                    return;
                }
            }

            // mark saving
            setSavingIds((prev) => {
                const copy = new Set(prev);
                copy.add(id);
                return copy;
            });

            try {
                if (isNew) {
                    logger.info('handleSaveRow: creating new transaction', { id, statementPeriod });
                    // DO NOT send id in payload (strip before sending)
                    const payload = stripClientFields({ ...txToPersist, statementPeriod });
                    const created = await budgetTransactionService.createTransaction(payload);
                    // replace temp id row with created row
                    setLocalTx((prev) => prev.map((t) => (t.id === id ? { ...created } : t)));
                    logger.info('handleSaveRow: created', { tempId: id, createdId: created.id });

                    if (addAnother) {
                        // create a fresh local new row and start editing it
                        const newTx = {
                            id: makeTempId(),
                            name: '',
                            amount: 0,
                            category: '',
                            criticality: '',
                            transactionDate: new Date().toISOString(),
                            account: filters?.account || '',
                            paymentMethod: '',
                            memo: '',
                            __isNew: true,
                        };
                        setLocalTx((prev) => [newTx, ...(prev || [])]);
                        setEditing({ id: newTx.id, mode: 'row' });
                        logger.info('handleSaveRow: added another new tx temp', { newTempId: newTx.id });
                    } else {
                        // refresh server data to ensure consistency
                        try { await txResult.refetch(); } catch (e) { logger.error('refetch after create failed', e); }
                    }
                } else {
                    logger.info('handleSaveRow: updating transaction', { id, statementPeriod });
                    // Do not include id in request body; id is provided in URL by updateTransaction
                    const payload = stripClientFields({ ...txToPersist, statementPeriod });
                    await budgetTransactionService.updateTransaction(id, payload);
                    logger.info('handleSaveRow: updated', { id });
                    try { await txResult.refetch(); } catch (e) { logger.error('refetch after update failed', e); }
                }
            } catch (err) {
                logger.error('handleSaveRow: persist failed', err);
                setSaveErrors((prev) => ({ ...prev, [id]: err.message || String(err) }));
                // if create failed, we keep local new tx so user can retry — do not wipe it
                if (!isNew) {
                    try {
                        await txResult.refetch();
                    } catch (fetchErr) {
                        logger.error('fetchTransactions after failed persist also failed', fetchErr);
                    }
                }
            } finally {
                setSavingIds((prev) => {
                    const copy = new Set(prev);
                    copy.delete(id);
                    return copy;
                });
            }
        },
        [makeTempId, txResult, validateForCreate, filters, statementPeriod, stripClientFields]
    );

    // For backwards compatibility: single-field save (still supported)
    const handleSaveEdit = useCallback(
        async (id, field, value) => {
            const patch = {};
            if (field === 'amount') patch.amount = Number(value) || 0;
            else if (field === 'transactionDate') patch.transactionDate = value ? new Date(value).toISOString() : undefined;
            else patch[field] = value;
            await handleSaveRow(id, patch, false);
        },
        [handleSaveRow]
    );

    return {
        localTx,
        loading,
        error,
        selectedIds,
        editing,
        editValueRef,
        fileInputRef,
        total,
        jointBalance,
        personalBalance,
        count,
        isAllSelected,
        toggleSelect,
        toggleSelectAll,
        handleAddTransaction,
        handleDeleteSelected,
        handleFileChange,
        openFilePicker,
        handleCellDoubleClick,
        handleEditKey,
        handleSaveEdit,
        handleSaveRow,
        startEditingRow,
        startEditingField,
        toInputDate,
        setEditing,
        savingIds,
        saveErrors,
        setLocalTx,
    };
}