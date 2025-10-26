const logger = {
    info: (...args) => console.log('[useTransactionTable]', ...args),
    error: (...args) => console.error('[useTransactionTable]', ...args),
};

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import budgetTransactionService from '../../../services/BudgetTransactionService';
import localCacheService from '../../../services/LocalCacheService';
import { useTransactionsForAccount } from "../../../hooks/useTransactions";
// Use the centralized config accessor instead of reading the raw JSON.
// Adjust the relative path if your config module lives elsewhere.
import {
    get as getConfig,
    getCriticalityForCategory,
    getCategories,
    getDefaultPaymentMethodForAccount
} from '../../../config/config.ts';

// constants moved out for scalability / debugging
import {
    DEFAULT_CRITICALITY_OPTIONS,
    DEFAULT_CRITICALITY,
    STATEMENT_PERIOD_CACHE_KEY,
    TEMP_ID_PREFIX,
    CONFIG_KEYS,
    INPUT_DATE_LENGTH,
} from '../utils/constants';

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

/* Category options: if config provides categories, expose them and treat category as a dropdown.
   Otherwise consumers should render a freeform textbox. */
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

// -------------------- hook implementation --------------------

/**
 * useTransactionTable(filters, statementPeriod)
 *
 * - Maintains localTx state (server transactions + local new rows)
 * - Supports add / cancel /save / save-and-add flows for new rows
 * - Persists created transactions with the provided statementPeriod
 *
 * NOTE: cleared/uncleared functionality removed as it's unused.
 *
 * Enhancement:
 * - If statementPeriod is not provided via props, read the cached value from LocalCacheService
 *   (cacheKey = STATEMENT_PERIOD_CACHE_KEY) and use it when creating/updating/uploading transactions.
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

    // localTx state contains any local new rows (id starts with TEMP_ID_PREFIX) + serverTx (server authoritative)
    const [localTx, setLocalTx] = useState(() => serverTx);

    // keep localTx in sync with server results while preserving local-only "new-" rows
    useEffect(() => {
        setLocalTx((prev) => {
            const localOnly = (prev || []).filter((t) => String(t.id).startsWith(TEMP_ID_PREFIX));
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

    // New: statementPeriod state — prefer provided prop, otherwise attempt to load from cache
    const [cachedStatementPeriod, setCachedStatementPeriod] = useState(statementPeriod || null);

    // if parent passes a statementPeriod prop, keep state in sync
    useEffect(() => {
        if (statementPeriod) {
            setCachedStatementPeriod(statementPeriod);
        }
    }, [statementPeriod]);

    // On mount (or when no statementPeriod present) attempt to read server cache for currentStatementPeriod
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
    const makeTempId = useCallback(() => `${TEMP_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, []);

    // Add transaction (local-only draft) — default criticality is wired from config (DEFAULT_CRITICALITY)
    // Now also pick the default payment method for the current account (screen) so new rows get a sensible default immediately.
    const handleAddTransaction = useCallback(() => {
        const defaultCrit = DEFAULT_CRITICALITY;
        // derive default payment method for current screen/account
        const defaultPM = getDefaultPaymentMethodForAccount(filters?.account) || '';
        const newTx = {
            id: makeTempId(),
            name: '',
            amount: 0,
            // If categories are configured, initialize to the default category (first option).
            // Otherwise keep it as empty string for freeform textbox.
            category: DEFAULT_CATEGORY,
            criticality: defaultCrit,
            transactionDate: new Date().toISOString(),
            account: filters?.account || '',
            paymentMethod: defaultPM,
            memo: '',
            __isNew: true,
            // append statementPeriod to local tx so save uses it even if statementPeriod prop missing
            statementPeriod: cachedStatementPeriod || undefined,
        };
        setLocalTx((prev) => [newTx, ...(prev || [])]);
        setEditing({ id: newTx.id, mode: 'row' });
        editValueRef.current = '';
        logger.info('handleAddTransaction: created local new tx', { tempId: newTx.id, statementPeriod: newTx.statementPeriod, defaultCriticality: newTx.criticality, defaultCategory: newTx.category, defaultPaymentMethod: newTx.paymentMethod });
    }, [makeTempId, filters, cachedStatementPeriod]);

    // Cancel row editing (new or existing)
    const handleCancelRow = useCallback((id) => {
        // if it's a local-only new row, remove it entirely
        if (String(id).startsWith(TEMP_ID_PREFIX)) {
            setLocalTx((prev) => {
                const beforeCount = (prev || []).length;
                const next = (prev || []).filter((t) => t.id !== id);
                logger.info('handleCancelRow: removed local new tx', { id, beforeCount, afterCount: next.length });
                return next;
            });
            // also clear selection, errors and editing
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
            // non-new rows: simply exit edit mode
            logger.info('handleCancelRow: canceled editing existing row', { id });
            setEditing(null);
        }
    }, []);

    // Delete selected
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
                logger.info('handleDeleteSelected: deleted server ids', { toDeleteFromAPI });
            } catch (err) {
                logger.error('Error deleting transactions', err);
            }
        },
        [selectedIds, txResult]
    );

    // File import (unchanged) but pass effective statementPeriod
    const handleFileChange = useCallback(
        async (ev) => {
            const file = ev.target.files && ev.target.files[0];
            if (!file) return;

            const effectiveStatementPeriod = cachedStatementPeriod || statementPeriod || undefined;

            try {
                logger.info('handleFileChange: uploading file', { fileName: file.name, statementPeriod: effectiveStatementPeriod });
                await budgetTransactionService.uploadTransactions(file, effectiveStatementPeriod);
                await txResult.refetch();
                logger.info('handleFileChange: upload complete');
            } catch (err) {
                logger.error('Upload failed', err);
            } finally {
                ev.target.value = '';
            }
        },
        [txResult, statementPeriod, cachedStatementPeriod]
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

    // validate helper (now validates criticality against configured options and category when configured)
    const validateForCreate = useCallback((tx) => {
        const errors = [];
        if (!tx.name || String(tx.name).trim() === '') errors.push('Name is required');
        if (tx.amount == null || Number.isNaN(Number(tx.amount))) errors.push('Amount must be a number');

        // Validate criticality if present
        if (tx.criticality != null && String(tx.criticality).trim() !== '') {
            const val = String(tx.criticality).trim();
            const match = CRITICALITY_OPTIONS.find((o) => o.toLowerCase() === val.toLowerCase());
            if (!match) {
                errors.push(`Criticality must be one of: ${CRITICALITY_OPTIONS.join(', ')}`);
            }
        }

        // If categories are configured, validate category against the configured options
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

            // ensure effective statementPeriod is appended (use cached or prop)
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

            // mark saving
            setSavingIds((prev) => {
                const copy = new Set(prev);
                copy.add(id);
                return copy;
            });

            try {
                if (isNew) {
                    logger.info('handleSaveRow: creating new transaction', { id, statementPeriod: effectiveStatementPeriod });
                    // DO NOT send id in payload (strip before sending)
                    const payload = stripClientFields({ ...txToPersist, statementPeriod: effectiveStatementPeriod });
                    const created = await budgetTransactionService.createTransaction(payload);
                    // replace temp id row with created row
                    setLocalTx((prev) => prev.map((t) => (t.id === id ? { ...created } : t)));
                    logger.info('handleSaveRow: created', { tempId: id, createdId: created.id });

                    if (addAnother) {
                        // create a fresh local new row and start editing it
                        const defaultPM = getDefaultPaymentMethodForAccount(filters?.account) || '';
                        const newTx = {
                            id: makeTempId(),
                            name: '',
                            amount: 0,
                            category: DEFAULT_CATEGORY,
                            criticality: DEFAULT_CRITICALITY,
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
                        // refresh server data to ensure consistency
                        try { await txResult.refetch(); } catch (e) { logger.error('refetch after create failed', e); }
                    }
                } else {
                    logger.info('handleSaveRow: updating transaction', { id, statementPeriod: effectiveStatementPeriod });
                    // Do not include id in request body; id is provided in URL by updateTransaction
                    const payload = stripClientFields({ ...txToPersist, statementPeriod: effectiveStatementPeriod });
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
        [makeTempId, txResult, validateForCreate, filters, statementPeriod, stripClientFields, cachedStatementPeriod]
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
        handleCancelRow, // new export
        startEditingRow,
        startEditingField,
        toInputDate,
        setEditing,
        savingIds,
        saveErrors,
        setLocalTx,
        // expose the effective statementPeriod for consumers
        statementPeriod: cachedStatementPeriod || statementPeriod || undefined,
        // expose config-driven criticality options for consumers (read-only)
        criticalityOptions: CRITICALITY_OPTIONS,
        // expose helper to derive criticality by category
        getCriticalityForCategory,
        // expose category options and whether consumers should render a dropdown
        categoryOptions: CATEGORY_OPTIONS || [],
        isCategoryDropdown: IS_CATEGORY_DROPDOWN,
    };
}