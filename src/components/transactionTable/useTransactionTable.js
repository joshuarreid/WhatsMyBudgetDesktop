import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import apiService from '../../services/apiService';
import {useTransactionsForAccount} from "../../hooks/useTransactions";


const logger = {
    info: (...args) => console.log('[useTransactionTable]', ...args),
    error: (...args) => console.error('[useTransactionTable]', ...args),
};

export function useTransactionTable(filters, statementPeriod) {
    // Removed local loading and error state (use txResult only)
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [editing, setEditing] = useState(null); // { id, mode: 'field'|'row', field? }
    const [savingIds, setSavingIds] = useState(() => new Set());
    const [saveErrors, setSaveErrors] = useState(() => ({})); // { [id]: message }

    const txResult = useTransactionsForAccount(filters || {});
    // Combine personal and joint transactions for display, sorted by date desc
    const localTx = useMemo(
        () => [
            ...(txResult.personalTransactions?.transactions || []),
            ...(txResult.jointTransactions?.transactions || [])
        ].sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)),
        [txResult.personalTransactions, txResult.jointTransactions]
    );
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

    // Add transaction (local-only draft)
    const handleAddTransaction = useCallback(() => {
        const newTx = {
            name: '',
            amount: 0,
            category: '',
            criticality: '',
            transactionDate: new Date().toISOString(),
            account: '',
            paymentMethod: '',
            cleared: false,
            __isNew: true,
        };
        setLocalTx((prev) => [newTx, ...prev]);
        setEditing({ id: newTx.id, mode: 'row' });
        editValueRef.current = '';
        logger.info('handleAddTransaction: created local new tx', { name: newTx.name });
    }, []);

    // Delete selected (unchanged)
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
                        apiService.deleteTransaction(id).catch((err) => {
                            logger.error(`Failed to delete ${id}`, err);
                        })
                    )
                );
                await txResult.refetch();
                logger.info('handleDeleteSelected: deleted server ids', { toDeleteFromAPI });
            } catch (err) {
                logger.error('Error deleting transactions', err);
                setError(err);
            }
        },
        [selectedIds, txResult.refetch]
    );

    // File import (unchanged)
    const handleFileChange = useCallback(
        async (ev) => {
            const file = ev.target.files && ev.target.files[0];
            if (!file) return;
            try {
                await apiService.uploadTransactions(file, statementPeriod);
                await txResult.refetch();
                logger.info('handleFileChange: upload complete');
            } catch (err) {
                logger.error('Upload failed', err);
                setError(err);
            } finally {
                ev.target.value = '';
            }
        },
        [txResult.refetch, statementPeriod]
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

    // key handler wrapper -- will call explicit save function (below)
    const handleEditKey = useCallback(
        (e, id, field) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // For field mode we still support single-field save
                // caller will call handleSaveEdit for compatibility
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

    // Save whole-row (explicit Save)
    const handleSaveRow = useCallback(
        async (id, updatedFields) => {
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
                    logger.info('handleSaveRow: creating new transaction', { id });
                    const created = await apiService.createTransaction(txToPersist);
                    setLocalTx((prev) => prev.map((t) => (t.id === id ? { ...created } : t)));
                    logger.info('handleSaveRow: created', { tempId: id, createdId: created.id });
                } else {
                    logger.info('handleSaveRow: updating transaction', { id });
                    await apiService.updateTransaction(id, txToPersist);
                    logger.info('handleSaveRow: updated', { id });
                }
            } catch (err) {
                logger.error('handleSaveRow: persist failed', err);
                setSaveErrors((prev) => ({ ...prev, [id]: err.message || String(err) }));
                setError(err);
                if (!isNew) {
                    try {
                        await txResult.refetch();
                    } catch (fetchErr) {
                        logger.error('fetchTransactions after failed persist also failed', fetchErr);
                    }
                } else {
                    logger.info('Preserving local new transaction after create failure', { id });
                }
            } finally {
                setSavingIds((prev) => {
                    const copy = new Set(prev);
                    copy.delete(id);
                    return copy;
                });
            }
        },
        [txResult.refetch, validateForCreate]
    );

    // For backwards compatibility: single-field save (still supported)
    const handleSaveEdit = useCallback(
        async (id, field, value) => {
            const patch = {};
            if (field === 'amount') patch.amount = Number(value) || 0;
            else if (field === 'transactionDate') patch.transactionDate = value ? new Date(value).toISOString() : undefined;
            else patch[field] = value;
            await handleSaveRow(id, patch);
        },
        [handleSaveRow]
    );

    // Toggle cleared state (persists)
    const toggleCleared = useCallback(
        async (tx) => {
            const updated = { ...tx, cleared: !tx.cleared };
            setLocalTx((prev) => prev.map((t) => (t.id === tx.id ? updated : t)));
            try {
                if (String(tx.id).startsWith('new-') || tx.__isNew) {
                    logger.info('toggleCleared: updated local new transaction', { id: tx.id, cleared: updated.cleared });
                    return;
                }
                await apiService.updateTransaction(tx.id, updated);
                logger.info('toggleCleared: updated persisted transaction', { id: tx.id, cleared: updated.cleared });
            } catch (err) {
                logger.error('Failed to update cleared state', err);
                setError(err);
                await txResult.refetch();
            }
        },
        [txResult.refetch]
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
        toggleCleared,
        setEditing,
        savingIds,
        saveErrors,
    };
}