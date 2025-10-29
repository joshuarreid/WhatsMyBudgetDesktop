import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useStatementPeriodContext } from '../../../context/StatementPeriodProvider';
import useProjectedTransactions from '../../../hooks/useProjectedTransactions';
import localCacheService from '../../../services/LocalCacheService';
import { useBudgetAndProjectedTransactionsForAccount } from '../../../hooks/useTransactions';
import { publish as publishTransactionEvents } from '../../../services/TransactionEvents';
import {
    get as getConfig,
    getCriticalityForCategory,
    getCategories,
    getDefaultPaymentMethodForAccount
} from '../../../config/config.ts';
import {
    DEFAULT_CRITICALITY_OPTIONS,
    STATEMENT_PERIOD_CACHE_KEY,
    TEMP_ID_PREFIX,
    CONFIG_KEYS,
} from '../utils/constants';
import budgetTransactionService from '../../../services/BudgetTransactionService';
import projectedTransactionService from '../../../services/ProjectedTransactionService';
import useTransactionToolbar from './useTransactionToolbar';

/**
 * Logger for useTransactionTable.
 * @constant
 */
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
 * Main hook for TransactionTable business logic and state management.
 * Passes statementPeriod from StatementPeriodContext as a filter.
 *
 * @function useTransactionTable
 * @param {Object} filters
 * @returns {Object} Transaction table API surface
 */
