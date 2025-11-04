/**
 * useTransactionTable
 *
 * - Hook providing data & actions for the TransactionTable UI.
 * - Uses react-query hooks for reads (useBudgetTransactionsQuery & useProjectedTransactionQuery).
 * - Uses API modules for mutations (budgetTransaction & projectedTransaction).
 * - Maintains local optimistic rows (TEMP_ID_PREFIX) and composes server + projected rows.
 *
 * Improvements in this version:
 * - Ensure mutations invalidate the specific query keys used by consumers (e.g. CategorizedTable)
 *   instead of only invalidating broad list keys. This guarantees components that subscribe to
 *   account-scoped keys (and filters like statementPeriod) will refetch and update when a
 *   transaction is created/updated/deleted.
 * - When budget transactions change (create/update/delete/upload) the paymentSummary query is
 *   also invalidated so the payments UI refreshes immediately. This now uses the canonical
 *   paymentSummaryQueryKeys.summaryKey(...) helper (the same key shape consumers use).
 * - When a transaction is created in the 'joint' account, the server may split it into per-user
 *   rows. In that case we now proactively invalidate the account-scoped queries for the member
 *   accounts (user1, user2, etc.) so their tables and compact views refresh.
 * - Uses queryClient.getQueryData to probe cache when trying to avoid flashes.
 *
 * Conventions:
 * - Side-effects & data fetching live in this hook; UI rendering remains in components.
 *
 * @module hooks/useTransactionTable
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStatementPeriodContext } from '../../../context/StatementPeriodProvider';
import useBudgetTransactionsQuery from '../../../hooks/useBudgetTransactionQuery';
import useProjectedTransactionsQuery from '../../../hooks/useProjectedTransactionQuery';
import {
    get as getConfig,
    getCriticalityForCategory,
    getCategories,
    getDefaultPaymentMethodForAccount,
    getAccounts,
} from '../../../config/config.js';
import {
    DEFAULT_CRITICALITY_OPTIONS,
    TEMP_ID_PREFIX,
    CONFIG_KEYS,
} from '../utils/constants';
import useTransactionToolbar from './useTransactionToolbar';
import budgetApi from '../../../api/budgetTransaction/budgetTransaction';
import projectedApi from '../../../api/projectedTransaction/projectedTransaction';
import budgetQK from '../../../api/budgetTransaction/budgetTransactionQueryKeys';
import projectedQK from '../../../api/projectedTransaction/projectedTransactionQueryKeys';
import paymentSummaryQK from '../../../api/paymentSummary/paymentSummaryQueryKeys';
import { invalidateAccountAndMembers as invalidateAccountAndMembersHelper } from './transactionInvalidation';

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
 * Helper: safely build an account-scoped budget query key for invalidation/lookup.
 *
 * @param {string|undefined} account
 * @param {string|undefined} statementPeriod
 * @returns {Array<any>}
 */
function buildBudgetAccountKey(account, statementPeriod) {
    try {
        if (!account) return budgetQK.listKey(statementPeriod ? { statementPeriod } : null);
        const filters = statementPeriod ? { statementPeriod } : null;
        return budgetQK.accountListKey(String(account), filters);
    } catch (err) {
        logger.error('buildBudgetAccountKey failed', err);
        return budgetQK.listKey(statementPeriod ? { statementPeriod } : null);
    }
}

/**
 * Helper: build projected account key
 *
 * @param {string|undefined} account
 * @param {string|undefined} statementPeriod
 */
function buildProjectedAccountKey(account, statementPeriod) {
    try {
        if (!account) return projectedQK.listKey(statementPeriod ? { statementPeriod } : null);
        const filters = statementPeriod ? { statementPeriod } : null;
        return projectedQK.accountListKey(String(account), filters);
    } catch (err) {
        logger.error('buildProjectedAccountKey failed', err);
        return projectedQK.listKey(statementPeriod ? { statementPeriod } : null);
    }
}

