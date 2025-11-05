/**
 * useTransactionTable
 *
 * - Composition hook that wires together: read queries, local UI state, and mutation handlers.
 * - Mutation logic has been moved to useTransactionMutations for clarity and testability.
 *
 * Changes applied:
 * - Make cached projected-query access resilient to the newer projections consumer shape
 *   (projected queries may now cache either an array or an account-scoped wrapper).
 * - Use canonical filters object when building projected query keys so the cache lookup
 *   mirrors the query key construction used by useProjectedTransactionsQuery.
 *
 * @module hooks/useTransactionTable
 */

import { useMemo, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStatementPeriodContext } from '../../../context/StatementPeriodProvider';
import useTransactionQueries from './useTransactionQueries';
import useTransactionLocalState from './useTransactionLocalState';
import useTransactionMutations from './useTransactionMutations';
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

    // ---------- Queries (moved to useTransactionQueries) ----------
    const {
        budgetResult,
        projectedTx,
        serverTx,
        projectedTotal,
        total,
        personalBalance,
        jointBalance,
        count,
        loading,
        error,
        refetchProjected,
    } = useTransactionQueries(filters, { statementPeriod, isStatementPeriodLoaded });

    // --- Local UI state (moved to useTransactionLocalState) ---
    const localState = useTransactionLocalState({ initialServerTx: serverTx, filters, statementPeriod });

    const {
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
    } = localState;

    /**
     * invalidateAccountAndMembers
     *
     * Delegates to centralized helper that performs query invalidation across budget/projected/paymentSummary
     *
     * @param {string} acct - account name to invalidate
     */
    const invalidateAccountAndMembers = useCallback((acct) => {
        try {
            invalidateAccountAndMembersHelper(queryClient, acct, statementPeriod, canonicalPaymentAccounts);
        } catch (err) {
            logger.error('invalidateAccountAndMembers wrapper failed', err, acct);
        }
    }, [queryClient, statementPeriod, canonicalPaymentAccounts]);

    // --- Mutation handlers (moved to useTransactionMutations) ---
    const { handleSaveRow, handleDeleteSelected, handleFileChange } = useTransactionMutations({
        queryClient,
        filters,
        statementPeriod,
        canonicalPaymentAccounts,
        invalidateAccountAndMembers,
        setLocalTx,
        setSaveErrors,
        setSavingIds,
        setEditing,
        makeTempId,
        budgetResult,
        refetchProjected,
        localTx,
        projectedTx,
    });

    /**
     * Clear transactions immediately when statementPeriod changes to avoid stale flashes.
     * Also try to populate from react-query cache immediately to prevent flashing.
     *
     * Note: this effect still belongs to the composition layer because it probes react-query cache.
     */
    useEffect(() => {
        if (!statementPeriod || !isStatementPeriodLoaded) {
            setLocalTx([]);
            return;
        }

        // attempt to populate from cache immediately for better UX (avoid flash)

        /**
         * Lazily require the query-key helpers to avoid circular imports at module initialization.
         * The helpers expose listKey/accountListKey that accept a canonical filters object.
         */
        const budgetQK = (() => {
            try {
                const budgetQKMod = require('../../../api/budgetTransaction/budgetTransactionQueryKeys').default;
                return budgetQKMod;
            } catch (err) {
                logger.error('failed to require budgetTransactionQueryKeys', err);
                return null;
            }
        })();

        const projectedQK = (() => {
            try {
                const projectedQKMod = require('../../../api/projectedTransaction/projectedTransactionQueryKeys').default;
                return projectedQKMod;
            } catch (err) {
                logger.error('failed to require projectedTransactionQueryKeys', err);
                return null;
            }
        })();

        // Build canonical keys using filter objects (mirrors useProjectedTransactionsQuery and useBudgetTransactionsQuery)
        const budgetKey = (() => {
            try {
                if (!budgetQK) return null;
                if (filters?.account) {
                    // account-scoped: pass remaining filters (statementPeriod)
                    const rest = statementPeriod ? { statementPeriod } : null;
                    return budgetQK.accountListKey(String(filters.account), rest);
                }
                const listFilters = statementPeriod ? { statementPeriod } : null;
                return budgetQK.listKey(listFilters);
            } catch (err) {
                logger.error('budgetKey build failed', err, { filters, statementPeriod });
                return null;
            }
        })();

        const projKey = (() => {
            try {
                if (!projectedQK) return null;
                if (filters?.account) {
                    const rest = statementPeriod ? { statementPeriod } : null;
                    return projectedQK.accountListKey(String(filters.account), rest);
                }
                const listFilters = statementPeriod ? { statementPeriod } : null;
                return projectedQK.listKey(listFilters);
            } catch (err) {
                logger.error('projKey build failed', err, { filters, statementPeriod });
                return null;
            }
        })();

        const cachedBudget = budgetKey ? queryClient.getQueryData(budgetKey) : null;
        const cachedProjected = projKey ? queryClient.getQueryData(projKey) : null;

        if (cachedBudget || cachedProjected) {
            // normalize cached shapes to arrays for localTx population
            let cachedServerArr = [];
            try {
                if (cachedBudget) {
                    // budget cache may be already normalized by useBudgetTransactionsQuery (canonical shape),
                    // or legacy shapes (array or wrapper). Try common shapes defensively.
                    if (Array.isArray(cachedBudget)) {
                        cachedServerArr = [...cachedBudget];
                    } else if (Array.isArray(cachedBudget.budgetTransactions)) {
                        cachedServerArr = [...cachedBudget.budgetTransactions];
                    } else {
                        const personal = cachedBudget.personalTransactions?.transactions ?? cachedBudget.personalTransactions ?? [];
                        const joint = cachedBudget.jointTransactions?.transactions ?? cachedBudget.jointTransactions ?? [];
                        if (Array.isArray(personal) || Array.isArray(joint)) {
                            cachedServerArr = [...(Array.isArray(personal) ? personal : []), ...(Array.isArray(joint) ? joint : [])];
                        }
                    }
                }
            } catch (e) {
                logger.error('extracting cachedBudget failed', e);
            }

            const cachedProjArr = cachedProjected ? (() => {
                try {
                    // Projections cache shape may be:
                    // - Array (new useProjectedTransactionsQuery flattens account-scoped requests to an array)
                    // - Account wrapper { personalTransactions, jointTransactions }
                    // - Wrapper { projections: [...] } or { data: [...] }
                    if (Array.isArray(cachedProjected)) {
                        return [...cachedProjected];
                    }

                    if (Array.isArray(cachedProjected.projections)) {
                        return [...cachedProjected.projections];
                    }

                    // Attempt account-style flattening (personal/joint)
                    const personal = cachedProjected.personalTransactions?.transactions ?? cachedProjected.personalTransactions ?? [];
                    const joint = cachedProjected.jointTransactions?.transactions ?? cachedProjected.jointTransactions ?? [];
                    if (Array.isArray(personal) || Array.isArray(joint)) {
                        return [...(Array.isArray(personal) ? personal : []), ...(Array.isArray(joint) ? joint : [])];
                    }

                    // Common wrapper names
                    const maybeArr = cachedProjected.data ?? cachedProjected.results ?? cachedProjected.transactions ?? null;
                    if (Array.isArray(maybeArr)) return [...maybeArr];

                    // Unknown shape -> return empty
                    return [];
                } catch (err) {
                    logger.error('extracting cachedProjected failed', err);
                    return [];
                }
            })() : [];

            // Sort server and projected lists newest-first by transactionDate
            const serverSorted = (cachedServerArr || []).sort((a, b) => {
                const da = a?.transactionDate ? new Date(a.transactionDate).getTime() : 0;
                const db = b?.transactionDate ? new Date(b.transactionDate).getTime() : 0;
                return db - da;
            });

            const projSorted = (cachedProjArr || [])
                .map((t) => ({ ...t, __isProjected: true }))
                .sort((a, b) => {
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
    }, [statementPeriod, isStatementPeriodLoaded, filters?.account, queryClient, setLocalTx]);

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
        setLocalTx,
    ]);

    /**
     * Save edit helper that builds a patch and delegates to handleSaveRow.
     *
     * @param {string|number} id - transaction id
     * @param {string} field - field being edited
     * @param {any} value - new value
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

    // --- Toolbar (created after handlers exist so references are initialized) ---
    const toolbar = useTransactionToolbar({
        onAdd: handleAddTransaction,
        onAddProjection: handleAddProjection,
        onImport: openFilePicker,
        onDelete: () => handleDeleteSelected(selectedIds),
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
        handleDeleteSelected: () => handleDeleteSelected(selectedIds),
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