import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import apiService from '../../services/apiService';

export function useTransactionTable(filters, statementPeriod) {
    const [localTx, setLocalTx] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [editing, setEditing] = useState(null);
    const editValueRef = useRef('');
    const fileInputRef = useRef(null);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiService.getTransactions(filters || {});
            setLocalTx(Array.isArray(data) ? data.map((t) => ({ ...t })) : []);
            setSelectedIds(new Set());
        } catch (err) {
            // Robust logging
            if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.error('[TransactionTable] Failed to load transactions', err);
            }
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    // Totals: cleared sum, uncleared sum, working total
    const { clearedBalance, unclearedBalance, workingBalance } = useMemo(() => {
        let cleared = 0;
        let total = 0;
        for (const t of localTx) {
            const a = Number(t.amount) || 0;
            total += a;
            if (t.cleared) cleared += a;
        }
        return {
            clearedBalance: cleared,
            unclearedBalance: total - cleared,
            workingBalance: total,
        };
    }, [localTx]);

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

    // Add transaction
    const handleAddTransaction = useCallback(() => {
        const newTx = {
            id: `new-${Date.now()}`,
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
        setEditing({ id: newTx.id, field: 'name' });
        editValueRef.current = '';
    }, []);

    // Delete selected
    const handleDeleteSelected = useCallback(async () => {
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
        }

        if (toDeleteFromAPI.length === 0) return;

        setLoading(true);
        try {
            await Promise.all(
                toDeleteFromAPI.map((id) =>
                    apiService.deleteTransaction(id).catch((err) => {
                        if (process.env.NODE_ENV === 'development') {
                            // eslint-disable-next-line no-console
                            console.error(`[TransactionTable] Failed to delete ${id}`, err);
                        }
                    })
                )
            );
            await fetchTransactions();
        } catch (err) {
            if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.error('[TransactionTable] Error deleting transactions', err);
            }
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [selectedIds, fetchTransactions]);

    // File import
    const handleFileChange = useCallback(
        async (ev) => {
            const file = ev.target.files && ev.target.files[0];
            if (!file) return;
            setLoading(true);
            setError(null);
            try {
                await apiService.uploadTransactions(file, statementPeriod);
                await fetchTransactions();
            } catch (err) {
                if (process.env.NODE_ENV === 'development') {
                    // eslint-disable-next-line no-console
                    console.error('[TransactionTable] Upload failed', err);
                }
                setError(err);
            } finally {
                ev.target.value = '';
                setLoading(false);
            }
        },
        [fetchTransactions, statementPeriod]
    );

    const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);

    // Editing helpers
    const startEditing = useCallback((id, field, initial = '') => {
        setEditing({ id, field });
        editValueRef.current = initial;
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
        startEditing(tx.id, field, initial);
    }, [startEditing]);

    const handleEditKey = useCallback(
        (e, id, field) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveEdit(id, field, editValueRef.current);
            } else if (e.key === 'Escape') {
                setEditing(null);
            }
        },
        // handleSaveEdit comes from below, so we'll add it after declaration
        []
    );

    // Save edit (create if new, update otherwise)
    const handleSaveEdit = useCallback(
        async (id, field, value) => {
            setLocalTx((prev) =>
                prev.map((t) => {
                    if (t.id !== id) return t;
                    const updated = { ...t };
                    if (field === 'amount') updated.amount = Number(value) || 0;
                    else if (field === 'transactionDate') updated.transactionDate = value ? new Date(value).toISOString() : t.transactionDate;
                    else updated[field] = value;
                    return updated;
                })
            );
            setEditing(null);

            const tx = localTx.find((t) => t.id === id) || {};
            const updatedTx = { ...tx };
            if (field === 'amount') updatedTx.amount = Number(value) || 0;
            else if (field === 'transactionDate') updatedTx.transactionDate = value ? new Date(value).toISOString() : tx.transactionDate;
            else updatedTx[field] = value;

            try {
                if (String(id).startsWith('new-') || tx.__isNew) {
                    const created = await apiService.createTransaction(updatedTx);
                    setLocalTx((prev) => prev.map((t) => (t.id === id ? { ...created } : t)));
                } else {
                    await apiService.updateTransaction(id, updatedTx);
                }
            } catch (err) {
                if (process.env.NODE_ENV === 'development') {
                    // eslint-disable-next-line no-console
                    console.error('[TransactionTable] Failed to persist edit', err);
                }
                setError(err);
                await fetchTransactions();
            }
        },
        [localTx, fetchTransactions]
    );

    // Patch handleEditKey to use the actual handleSaveEdit
    const patchedHandleEditKey = useCallback(
        (e, id, field) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveEdit(id, field, editValueRef.current);
            } else if (e.key === 'Escape') {
                setEditing(null);
            }
        },
        [handleSaveEdit]
    );

    // Toggle cleared state (persists)
    const toggleCleared = useCallback(
        async (tx) => {
            const updated = { ...tx, cleared: !tx.cleared };
            setLocalTx((prev) => prev.map((t) => (t.id === tx.id ? updated : t)));
            try {
                if (String(tx.id).startsWith('new-') || tx.__isNew) {
                    return;
                }
                await apiService.updateTransaction(tx.id, updated);
            } catch (err) {
                if (process.env.NODE_ENV === 'development') {
                    // eslint-disable-next-line no-console
                    console.error('[TransactionTable] Failed to update cleared state', err);
                }
                setError(err);
                await fetchTransactions();
            }
        },
        [fetchTransactions]
    );

    return {
        localTx,
        loading,
        error,
        selectedIds,
        editing,
        editValueRef,
        fileInputRef,
        clearedBalance,
        unclearedBalance,
        workingBalance,
        isAllSelected,
        toggleSelect,
        toggleSelectAll,
        handleAddTransaction,
        handleDeleteSelected,
        handleFileChange,
        openFilePicker,
        handleCellDoubleClick,
        patchedHandleEditKey,
        handleSaveEdit,
        startEditing,
        toInputDate,
        toggleCleared,
        setEditing,
    };
}