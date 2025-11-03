/**
 * useTransactionTable
 *
 * Migration notes:
 * - Queries migrated to react-query hooks (useBudgetTransactionsQuery & useProjectedTransactionQuery).
 * - All query invalidation uses centralized query key helpers (budgetTransactionQueryKeys & projectedTransactionQueryKeys).
 * - Removes legacy service-only reads for list data; service modules (budgetApi/projectedApi) remain in use for mutations.
 * - Preserves previous public API/behavior (local temp rows, optimistic UI for temp rows,
 *   merging projected + budget rows, sorting, totals) while using the new query hooks.
 *
 * @module hooks/useTransactionTable
 */

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStatementPeriodContext } from '../../../context/StatementPeriodProvider';
// new query-based hooks (replaces legacy hooks)
import useBudgetTransactionsQuery from '../../../hooks/useBudgetTransactionQuery';
import useProjectedTransactionsQuery from '../../../hooks/useProjectedTransactionQuery';
import {
    get as getConfig,
    getCriticalityForCategory,
    getCategories,
    getDefaultPaymentMethodForAccount,
} from '../../../config/config.js';
import {
    DEFAULT_CRITICALITY_OPTIONS,
    STATEMENT_PERIOD_CACHE_KEY,
    TEMP_ID_PREFIX,
    CONFIG_KEYS,
} from '../utils/constants';
import useTransactionToolbar from './useTransactionToolbar';

// Mutation service APIs (create/update/delete/upload)
import budgetApi from '../../../api/budgetTransaction/budgetTransaction';
import projectedApi from '../../../api/projectedTransaction/projectedTransaction';

// Query key helpers for proper invalidation
import budgetQK from '../../../api/budgetTransaction/budgetTransactionQueryKeys';
import projectedQK from '../../../api/projectedTransaction/projectedTransactionQueryKeys';

const logger = {
    info: (...args) => console.log('[useTransactionTable]', ...args),
    error: (...args) => console.error('[useTransactionTable]', ...args),
};

/**
 * Reads CRITICALITY_OPTIONS from config (once at module load)
 * @type {Array<string>}
 */
const CRITICALITY_OPTIONS = (() => {
    try {
        const opts = getConfig(CONFIG_KEYS.CRITICALITY_OPTIONS);
        if (Array.isArray(opts) && opts.length > 0) return opts.map(String);
        logger.info('criticalityOptions not found in config; using defaults', { fallback: DEFAULT_CRITICALITY_OPTIONS });
        return DEFAULT_CRITICALITY_OPTIONS;
    } catch (err) {
        logger.error('failed to read criticalityOptions from config, using defaults', err);
        return DEFAULT_CRITICALITY_OPTIONS;
    }
})();

/**
 * Reads CATEGORY_OPTIONS from config (once at module load)
 * @type {Array<string>|null}
 */
const CATEGORY_OPTIONS = (() => {
    try {
        const cats = getCategories();
        if (Array.isArray(cats) && cats.length > 0) {
            const filtered = cats.filter((c) => typeof c === 'string').map(String);
            logger.info('loaded category options from config', { count: filtered.length, sample: filtered.slice(0, 5) });
            return filtered;
        }
        logger.info('no categories in config; category will be a freeform textbox');
        return null;
    } catch (err) {
        logger.error('failed to load categories from config', err);
        return null;
    }
})();

const IS_CATEGORY_DROPDOWN = Array.isArray(CATEGORY_OPTIONS) && CATEGORY_OPTIONS.length > 0;

/**
 * Flattens AccountProjectedTransactionList into an array usable by UI.
 * @param {Object} accountList
 * @returns {Array}
 */
function flattenAccountProjectedList(accountList) {
    try {
        const personal = accountList?.personalTransactions?.transactions || [];
        const joint = accountList?.jointTransactions?.transactions || [];
        return [...personal, ...joint];
    } catch (err) {
        logger.error('flattenAccountProjectedList failed', err);
        return [];
    }
}

/**
 * Annotates array with __isProjected: true for UI
 * @param {Array} arr
 * @returns {Array}
 */
function annotateProjection(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map((item) => ({ ...(item || {}), __isProjected: true }));
}

/**
 * useTransactionTable
 *
 * @param {Object} filters - initial filter shape passed from component (may include account, category, etc.)
 * @returns {Object} API surface consumed by TransactionTable component
 */