export function useTransactionTable(filters) {

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

    // --- Compose filters with statement period from context ---
    /** @type {Object} */
    const accountFilters = useMemo(() => ({
        ...(filters || {}),
        statementPeriod,
    }), [filters, statementPeriod]);

    /**
     * Fetches transactions for account and statement period.
     * @type {Object}
     */
    const txResult = useBudgetAndProjectedTransactionsForAccount(accountFilters);

    // --- Transactions integration ---
    const serverTx = useMemo(
        () => [
            ...(txResult.personalTransactions?.transactions || []),
            ...(txResult.jointTransactions?.transactions || [])
        ].sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)),
        [txResult.personalTransactions, txResult.jointTransactions]
    );

    const {
        projectedTx = [],
        loading: projectedLoading = false,
        error: projectedError = null,
        refetch: refetchProjected
    } = useProjectedTransactions({ statementPeriod, account: filters?.account || undefined });

    /**
     * localTx - Holds the transaction rows for the table.
     * Cleared immediately when statementPeriod changes to prevent stale row flash.
     */
    const [localTx, setLocalTx] = useState(() => [...serverTx]);

    useEffect(() => {
        // When fetches complete, check if their period matches current context
        if (
            isStatementPeriodLoaded &&
            statementPeriod &&
            lastRequestedPeriodRef.current === statementPeriod
        ) {
            // Only update state if the data is for the correct period
            const serverTx = [
                ...(txResult.personalTransactions?.transactions || []),
                ...(txResult.jointTransactions?.transactions || [])
            ].sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

            const projSorted = Array.isArray(projectedTx) && projectedTx.length > 0
                ? [...projectedTx].map((p) => ({ ...p, __isProjected: true })).sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
                : [];

            setLocalTx((prev) => {
                const localOnly = (prev || []).filter((t) => String(t.id).startsWith(TEMP_ID_PREFIX));
                return [...localOnly, ...projSorted, ...serverTx];
            });
            logger.info('[useTransactionTable] Populated localTx for current period', { statementPeriod });
        }
        // Else, do nothing: prevents stale fetches from updating state!
    }, [isStatementPeriodLoaded, statementPeriod, txResult.personalTransactions, txResult.jointTransactions, projectedTx]);

    /**
     * Clear transactions immediately when statementPeriod changes.
     * This prevents stale rows from flashing when switching statement periods.
     */
    useEffect(() => {
        lastRequestedPeriodRef.current = statementPeriod;
        setLocalTx([]); // clear immediately
        logger.info('[useTransactionTable] Cleared localTx for period change', { statementPeriod });

        // fetch transactions for new period (optionally, trigger refetch here if not in fetch hooks)
    }, [statementPeriod]);



    /**
     * Computes projected total only if statement period is loaded and defined.
     * @type {number}
     */
    const projectedTotal = useMemo(() => {
        if (!isStatementPeriodLoaded || !statementPeriod) return 0;
        if (!Array.isArray(projectedTx)) return 0;
        return projectedTx.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    }, [projectedTx, isStatementPeriodLoaded, statementPeriod]);


    /**
     * Computes total only if statement period is loaded and defined.
     * @type {number}
     */
    const total = useMemo(() => {
        if (!isStatementPeriodLoaded || !statementPeriod) return 0;
        const serverTotal = typeof txResult.total === 'number' ? txResult.total : Number(txResult.total) || 0;
        const projTotal = Array.isArray(projectedTx) ? projectedTx.reduce((s, t) => s + (Number(t.amount) || 0), 0) : 0;
        return serverTotal + projTotal;
    }, [txResult, projectedTx, isStatementPeriodLoaded, statementPeriod]);

    /**
     * Computes personal balance only if statement period is loaded and defined.
     * @type {number}
     */
    const personalBalance = useMemo(() => {
        if (!isStatementPeriodLoaded || !statementPeriod) return 0;
        return typeof txResult.personalTotal === 'number' ? txResult.personalTotal : Number(txResult.personalTotal) || 0;
    }, [txResult.personalTotal, isStatementPeriodLoaded, statementPeriod]);

    /**
     * Computes joint balance only if statement period is loaded and defined.
     * @type {number}
     */
    const jointBalance = useMemo(() => {
        if (!isStatementPeriodLoaded || !statementPeriod) return 0;
        return typeof txResult.jointTotal === 'number' ? txResult.jointTotal : Number(txResult.jointTotal) || 0;
    }, [txResult.jointTotal, isStatementPeriodLoaded, statementPeriod]);




    /**
     * Computes transaction count only if statement period is loaded and defined.
     * @type {number}
     */
    const count = useMemo(() => {
        if (!isStatementPeriodLoaded || !statementPeriod) return 0;
        const countFromServer = (txResult.personalTransactions?.count || 0) + (txResult.jointTransactions?.count || 0);
        return countFromServer + (Array.isArray(projectedTx) ? projectedTx.length : 0);
    }, [txResult.personalTransactions, txResult.jointTransactions, projectedTx, isStatementPeriodLoaded, statementPeriod]);

    const loading = txResult.loading || projectedLoading || false;
    const error = txResult.error || projectedError || null;

    // --- Selection ---
    /**
     * Toggles selection for a transaction by id.
     * @function toggleSelect
     * @param {string|number} id
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
     * Marks all transactions selected, or clears selection.
     * @function toggleSelectAll
     */
    const isAllSelected = localTx.length > 0 && selectedIds.size === localTx.length;
    const toggleSelectAll = useCallback(() => {
        setSelectedIds((prev) => {
            if (isAllSelected) return new Set();
            return new Set(localTx.map((t) => t.id));
        });
    }, [localTx, isAllSelected]);
    /**
     * Makes a temporary id for new transactions.
     * @function makeTempId
     * @returns {string}
     */
    const makeTempId = useCallback(() => `${TEMP_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, []);

    // --- Transaction Creation ---
    /**
     * Handles addition of new budget transaction row and opens editor.
     * @function handleAddTransaction
     */
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

    /**
     * Handles addition of new projected transaction row and opens editor.
     * @function handleAddProjection
     */
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

    /**
     * Cancels editing and removes temp rows where applicable.
     * @function handleCancelRow
     * @param {string|number} id
     */
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

    /**
     * Handles deletion of selected transactions (local and server-side).
     * @function handleDeleteSelected
     * @async
     */
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
                await Promise.all([
                    ...budgetIds.map((id) =>
                        budgetTransactionService.deleteTransaction(id).catch((err) => {
                            logger.error(`Failed to delete budget transaction ${id}`, err);
                        })
                    ),
                    ...projectionIds.map((id) =>
                        projectedTransactionService.deleteTransaction(id).catch((err) => {
                            logger.error(`Failed to delete projected transaction ${id}`, err);
                        })
                    ),
                ]);
                if (budgetIds.length > 0) {
                    try { await txResult.refetch(); } catch (err) { logger.error('refetch after delete failed', err); }
                    try { publishTransactionEvents({ type: 'transactionsChanged', reason: 'delete', ids: budgetIds }); } catch (err) { logger.error('publish transaction event failed', err); }
                }
                if (projectionIds.length > 0) {
                    try {
                        const acct = filters?.account || undefined;
                        const acctList = acct
                            ? await projectedTransactionService.getTransactionsForAccount({ account: acct, statementPeriod }).catch((err) => {
                                logger.error('getTransactionsForAccount after delete failed', err);
                                return null;
                            })
                            : null;
                        if (acctList) {
                            const flattened = flattenAccountProjectedList(acctList);
                            const annotated = annotateProjection(flattened);
                            setLocalTx((prev) => {
                                const localOnly = (prev || []).filter((t) => String(t.id).startsWith(TEMP_ID_PREFIX));
                                const projSorted = annotated.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
                                return [...localOnly, ...projSorted, ...serverTx];
                            });
                        } else {
                            try { await refetchProjected(); } catch (err) { logger.error('refetchProjected after delete failed', err); }
                        }
                    } catch (err) {
                        logger.error('refetchProjected/account list update failed', err);
                    }
                    try { publishTransactionEvents({ type: 'projectionsChanged', reason: 'delete', ids: projectionIds, account: filters?.account, statementPeriod }); } catch (err) { logger.error('publish projection event failed', err); }
                }
                logger.info('handleDeleteSelected: deleted server ids', { budgetIds, projectionIds });
            } catch (err) {
                logger.error('Error deleting transactions', err);
            }
        },
        [selectedIds, txResult, refetchProjected, localTx, projectedTx, serverTx, statementPeriod, filters]
    );

    /**
     * Handles file input change (import CSV).
     * @function handleFileChange
     * @async
     */
    const handleFileChange = useCallback(
        async (ev) => {
            const file = ev.target.files && ev.target.files[0];
            if (!file) return;
            try {
                logger.info('handleFileChange: uploading file', { fileName: file.name, statementPeriod });
                await budgetTransactionService.uploadTransactions(file, statementPeriod);
                await txResult.refetch();
                try { publishTransactionEvents({ type: 'transactionsChanged', reason: 'upload', fileName: file.name }); } catch (err) { logger.error('publish transaction event failed', err); }
                try { await refetchProjected(); } catch (err) { logger.error('refetchProjected after upload failed', err); }
                logger.info('handleFileChange: upload complete');
            } catch (err) {
                logger.error('Upload failed', err);
            } finally {
                ev.target.value = '';
            }
        },
        [txResult, statementPeriod, refetchProjected]
    );
    /**
     * Opens file picker for CSV import.
     * @function openFilePicker
     */
    const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);
    /**
     * Starts editing a field in a transaction row.
     * @function startEditingField
     * @param {string|number} id
     * @param {string} field
     * @param {string} initial
     */
    const startEditingField = useCallback((id, field, initial = '') => {
        setEditing({ id, mode: 'field', field });
        editValueRef.current = initial;
        logger.info('startEditingField', { id, field, initial });
    }, []);
    /**
     * Starts editing a row.
     * @function startEditingRow
     * @param {string|number} id
     */
    const startEditingRow = useCallback((id) => {
        setEditing({ id, mode: 'row' });
        logger.info('startEditingRow', { id });
    }, []);
    /**
     * Converts ISO date string to input date format.
     * @function toInputDate
     * @param {string} iso
     * @returns {string}
     */
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
    /**
     * Handles cell double click for editing.
     * @function handleCellDoubleClick
     * @param {Object} tx
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
    }, [startEditingField]);
    /**
     * Handles key event in edit mode.
     * @function handleEditKey
     * @param {Event} e
     * @param {string|number} id
     * @param {string} field
     */
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
    /**
     * Validates transaction for creation.
     * @function validateForCreate
     * @param {Object} tx
     * @returns {Array<string>}
     */
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
    /**
     * Strips client-only fields before sending to API.
     * @function stripClientFields
     * @param {Object} tx
     * @returns {Object}
     */
    const stripClientFields = useCallback((tx) => {
        const copy = { ...tx };
        delete copy.id;
        delete copy.__isNew;
        delete copy.__isProjected;
        return copy;
    }, []);
    /**
     * Persists a row (create or update).
     * @function handleSaveRow
     * @async
     */
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
                        const created = await projectedTransactionService.createTransaction(payload);
                        const createdWithFlag = { ...created, __isProjected: true };
                        setLocalTx((prev) => prev.map((t) => (t.id === id ? createdWithFlag : t)));
                        try {
                            publishTransactionEvents({
                                type: 'projectionsChanged',
                                reason: 'create',
                                transaction: createdWithFlag,
                                account: createdWithFlag.account,
                                statementPeriod: createdWithFlag.statementPeriod
                            });
                        } catch (err) { logger.error('publish projection event failed', err); }
                        logger.info('handleSaveRow: created projection', { tempId: id, createdId: created.id });
                        try {
                            const acct = filters?.account || payload.account || undefined;
                            if (acct) {
                                const acctList = await projectedTransactionService.getTransactionsForAccount({ account: acct, statementPeriod }).catch((err) => {
                                    logger.error('getTransactionsForAccount after create failed', err);
                                    return null;
                                });
                                if (acctList) {
                                    const flattened = flattenAccountProjectedList(acctList);
                                    const annotated = annotateProjection(flattened);
                                    setLocalTx((prev) => {
                                        const localOnly = (prev || []).filter((t) => String(t.id).startsWith(TEMP_ID_PREFIX));
                                        const projSorted = annotated.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
                                        return [...localOnly, ...projSorted, ...serverTx];
                                    });
                                } else {
                                    try { await refetchProjected(); } catch (err) { logger.error('refetchProjected after create failed', err); }
                                }
                            } else {
                                try { await refetchProjected(); } catch (err) { logger.error('refetchProjected after create failed', err); }
                            }
                        } catch (err) {
                            logger.error('account-projected refresh failed', err);
                        }
                    } else {
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
                                statementPeriod,
                            };
                            setLocalTx((prev) => [newTx, ...(prev || [])]);
                            setEditing({ id: newTx.id, mode: 'row' });
                            logger.info('handleSaveRow: added another new tx temp', { newTempId: newTx.id, defaultCriticality: newTx.criticality, defaultPaymentMethod: newTx.paymentMethod });
                        } else {
                            try { await txResult.refetch(); } catch (e) { logger.error('refetch after create failed', e); }
                            try { await refetchProjected(); } catch (err) { logger.error('refetchProjected after create failed', err); }
                        }
                    }
                } else {
                    logger.info('handleSaveRow: updating transaction', { id, statementPeriod, isProjection: !!txToPersist.__isProjected });
                    const payload = stripClientFields({ ...txToPersist, statementPeriod });
                    if (txToPersist.__isProjected) {
                        await projectedTransactionService.updateTransaction(id, payload);
                        try {
                            publishTransactionEvents({
                                type: 'projectionsChanged',
                                reason: 'update',
                                id,
                                payload,
                                account: payload.account || filters?.account,
                                statementPeriod: payload.statementPeriod || statementPeriod
                            });
                        } catch (err) { logger.error('publish projection event failed', err); }
                        logger.info('handleSaveRow: updated projection', { id });
                        try {
                            const acct = filters?.account || payload.account || undefined;
                            if (acct) {
                                const acctList = await projectedTransactionService.getTransactionsForAccount({ account: acct, statementPeriod }).catch((err) => {
                                    logger.error('getTransactionsForAccount after update failed', err);
                                    return null;
                                });
                                if (acctList) {
                                    const flattened = flattenAccountProjectedList(acctList);
                                    const annotated = annotateProjection(flattened);
                                    setLocalTx((prev) => {
                                        const localOnly = (prev || []).filter((t) => String(t.id).startsWith(TEMP_ID_PREFIX));
                                        const projSorted = annotated.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
                                        return [...localOnly, ...projSorted, ...serverTx];
                                    });
                                } else {
                                    try { await refetchProjected(); } catch (err) { logger.error('refetchProjected after update failed', err); }
                                }
                            } else {
                                try { await refetchProjected(); } catch (err) { logger.error('refetchProjected after update failed', err); }
                            }
                        } catch (err) {
                            logger.error('account-projected refresh failed', err);
                        }
                    } else {
                        await budgetTransactionService.updateTransaction(id, payload);
                        try { publishTransactionEvents({ type: 'transactionsChanged', reason: 'update', id, payload }); } catch (err) { logger.error('publish transaction event failed', err); }
                        logger.info('handleSaveRow: updated', { id });
                        try { await txResult.refetch(); } catch (e) { logger.error('refetch after update failed', e); }
                        try { await refetchProjected(); } catch (err) { logger.error('refetchProjected after update failed', err); }
                    }
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
        [makeTempId, txResult, validateForCreate, filters, stripClientFields, statementPeriod, refetchProjected, serverTx]
    );

    /**
     * Handles field save in edit mode.
     * @function handleSaveEdit
     * @param {string|number} id
     * @param {string} field
     * @param {any} value
     * @async
     */
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

    // --- Toolbar logic ---
    /**
     * useTransactionToolbar - exposes toolbar logic for UI
     */
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
        toolbar, // <-- toolbar logic for UI
    };
}

export default useTransactionTable;