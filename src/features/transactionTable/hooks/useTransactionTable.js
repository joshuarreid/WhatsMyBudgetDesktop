/**
 * useTransactionTable.js
 *
 * Hook that orchestrates transactions for the TransactionTable feature.
 *
 * Change: integrate projected transactions for the current statementPeriod by using
 * useProjectedTransactions and merging projected rows (marked with __isProjected)
 * into the table's localTx. Projected totals are included in computed `total`.
 *
 * All other behavior (create/update/delete/upload/save/cancel flows) is preserved.
 *
 * @module useTransactionTable
 */
import useProjectedTransactions from "../../../hooks/useProjectedTransactions";


const logger = {
    info: (...args) => console.log('[useTransactionTable]', ...args),
    error: (...args) => console.error('[useTransactionTable]', ...args),
};

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';

import localCacheService from '../../../services/LocalCacheService';
import { useTransactionsForAccount } from "../../../hooks/useTransactions";
import { publish as publishTransactionEvents } from '../../../services/TransactionEvents';
// Use the centralized config accessor instead of reading the raw JSON.
import {
    get as getConfig,
    getCriticalityForCategory,
    getCategories,
    getDefaultPaymentMethodForAccount
} from '../../../config/config.ts';

import {
    DEFAULT_CRITICALITY_OPTIONS,
    DEFAULT_CRITICALITY,
    STATEMENT_PERIOD_CACHE_KEY,
    TEMP_ID_PREFIX,
    CONFIG_KEYS,
    INPUT_DATE_LENGTH,
} from '../utils/constants';
import budgetTransactionService from "../../../services/BudgetTransactionService";


/**
 * CRITICALITY_OPTIONS - read once at module load
 */
const CRITICALITY_OPTIONS = (() => {
    try {
        const opts = getConfig(CONFIG_KEYS.CRITICALITY_OPTIONS);
        if (Array.isArray(opts) && opts.length > 0) return opts.map(String);
        logger.info('useTransactionTable: criticalityOptions not found in config; using defaults', { fallback: DEFAULT_CRITICALITY_OPTIONS });
        return DEFAULT_CRITICALITY_OPTIONS;
    } catch (err) {
        logger.error('useTransactionTable: failed to read criticalityOptions from config, using defaults', err);
        return DEFAULT_CRITICALITY_OPTIONS;
    }
})();

/**
 * CATEGORY_OPTIONS - read once
 */
const CATEGORY_OPTIONS = (() => {
    try {
        const cats = getCategories();
        if (Array.isArray(cats) && cats.length > 0) {
            const filtered = cats.filter((c) => typeof c === 'string').map(String);
            logger.info('useTransactionTable: loaded category options from config', { count: filtered.length, sample: filtered.slice(0, 5) });
            return filtered;
        }
        logger.info('useTransactionTable: no categories in config; category will be a freeform textbox');
        return null;
    } catch (err) {
        logger.error('useTransactionTable: failed to load categories from config', err);
        return null;
    }
})();

const IS_CATEGORY_DROPDOWN = Array.isArray(CATEGORY_OPTIONS) && CATEGORY_OPTIONS.length > 0;
const DEFAULT_CATEGORY = IS_CATEGORY_DROPDOWN ? CATEGORY_OPTIONS[0] : '';

/**
 * useTransactionTable(filters, statementPeriod)
 *
 * @param {Object} filters
 * @param {string} statementPeriod
 * @returns {Object} API surface for TransactionTable
 */