export function useTransactionTable(filters = {}) {
    const queryClient = useQueryClient();

    const { statementPeriod, isLoaded: isStatementPeriodLoaded } = useStatementPeriodContext();
    const currentPeriodRef = useRef(statementPeriod);
    const lastRequestedPeriodRef = useRef();

    // --- Table state ---
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [editing, setEditing] = useState(null); // { id, mode: 'field'|'row', field? }
    const [savingIds, setSavingIds] = useState(() => new Set());
    const [saveErrors, setSaveErrors] = useState(() => ({}));
    const editValueRef = useRef('');
    const fileInputRef = useRef(null);

    // Compose filters with statementPeriod from context
    const accountFilters = useMemo(() => ({ ...(filters || {}), statementPeriod }), [filters, statementPeriod]);

    // ---------- Queries ----------
    /**
     * Budget transactions (react-query)
     * - returns normalized shape: personalTransactions, jointTransactions, totals, count, loading, refetch, data
     */
    const budgetResult = useBudgetTransactionsQuery(accountFilters);

    /**
     * Projected transactions (react-query)
     * - accepts account + statementPeriod for account-scoped lists
     */
    const {
        projectedTx = [],
        loading: projectedLoading = false,
        error: projectedError = null,
        refetch: refetchProjected,
    } = useProjectedTransactionsQuery({ account: filters?.account || undefined, statementPeriod });

    // Flatten server transactions for UI (sorted desc) from budgetResult
    const serverTx = useMemo(
        () =>
            [
                ...(budgetResult.personalTransactions?.transactions || []),
                ...(budgetResult.jointTransactions?.transactions || []),
            ].sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)),
        [budgetResult.personalTransactions, budgetResult.jointTransactions]
    );

    // localTx holds combined rows (local temp rows + server + projected)
    const [localTx, setLocalTx] = useState(() => [...serverTx]);

    useEffect(() => {
        // Only update when the request corresponds to the current statementPeriod
        if (isStatementPeriodLoaded && statementPeriod && lastRequestedPeriodRef.current === statementPeriod) {
            const serverSorted = [
                ...(budgetResult.personalTransactions?.transactions || []),
                ...(budgetResult.jointTransactions?.transactions || []),
            ].sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

            const projSorted =
                Array.isArray(projectedTx) && projectedTx.length > 0
                    ? [...projectedTx].map((p) => ({ ...p, __isProjected: true })).sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
                    : [];

            setLocalTx((prev) => {
                const localOnly = (prev || []).filter((t) => String(t.id).startsWith(TEMP_ID_PREFIX));
                return [...localOnly, ...projSorted, ...serverSorted];
            });

            logger.info('[useTransactionTable] Populated localTx for current period', { statementPeriod });
        }
        // otherwise ignore stale fetches
    }, [isStatementPeriodLoaded, statementPeriod, budgetResult.personalTransactions, budgetResult.jointTransactions, projectedTx]);

    useEffect(() => {
        lastRequestedPeriodRef.current = statementPeriod;
        setLocalTx([]); // clear immediately to avoid stale UI flash
        logger.info('[useTransactionTable] Cleared localTx for period change', { statementPeriod });
    }, [statementPeriod]);

    // Totals
    const projectedTotal = useMemo(() => {
        if (!isStatementPeriodLoaded || !statementPeriod) return 0;
        if (!Array.isArray(projectedTx)) return 0;
        return projectedTx.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    }, [projectedTx, isStatementPeriodLoaded, statementPeriod]);

    const total = useMemo(() => {
        if (!isStatementPeriodLoaded || !statementPeriod) return 0;
        const serverTotal = typeof budgetResult.total === 'number' ? budgetResult.total : Number(budgetResult.total) || 0;
        const projTotal = Array.isArray(projectedTx) ? projectedTx.reduce((s, t) => s + (Number(t.amount) || 0), 0) : 0;
        return serverTotal + projTotal;
    }, [budgetResult, projectedTx, isStatementPeriodLoaded, statementPeriod]);

    const personalBalance = useMemo(() => {
        if (!isStatementPeriodLoaded || !statementPeriod) return 0;
        return typeof budgetResult.personalTotal === 'number' ? budgetResult.personalTotal : Number(budgetResult.personalTotal) || 0;
    }, [budgetResult.personalTotal, isStatementPeriodLoaded, statementPeriod]);

    const jointBalance = useMemo(() => {
        if (!isStatementPeriodLoaded || !statementPeriod) return 0;
        return typeof budgetResult.jointTotal === 'number' ? budgetResult.jointTotal : Number(budgetResult.jointTotal) || 0;
    }, [budgetResult.jointTotal, isStatementPeriodLoaded, statementPeriod]);

    const count = useMemo(() => {
        if (!isStatementPeriodLoaded || !statementPeriod) return 0;
        const countFromServer = (budgetResult.personalTransactions?.count || 0) + (budgetResult.jointTransactions?.count || 0);
        return countFromServer + (Array.isArray(projectedTx) ? projectedTx.length : 0);
    }, [budgetResult.personalTransactions, budgetResult.jointTransactions, projectedTx, isStatementPeriodLoaded, statementPeriod]);

    const loading = budgetResult.loading || projectedLoading || false;
    const error = budgetResult.error || projectedError || null;

    // --- Selection helpers ---
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

    // --- Create helpers ---
    const handleAddTransaction = useCallback(() => {
        const defaultCrit = '';
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
            statementPeriod,
        };
        setLocalTx((prev) => [newTx, ...(prev || [])]);
        setEditing({ id: newTx.id, mode: 'row' });
        editValueRef.current = '';
        logger.info('handleAddTransaction: created local new tx', { tempId: newTx.id, statementPeriod: newTx.statementPeriod });
    }, [makeTempId, filters, statementPeriod]);

    const handleAddProjection = useCallback(() => {
        const defaultCrit = '';
        const defaultPM = getDefaultPaymentMethodForAccount(filters?.account) || '';
        const newProj = {
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
            __isProjected: true,
            statementPeriod,
        };
        setLocalTx((prev) => [newProj, ...(prev || [])]);
        setEditing({ id: newProj.id, mode: 'row' });
        editValueRef.current = '';
        logger.info('handleAddProjection: created local new projected tx', { tempId: newProj.id, statementPeriod: newProj.statementPeriod });
    }, [makeTempId, filters, statementPeriod]);

    const handleCancelRow = useCallback((id) => {
        if (String(id).startsWith(TEMP_ID_PREFIX)) {
            setLocalTx((prev) => {
                const next = (prev || []).filter((t) => t.id !== id);
                logger.info('handleCancelRow: removed local new tx', { id, afterCount: next.length });
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

    // --- Delete selected ---
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
                const budgetIds = [];
                const projectionIds = [];
                toDeleteFromAPI.forEach((id) => {
                    const localItem = (localTx || []).find((t) => String(t.id) === String(id));
                    const isProjection = localItem?.__isProjected === true || (Array.isArray(projectedTx) && projectedTx.some((p) => String(p.id) === String(id)));
                    if (isProjection) projectionIds.push(id);
                    else budgetIds.push(id);
                });

                // Perform deletes in parallel
                await Promise.all([
                    ...budgetIds.map((id) =>
                        budgetApi.deleteBudgetTransaction(id).catch((err) => {
                            logger.error(`Failed to delete budget transaction ${id}`, err);
                        })
                    ),
                    ...projectionIds.map((id) =>
                        projectedApi.deleteProjectedTransaction(id).catch((err) => {
                            logger.error(`Failed to delete projected transaction ${id}`, err);
                        })
                    ),
                ]);

                // Invalidate / refetch relevant queries
                if (budgetIds.length > 0) {
                    try {
                        // Invalidate budget transactions queries for this account/period to force refetch
                        queryClient.invalidateQueries({ queryKey: budgetQK.invalidateListsKey() });
                        if (typeof budgetResult.refetch === 'function') await budgetResult.refetch();
                    } catch (err) {
                        logger.error('refetch/invalidate after budget delete failed', err);
                    }
                }

                if (projectionIds.length > 0) {
                    try {
                        // Invalidate projected queries
                        queryClient.invalidateQueries({ queryKey: projectedQK.invalidateListsKey() });
                        await refetchProjected();
                    } catch (err) {
                        logger.error('refetchProjected/invalidate after projection delete failed', err);
                    }
                }

                logger.info('handleDeleteSelected: deleted server ids', { budgetIds, projectionIds });
            } catch (err) {
                logger.error('Error deleting transactions', err);
            }
        },
        [selectedIds, budgetResult, refetchProjected, localTx, projectedTx, serverTx, statementPeriod, filters, queryClient]
    );

    // --- File upload (CSV import) ---
    const handleFileChange = useCallback(
        async (ev) => {
            const file = ev.target.files && ev.target.files[0];
            if (!file) return;
            try {
                logger.info('handleFileChange: uploading file', { fileName: file.name, statementPeriod });
                await budgetApi.uploadBudgetTransactions(file, statementPeriod);
                // Invalidate queries and refetch
                try { await budgetResult.refetch(); } catch (err) { logger.error('refetch after upload failed', err); }
                try { await refetchProjected(); } catch (err) { logger.error('refetchProjected after upload failed', err); }
                // Invalidate global budget/projection keys as well
                queryClient.invalidateQueries({ queryKey: budgetQK.invalidateListsKey() });
                queryClient.invalidateQueries({ queryKey: projectedQK.invalidateListsKey() });
                logger.info('handleFileChange: upload complete');
            } catch (err) {
                logger.error('Upload failed', err);
            } finally {
                ev.target.value = '';
            }
        },
        [budgetResult, statementPeriod, refetchProjected, queryClient]
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

    const handleCellDoubleClick = useCallback(
        (tx, field) => {
            const initial =
                field === 'transactionDate'
                    ? tx.transactionDate
                        ? toInputDate(tx.transactionDate)
                        : toInputDate(new Date().toISOString())
                    : tx[field] != null
                        ? String(tx[field])
                        : '';
            startEditingField(tx.id, field, initial);
        },
        [startEditingField]
    );

    const handleEditKey = useCallback((e, id, field) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        } else if (e.key === 'Escape') {
            setEditing(null);
        }
    }, []);

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
        delete copy.__isProjected;
        return copy;
    }, []);

    // --- Save row (create or update) ---
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

            if (statementPeriod) {
                txToPersist = { ...txToPersist, statementPeriod };
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
                    logger.info('handleSaveRow: creating new transaction', { id, statementPeriod, isProjection: !!txToPersist.__isProjected });
                    const payload = stripClientFields({ ...txToPersist, statementPeriod });

                    if (txToPersist.__isProjected) {
                        // projected create
                        const created = await projectedApi.createProjectedTransaction(payload);
                        const createdWithFlag = { ...created, __isProjected: true };

                        setLocalTx((prev) => prev.map((t) => (t.id === id ? createdWithFlag : t)));
                        logger.info('handleSaveRow: created projection', { tempId: id, createdId: created.id });

                        // Invalidate projection queries and refetch
                        try {
                            queryClient.invalidateQueries({ queryKey: projectedQK.invalidateListsKey() });
                            await refetchProjected();
                        } catch (err) {
                            logger.error('refetchProjected after create failed', err);
                        }
                    } else {
                        // budget create
                        const created = await budgetApi.createBudgetTransaction(payload);
                        setLocalTx((prev) => prev.map((t) => (t.id === id ? { ...created } : t)));
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
                                statementPeriod,
                            };
                            setLocalTx((prev) => [newTx, ...(prev || [])]);
                            setEditing({ id: newTx.id, mode: 'row' });
                            logger.info('handleSaveRow: added another new tx temp', { newTempId: newTx.id });
                        } else {
                            // invalidate & refetch budget queries
                            try { queryClient.invalidateQueries({ queryKey: budgetQK.invalidateListsKey() }); } catch (e) { logger.error('invalidate budget queries failed', e); }
                            try { await budgetResult.refetch(); } catch (e) { logger.error('refetch after create failed', e); }
                        }
                    }
                } else {
                    // update path
                    logger.info('handleSaveRow: updating transaction', { id, statementPeriod, isProjection: !!txToPersist.__isProjected });
                    const payload = stripClientFields({ ...txToPersist, statementPeriod });

                    if (txToPersist.__isProjected) {
                        await projectedApi.updateProjectedTransaction(id, payload);
                        logger.info('handleSaveRow: updated projection', { id });
                        try {
                            queryClient.invalidateQueries({ queryKey: projectedQK.invalidateListsKey() });
                            await refetchProjected();
                        } catch (err) {
                            logger.error('refetchProjected after update failed', err);
                        }
                    } else {
                        await budgetApi.updateBudgetTransaction(id, payload);
                        logger.info('handleSaveRow: updated', { id });
                        try { queryClient.invalidateQueries({ queryKey: budgetQK.invalidateListsKey() }); } catch (e) { logger.error('invalidate after update failed', e); }
                        try { await budgetResult.refetch(); } catch (e) { logger.error('refetch after update failed', e); }
                        try { await refetchProjected(); } catch (err) { logger.error('refetchProjected after update failed', err); }
                    }
                }
            } catch (err) {
                logger.error('handleSaveRow: persist failed', err);
                setSaveErrors((prev) => ({ ...prev, [id]: err.message || String(err) }));
                if (!isNew) {
                    try { await budgetResult.refetch(); } catch (fetchErr) { logger.error('fetchTransactions after failed persist also failed', fetchErr); }
                }
            } finally {
                setSavingIds((prev) => {
                    const copy = new Set(prev);
                    copy.delete(id);
                    return copy;
                });
            }
        },
        [
            makeTempId,
            budgetResult,
            validateForCreate,
            filters,
            stripClientFields,
            statementPeriod,
            refetchProjected,
            serverTx,
            queryClient,
        ]
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

    // --- Toolbar ---
    const toolbar = useTransactionToolbar({
        onAdd: handleAddTransaction,
        onAddProjection: handleAddProjection,
        onImport: openFilePicker,
        onDelete: handleDeleteSelected,
        selectedCount: selectedIds.size,
        fileInputRef,
        onFileChange: handleFileChange,
        loading,
        total: typeof total === 'number' ? total : String(total),
    });

    // --- Expose API surface ---
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
        handleAddProjection,
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
        statementPeriod,
        projectedTotal,
        projectedTx,
        refetchProjected,
        criticalityOptions: CRITICALITY_OPTIONS,
        getCriticalityForCategory,
        categoryOptions: CATEGORY_OPTIONS || [],
        isCategoryDropdown: IS_CATEGORY_DROPDOWN,
        toolbar,
    };
}

export default useTransactionTable;