/**
 * Flattens AccountProjectedTransactionList into an array usable by UI.
 *
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

    // --- Derived canonical accounts used by the payments summary hook elsewhere ---
    const canonicalPaymentAccounts = useMemo(() => {
        try {
            // Match usePaymentsData's user list: only include known accounts (example: josh, anna)
            return getAccounts()
                .filter((u) => ['josh', 'anna'].includes(String(u).toLowerCase()))
                .map((u) => String(u).toLowerCase());
        } catch (err) {
            logger.error('failed to compute canonicalPaymentAccounts', err);
            return [];
        }
    }, []);

    // --- Table state ---
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [editing, setEditing] = useState(null);
    const [savingIds, setSavingIds] = useState(() => new Set());
    const [saveErrors, setSaveErrors] = useState(() => ({}));
    const editValueRef = useRef('');
    const fileInputRef = useRef(null);

    // Compose filters with statementPeriod from context
    const accountFilters = useMemo(() => ({ ...(filters || {}), statementPeriod }), [filters, statementPeriod]);

    // ---------- Queries ----------
    const budgetResult = useBudgetTransactionsQuery(accountFilters);

    const {
        projectedTx = [],
        loading: projectedLoading = false,
        error: projectedError = null,
        refetch: refetchProjected,
    } = useProjectedTransactionsQuery({ account: filters?.account || undefined, statementPeriod });

    // Flatten server transactions for UI (sorted desc)
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

    /**
     * invalidateAccountAndMembers
     *
     * - When a change happens on 'joint' we need to also invalidate member accounts (user1, user2 etc.)
     *   because the server-side processing may split/join transactions across accounts.
     * - This wrapper delegates to the centralized transactionInvalidation helper which performs the
     *   actual queryClient.invalidateQueries calls.
     *
     * @param {string|null|undefined} acct - account identifier (may be 'joint' or a member)
     */
    const invalidateAccountAndMembers = useCallback((acct) => {
        try {
            invalidateAccountAndMembersHelper(queryClient, acct, statementPeriod, canonicalPaymentAccounts);
        } catch (err) {
            logger.error('invalidateAccountAndMembers wrapper failed', err, acct);
        }
    }, [queryClient, statementPeriod, canonicalPaymentAccounts]);

    /**
     * Clear transactions immediately when statementPeriod changes to avoid stale flashes.
     * Also try to populate from react-query cache immediately to prevent flashing.
     */
    useEffect(() => {
        if (!statementPeriod || !isStatementPeriodLoaded) {
            setLocalTx([]);
            return;
        }

        // attempt to populate from cache immediately for better UX (avoid flash)
        const budgetKey = buildBudgetAccountKey(filters?.account, statementPeriod);
        const projKey = buildProjectedAccountKey(filters?.account, statementPeriod);

        const cachedBudget = queryClient.getQueryData(budgetKey);
        const cachedProjected = queryClient.getQueryData(projKey);

        if (cachedBudget || cachedProjected) {
            // normalize cached shapes to arrays
            let cachedServerArr = [];
            try {
                if (cachedBudget) {
                    // budget hook normalizes responses in various shapes; attempt to extract
                    const personal = cachedBudget.personalTransactions?.transactions ?? cachedBudget.personalTransactions ?? [];
                    const joint = cachedBudget.jointTransactions?.transactions ?? cachedBudget.jointTransactions ?? [];
                    if (Array.isArray(personal) || Array.isArray(joint)) {
                        cachedServerArr = [...(Array.isArray(personal) ? personal : []), ...(Array.isArray(joint) ? joint : [])];
                    } else if (Array.isArray(cachedBudget.budgetTransactions)) {
                        cachedServerArr = [...cachedBudget.budgetTransactions];
                    } else if (Array.isArray(cachedBudget)) {
                        cachedServerArr = [...cachedBudget];
                    }
                }
            } catch (e) {
                logger.error('extracting cachedBudget failed', e);
            }

            const cachedProjArr = cachedProjected ? flattenAccountProjectedList(cachedProjected) : [];

            const serverSorted = cachedServerArr.sort((a, b) => {
                const da = a?.transactionDate ? new Date(a.transactionDate).getTime() : 0;
                const db = b?.transactionDate ? new Date(b.transactionDate).getTime() : 0;
                return db - da;
            });

            const projSorted = cachedProjArr.map((t) => ({ ...t, __isProjected: true })).sort((a, b) => {
                const da = a?.transactionDate ? new Date(a.transactionDate).getTime() : 0;
                const db = b?.transactionDate ? new Date(b.transactionDate).getTime() : 0;
                return db - da;
            });

            setLocalTx((prev) => {
                const localOnly = (prev || []).filter((t) => String(t.id).startsWith(TEMP_ID_PREFIX));
                return [...localOnly, ...projSorted, ...serverSorted];
            });
            return;
        }

        // nothing cached — clear and let population effect run when queries resolve
        setLocalTx([]);
    }, [statementPeriod, isStatementPeriodLoaded, filters?.account, queryClient]);

    /**
     * Populate localTx when server/projected query results become available.
     *
     * Watch explicit lengths so the effect re-runs when cached or fresh data is present.
     */
    useEffect(() => {
        if (!statementPeriod || !isStatementPeriodLoaded) return;

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
    }, [
        filters?.account,
        statementPeriod,
        isStatementPeriodLoaded,
        budgetResult.personalTransactions?.transactions?.length,
        budgetResult.jointTransactions?.transactions?.length,
        Array.isArray(projectedTx) ? projectedTx.length : 0,
    ]);

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
    }, [makeTempId, filters, statementPeriod]);

    const handleCancelRow = useCallback((id) => {
        if (String(id).startsWith(TEMP_ID_PREFIX)) {
            setLocalTx((prev) => {
                const next = (prev || []).filter((t) => t.id !== id);
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

                // Invalidate the account-scoped query keys so categorized table picks up changes
                if (budgetIds.length > 0) {
                    try {
                        // Use canonical budget account key helper (must match the key used by useBudgetTransactionsQuery)
                        const acct = filters?.account ?? null;
                        invalidateAccountAndMembers(acct);
                    } catch (err) {
                        logger.error('invalidate after budget delete failed', err);
                    }
                }

                if (projectionIds.length > 0) {
                    try {
                        const projAcct = filters?.account ?? null;
                        invalidateAccountAndMembers(projAcct);
                    } catch (err) {
                        logger.error('invalidate after projection delete failed', err);
                    }
                }
            } catch (err) {
                logger.error('Error deleting transactions', err);
            }
        },
        [selectedIds, localTx, projectedTx, statementPeriod, filters, queryClient, canonicalPaymentAccounts, invalidateAccountAndMembers]
    );

    // --- File upload (CSV import) ---
    const handleFileChange = useCallback(
        async (ev) => {
            const file = ev.target.files && ev.target.files[0];
            if (!file) return;
            try {
                await budgetApi.uploadBudgetTransactions(file, statementPeriod);
                // Invalidate the relevant account-scoped queries
                try {
                    const acct = filters?.account ?? null;
                    invalidateAccountAndMembers(acct);
                } catch (e) {
                    logger.error('invalidate after upload failed', e);
                }
            } catch (err) {
                logger.error('Upload failed', err);
            } finally {
                ev.target.value = '';
            }
        },
        [statementPeriod, filters?.account, queryClient, canonicalPaymentAccounts, invalidateAccountAndMembers]
    );

    const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);

    const startEditingField = useCallback((id, field, initial = '') => {
        setEditing({ id, mode: 'field', field });
        editValueRef.current = initial;
    }, []);

    const startEditingRow = useCallback((id) => {
        setEditing({ id, mode: 'row' });
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
                    const payload = stripClientFields({ ...txToPersist, statementPeriod });

                    if (txToPersist.__isProjected) {
                        const created = await projectedApi.createProjectedTransaction(payload);
                        const createdWithFlag = { ...created, __isProjected: true };
                        setLocalTx((prev) => prev.map((t) => (t.id === id ? createdWithFlag : t)));

                        // invalidate keys for projected created item (handle joint -> member split case via helper)
                        try {
                            invalidateAccountAndMembers(created.account ?? payload.account ?? filters?.account);
                        } catch (err) {
                            logger.error('invalidate projected after create failed', err);
                        }
                    } else {
                        const created = await budgetApi.createBudgetTransaction(payload);
                        setLocalTx((prev) => prev.map((t) => (t.id === id ? { ...created } : t)));

                        // Invalidate canonical keys for the created account, or if created in 'joint' invalidate members as well.
                        try {
                            const acctToInvalidate = created.account ?? payload.account ?? filters?.account;
                            invalidateAccountAndMembers(acctToInvalidate);
                        } catch (e) {
                            logger.error('invalidate budget queries failed', e);
                        }

                        // ALSO invalidate payment summary for this period so payments UI updates (handled within helper too)
                        // addAnother logic unchanged
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
                        }
                    }
                } else {
                    const payload = stripClientFields({ ...txToPersist, statementPeriod });

                    if (txToPersist.__isProjected) {
                        await projectedApi.updateProjectedTransaction(id, payload);
                        try {
                            invalidateAccountAndMembers(filters?.account ?? payload.account);
                        } catch (err) {
                            logger.error('invalidate projected after update failed', err);
                        }
                    } else {
                        await budgetApi.updateBudgetTransaction(id, payload);
                        try {
                            invalidateAccountAndMembers(payload.account ?? filters?.account);
                        } catch (e) {
                            logger.error('invalidate budget queries after update failed', e);
                        }
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
            canonicalPaymentAccounts,
            invalidateAccountAndMembers,
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