export function useTransactionTable(filters, statementPeriod) {
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [editing, setEditing] = useState(null); // { id, mode: 'field'|'row', field? }
    const [savingIds, setSavingIds] = useState(() => new Set());
    const [saveErrors, setSaveErrors] = useState(() => ({}));
    const txResult = useTransactionsForAccount(filters || {});

    /**
     * serverTx (memo)
     * - Combines personal and joint transaction arrays into a single sorted list.
     */
    const serverTx = useMemo(
        () => [
            ...(txResult.personalTransactions?.transactions || []),
            ...(txResult.jointTransactions?.transactions || [])
        ].sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)),
        [txResult.personalTransactions, txResult.jointTransactions]
    );

    // ---------------------------------------------------------
    // Important: ensure cachedStatementPeriod is declared BEFORE
    // we call useProjectedTransactions so we can pass it in as
    // the effective statementPeriod. Previously the hook was
    // invoked before cachedStatementPeriod existed, causing the
    // projection hook to see an empty statementPeriod and skip
    // fetching (observed in your logs).
    // ---------------------------------------------------------
    /**
     * cachedStatementPeriod (state)
     * - Tracks the current effective statementPeriod for the UI.
     * - Preferred source: statementPeriod param passed in by parent.
     * - Fallback: value read from server cache via STATEMENT_PERIOD_CACHE_KEY.
     */
    const [cachedStatementPeriod, setCachedStatementPeriod] = useState(statementPeriod || null);

    useEffect(() => {
        if (statementPeriod) {
            setCachedStatementPeriod(statementPeriod);
        }
    }, [statementPeriod]);

    useEffect(() => {
        let mounted = true;
        if (!cachedStatementPeriod) {
            logger.info('Attempting to load statementPeriod from local cache', { cacheKey: STATEMENT_PERIOD_CACHE_KEY });
            localCacheService.get(STATEMENT_PERIOD_CACHE_KEY)
                .then((data) => {
                    const val = data?.cacheValue ?? data?.value ?? data ?? null;
                    if (mounted) {
                        if (val) {
                            setCachedStatementPeriod(String(val));
                            logger.info('Loaded statementPeriod from cache', { value: val });
                        } else {
                            logger.info('No cached statementPeriod found; using generated/default if any');
                        }
                    }
                })
                .catch((err) => {
                    logger.error('Failed to load statementPeriod from cache', err);
                });
        }
        return () => { mounted = false; };
    }, [cachedStatementPeriod]);

    // --- Projected transactions integration --------------------------------
    // Use the cachedStatementPeriod first, then prop statementPeriod as fallback.
    // This ensures that when we read the persisted server value (cachedStatementPeriod)
    // the projections hook will re-run and fetch projections for that period.
    const effectiveStatementPeriod = cachedStatementPeriod || statementPeriod || undefined;
    const { projectedTx = [], loading: projectedLoading = false, error: projectedError = null, refetch: refetchProjected } =
        useProjectedTransactions({ statementPeriod: effectiveStatementPeriod, account: filters?.account || undefined });

    // localTx state contains any local new rows (id starts with TEMP_ID_PREFIX) + serverTx + projectedTx
    const [localTx, setLocalTx] = useState(() => serverTx);

    // Merge server + projected Tx into localTx while preserving local-only temp rows
    useEffect(() => {
        setLocalTx((prev) => {
            const localOnly = (prev || []).filter((t) => String(t.id).startsWith(TEMP_ID_PREFIX));
            // Merge serverTx and projectedTx (projectedTx already marked with __isProjected)
            const merged = [...serverTx];
            if (Array.isArray(projectedTx) && projectedTx.length > 0) {
                // sort projected by date descending and append
                const projSorted = [...projectedTx].sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
                merged.push(...projSorted);
            }
            const final = [...localOnly, ...merged];
            return final;
        });
    }, [serverTx, projectedTx]);

    // compute totals
    const totalFromServer = typeof txResult.total === 'number' ? txResult.total : Number(txResult.total) || 0;
    const projectedTotal = useMemo(() => {
        if (!Array.isArray(projectedTx)) return 0;
        return projectedTx.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    }, [projectedTx]);

    const total = (totalFromServer || 0) + (projectedTotal || 0);

    const personalBalance = typeof txResult.personalTotal === 'number'
        ? txResult.personalTotal
        : Number(txResult.personalTotal) || 0;
    const jointBalance = typeof txResult.jointTotal === 'number'
        ? txResult.jointTotal
        : Number(txResult.jointTotal) || 0;

    const countFromServer = (txResult.personalTransactions?.count || 0) + (txResult.jointTransactions?.count || 0);
    const count = countFromServer + (Array.isArray(projectedTx) ? projectedTx.length : 0);

    const loading = txResult.loading || projectedLoading || false;
    const error = txResult.error || projectedError || null;
    // -----------------------------------------------------------------------

    const editValueRef = useRef('');
    const fileInputRef = useRef(null);

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

    const makeTempId = useCallback(() => `${TEMP_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, []);

    const handleAddTransaction = useCallback(() => {
        const defaultCrit = ''; // blank in UI by default
        const defaultPM = getDefaultPaymentMethodForAccount(filters?.account) || '';
        const newTx = {
            id: makeTempId(),
            name: '',
            amount: 0,
            category: '',
            criticality: defaultCrit,
            transactionDate: new Date().toISOString(),
            account: filters?.account || '',
            paymentMethod: defaultPM,
            memo: '',
            __isNew: true,
            statementPeriod: cachedStatementPeriod || undefined,
        };
        setLocalTx((prev) => [newTx, ...(prev || [])]);
        setEditing({ id: newTx.id, mode: 'row' });
        editValueRef.current = '';
        logger.info('handleAddTransaction: created local new tx', { tempId: newTx.id, statementPeriod: newTx.statementPeriod, defaultCriticality: newTx.criticality, defaultCategory: newTx.category, defaultPaymentMethod: newTx.paymentMethod });
    }, [makeTempId, filters, cachedStatementPeriod]);

    const handleCancelRow = useCallback((id) => {
        if (String(id).startsWith(TEMP_ID_PREFIX)) {
            setLocalTx((prev) => {
                const beforeCount = (prev || []).length;
                const next = (prev || []).filter((t) => t.id !== id);
                logger.info('handleCancelRow: removed local new tx', { id, beforeCount, afterCount: next.length });
                return next;
            });
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
        } else {
            logger.info('handleCancelRow: canceled editing existing row', { id });
            setEditing(null);
        }
    }, []);

    const handleDeleteSelected = useCallback(
        async () => {
            if (selectedIds.size === 0) return;
            const ids = Array.from(selectedIds);
            const localOnly = ids.filter((id) => String(id).startsWith(TEMP_ID_PREFIX));
            const toDeleteFromAPI = ids.filter((id) => !String(id).startsWith(TEMP_ID_PREFIX));

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
                try { publishTransactionEvents({ type: 'transactionsChanged', reason: 'delete', ids: toDeleteFromAPI }); } catch (err) { logger.error('publish transaction event failed', err); }
                // keep projections in sync
                try { await refetchProjected(); } catch (err) { logger.error('refetchProjected after delete failed', err); }
                logger.info('handleDeleteSelected: deleted server ids', { toDeleteFromAPI });
            } catch (err) {
                logger.error('Error deleting transactions', err);
            }
        },
        [selectedIds, txResult, refetchProjected]
    );

    const handleFileChange = useCallback(
        async (ev) => {
            const file = ev.target.files && ev.target.files[0];
            if (!file) return;

            const effectiveStatementPeriod = cachedStatementPeriod || statementPeriod || undefined;

            try {
                logger.info('handleFileChange: uploading file', { fileName: file.name, statementPeriod: effectiveStatementPeriod });
                await budgetTransactionService.uploadTransactions(file, effectiveStatementPeriod);
                await txResult.refetch();
                try { publishTransactionEvents({ type: 'transactionsChanged', reason: 'upload', fileName: file.name }); } catch (err) { logger.error('publish transaction event failed', err); }
                // refresh projections as well
                try { await refetchProjected(); } catch (err) { logger.error('refetchProjected after upload failed', err); }
                logger.info('handleFileChange: upload complete');
            } catch (err) {
                logger.error('Upload failed', err);
            } finally {
                ev.target.value = '';
            }
        },
        [txResult, statementPeriod, cachedStatementPeriod, refetchProjected]
    );

    const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);

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

    const validateForCreate = useCallback((tx) => {
        const errors = [];
        if (!tx.name || String(tx.name).trim() === '') errors.push('Name is required');
        if (tx.amount == null || Number.isNaN(Number(tx.amount))) errors.push('Amount must be a number');

        if (tx.criticality != null && String(tx.criticality).trim() !== '') {
            const val = String(tx.criticality).trim();
            const match = CRITICALITY_OPTIONS.find((o) => o.toLowerCase() === val.toLowerCase());
            if (!match) {
                errors.push(`Criticality must be one of: ${CRITICALITY_OPTIONS.join(', ')}`);
            }
        }

        if (IS_CATEGORY_DROPDOWN) {
            const val = tx.category == null ? '' : String(tx.category).trim();
            if (val === '') {
                errors.push('Category is required');
            } else {
                const matched = CATEGORY_OPTIONS.find((c) => c === val);
                if (!matched) {
                    errors.push(`Category must be one of: ${CATEGORY_OPTIONS.join(', ')}`);
                }
            }
        }

        return errors;
    }, []);

    const stripClientFields = useCallback((tx) => {
        const copy = { ...tx };
        delete copy.id;
        delete copy.__isNew;
        return copy;
    }, []);

    const handleSaveRow = useCallback(
        async (id, updatedFields = {}, addAnother = false) => {
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

            setSaveErrors((prev) => {
                if (!prev[id]) return prev;
                const copy = { ...prev };
                delete copy[id];
                return copy;
            });

            const effectiveStatementPeriod = txToPersist.statementPeriod || cachedStatementPeriod || statementPeriod || undefined;
            if (effectiveStatementPeriod) {
                txToPersist = { ...txToPersist, statementPeriod: effectiveStatementPeriod };
            }

            const isNew = String(id).startsWith(TEMP_ID_PREFIX) || txToPersist.__isNew;
            if (isNew) {
                const validationErrors = validateForCreate(txToPersist);
                if (validationErrors.length > 0) {
                    setSaveErrors((prev) => ({ ...prev, [id]: validationErrors.join('. ') }));
                    logger.info('handleSaveRow: validation failed for create', { id, validationErrors });
                    return;
                }
            }

            setSavingIds((prev) => {
                const copy = new Set(prev);
                copy.add(id);
                return copy;
            });

            try {
                if (isNew) {
                    logger.info('handleSaveRow: creating new transaction', { id, statementPeriod: effectiveStatementPeriod });
                    const payload = stripClientFields({ ...txToPersist, statementPeriod: effectiveStatementPeriod });
                    const created = await budgetTransactionService.createTransaction(payload);
                    setLocalTx((prev) => prev.map((t) => (t.id === id ? { ...created } : t)));
                    try { publishTransactionEvents({ type: 'transactionsChanged', reason: 'create', transaction: created }); } catch (err) { logger.error('publish transaction event failed', err); }
                    logger.info('handleSaveRow: created', { tempId: id, createdId: created.id });

                    if (addAnother) {
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
                            statementPeriod: cachedStatementPeriod || statementPeriod || undefined,
                        };
                        setLocalTx((prev) => [newTx, ...(prev || [])]);
                        setEditing({ id: newTx.id, mode: 'row' });
                        logger.info('handleSaveRow: added another new tx temp', { newTempId: newTx.id, defaultCriticality: newTx.criticality, defaultPaymentMethod: newTx.paymentMethod });
                    } else {
                        try { await txResult.refetch(); } catch (e) { logger.error('refetch after create failed', e); }
                        // refresh projections after successful create
                        try { await refetchProjected(); } catch (err) { logger.error('refetchProjected after create failed', err); }
                    }
                } else {
                    logger.info('handleSaveRow: updating transaction', { id, statementPeriod: effectiveStatementPeriod });
                    const payload = stripClientFields({ ...txToPersist, statementPeriod: effectiveStatementPeriod });
                    await budgetTransactionService.updateTransaction(id, payload);
                    try { publishTransactionEvents({ type: 'transactionsChanged', reason: 'update', id, payload }); } catch (err) { logger.error('publish transaction event failed', err); }
                    logger.info('handleSaveRow: updated', { id });
                    try { await txResult.refetch(); } catch (e) { logger.error('refetch after update failed', e); }
                    // refresh projections after update
                    try { await refetchProjected(); } catch (err) { logger.error('refetchProjected after update failed', err); }
                }
            } catch (err) {
                logger.error('handleSaveRow: persist failed', err);
                setSaveErrors((prev) => ({ ...prev, [id]: err.message || String(err) }));
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
        [makeTempId, txResult, validateForCreate, filters, statementPeriod, stripClientFields, cachedStatementPeriod, refetchProjected]
    );

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
        handleCancelRow,
        startEditingRow,
        startEditingField,
        toInputDate,
        setEditing,
        savingIds,
        saveErrors,
        setLocalTx,
        // expose statementPeriod and projection helpers for consumers
        statementPeriod: cachedStatementPeriod || statementPeriod || undefined,
        projectedTotal,
        projectedTx,
        refetchProjected,
        criticalityOptions: CRITICALITY_OPTIONS,
        getCriticalityForCategory,
        categoryOptions: CATEGORY_OPTIONS || [],
        isCategoryDropdown: IS_CATEGORY_DROPDOWN,
    };
}