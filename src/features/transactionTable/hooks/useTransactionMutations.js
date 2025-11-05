/**
 * useTransactionMutations
 *
 * - Encapsulates create/update/delete/upload mutation logic for transactions.
 * - Calls budgetApi / projectedApi, updates local optimistic state via injected setters,
 *   and triggers cache invalidation via the injected invalidateAccountAndMembers helper.
 * - When creating/updating projected transactions the hook REFRESHES (fetchQuery) the same
 *   account's projections using the canonical query key helpers and the public projected API
 *   (fetchAccountProjectedTransactionList). This mirrors the behavior of the UI screens and
 *   keeps cache keys canonical.
 *
 * Fix applied:
 * - When creating a projection from the joint view, the server may assign the created
 *   projection to a specific member account (e.g. user1). Previously we only refetched
 *   the attempted account (usually 'joint') which meant the joint list would not include
 *   the server-assigned projection after navigation. Now we explicitly refresh both the
 *   attemptedAccount and the server-returned created.account (when different). This ensures
 *   both the joint and member views show the correct data after a create/update.
 *
 * @module hooks/useTransactionMutations
 */

import { useCallback } from 'react';
import { getAccounts } from '../../../config/config.js';
import budgetApi from '../../../api/budgetTransaction/budgetTransaction';
import projectedApi from '../../../api/projectedTransaction/projectedTransaction';
import projectedQK from '../../../api/projectedTransaction/projectedTransactionQueryKeys';
import { TEMP_ID_PREFIX } from '../utils/constants';

const logger = {
    info: (...args) => console.log('[useTransactionMutations]', ...args),
    error: (...args) => console.error('[useTransactionMutations]', ...args),
};

/**
 * stripClientFields
 *
 * Remove client-only fields before sending data to the API.
 *
 * @param {Object} tx - transaction object
 * @returns {Object} sanitized copy
 */
const stripClientFields = (tx) => {
    const copy = { ...tx };
    delete copy.id;
    delete copy.__isNew;
    delete copy.__isProjected;
    return copy;
};

/**
 * updateLocalWithCreatedProjected
 *
 * Update the optimistic localTx row with the server-returned projected object.
 *
 * @param {Function} setLocalTx - setter for localTx state
 * @param {string} tempId - temporary id used on the client
 * @param {Object|Array} created - server response (object or array)
 */
const updateLocalWithCreatedProjectedHelper = (setLocalTx, tempId, created) => {
    try {
        if (Array.isArray(created)) {
            setLocalTx((prev) => (prev || []).map((t) => (t.id === tempId ? { ...(created[0] || {}), __isProjected: true } : t)));
        } else {
            setLocalTx((prev) => (prev || []).map((t) => (t.id === tempId ? { ...created, __isProjected: true } : t)));
        }
    } catch (err) {
        logger.error('updateLocalWithCreatedProjected failed', err);
    }
};

/**
 * Creates mutation handlers for transactions.
 *
 * @param {Object} deps - dependency object
 * @param {import('@tanstack/react-query').QueryClient} deps.queryClient
 * @param {Object} deps.filters - current filters
 * @param {string|null|undefined} deps.statementPeriod
 * @param {Array<string>} deps.canonicalPaymentAccounts
 * @param {Function} deps.invalidateAccountAndMembers - (acct) => void
 * @param {Function} deps.setLocalTx - React setState for localTx
 * @param {Function} deps.setSaveErrors - React setState for saveErrors
 * @param {Function} deps.setSavingIds - React setState for savingIds
 * @param {Function} deps.setEditing - React setState for editing
 * @param {Function} deps.makeTempId - function that returns a temporary id string
 * @param {Object} deps.budgetResult - full budgetResult returned by read hook (used to refetch on error)
 * @param {Function} deps.refetchProjected - function to refetch projected transactions (optional)
 * @param {Array} deps.localTx - current localTx array (used to detect row types)
 * @param {Array} deps.projectedTx - current projectedTx array
 * @returns {Object} mutation handlers: { handleSaveRow, handleDeleteSelected, handleFileChange }
 */
export default function useTransactionMutations(deps = {}) {
    const {
        queryClient,
        filters = {},
        statementPeriod,
        canonicalPaymentAccounts = [],
        invalidateAccountAndMembers,
        setLocalTx,
        setSaveErrors,
        setSavingIds,
        setEditing,
        makeTempId,
        budgetResult,
        refetchProjected,
        localTx = [],
        projectedTx = [],
    } = deps;

    /**
     * handleSaveRow
     *
     * Persist a single transaction (create or update).
     *
     * Behavior summary for projected creates:
     * - Persist to server
     * - Update the optimistic local row with the server response
     * - REFRESH (fetchQuery) the same account's projected list (mirrors user-screen behavior)
     * - Additionally invalidate/refresh member accounts so their screens update
     *
     * Enhanced behavior:
     * - After creating a projected transaction, refresh both the attemptedAccount (where the UI created)
     *   and the server-returned created.account (if different). This ensures joint view and member views
     *   remain consistent.
     *
     * @param {string} id - local id (may be temporary)
     * @param {Object} updatedFields - partial fields to merge into existing local row
     * @param {boolean} [addAnother=false] - when creating, add a blank new row after success
     * @returns {Promise<void>}
     */
    const handleSaveRow = useCallback(
        async (id, updatedFields = {}, addAnother = false) => {
            let txToPersist = null;

            // Merge updated fields into localTx; capture the txToPersist reference
            setLocalTx((prev) =>
                (prev || []).map((t) => {
                    if (t.id !== id) return t;
                    const updated = { ...t, ...updatedFields };
                    txToPersist = updated;
                    return updated;
                })
            );

            // close any open editing UI
            setEditing(null);

            if (!txToPersist) {
                logger.error('handleSaveRow: transaction not found locally', { id, updatedFields });
                return;
            }

            // clear prior save error for this id
            setSaveErrors((prev) => {
                if (!prev || !prev[id]) return prev || {};
                const copy = { ...prev };
                delete copy[id];
                return copy;
            });

            if (statementPeriod) {
                txToPersist = { ...txToPersist, statementPeriod };
            }

            const isNew = String(id).startsWith(TEMP_ID_PREFIX) || txToPersist.__isNew;

            // mark saving
            setSavingIds((prev) => {
                const copy = new Set(prev || []);
                copy.add(id);
                return copy;
            });

            try {
                if (isNew) {
                    const payload = stripClientFields({ ...txToPersist, statementPeriod });

                    // capture the attempted account (the account the UI attempted to create in)
                    const attemptedAccount = payload.account ?? filters?.account ?? 'joint';
                    const attemptedIsJoint = attemptedAccount && String(attemptedAccount).toLowerCase() === 'joint';

                    if (txToPersist.__isProjected) {
                        // create projected on server
                        const created = await projectedApi.createProjectedTransaction(payload);

                        // update the optimistic local row with server return
                        updateLocalWithCreatedProjectedHelper(setLocalTx, id, created);

                        // Determine server-assigned account (handle array or object server returns)
                        const createdObj = Array.isArray(created) ? created[0] : created;
                        const createdAccount = createdObj?.account ?? payload.account ?? filters?.account ?? null;

                        // Build list of accounts to refresh: attemptedAccount and createdAccount (if different)
                        const accountsToRefresh = new Set();
                        if (attemptedAccount) accountsToRefresh.add(String(attemptedAccount));
                        if (createdAccount) accountsToRefresh.add(String(createdAccount));
                        // ensure we always normalize to lowercase for consistency
                        const normalizedAccounts = Array.from(accountsToRefresh).map((a) => String(a));

                        // REFRESH projections for each relevant account so both joint and member views align with server
                        await Promise.all(
                            normalizedAccounts.map(async (targetAccount) => {
                                try {
                                    const projKey = projectedQK.accountListKey(String(targetAccount), statementPeriod ? { statementPeriod } : null);

                                    await queryClient.fetchQuery({
                                        queryKey: projKey,
                                        queryFn: () =>
                                            // call the public fetch helper that returns the account wrapper
                                            projectedApi.fetchAccountProjectedTransactionList(targetAccount, statementPeriod ? { statementPeriod } : {}),
                                    });
                                    logger.info('fetched projections for account after create', { account: targetAccount, statementPeriod });
                                } catch (err) {
                                    logger.error('failed to fetch projections for mutated account', err, { targetAccount, statementPeriod });
                                }
                            })
                        );

                        // EXTRA: ensure member/user screens are updated. Invalidate (or refresh) their caches.
                        try {
                            const members = getAccounts()
                                .map((a) => String(a).toLowerCase())
                                .filter((a) => a && a !== 'joint');

                            // Invalidate member account keys so any component using account-scoped queries will refetch.
                            members.forEach((m) => {
                                try {
                                    invalidateAccountAndMembers(m);
                                } catch (e) {
                                    logger.error('invalidate member account failed for', m, e);
                                }
                            });
                        } catch (e) {
                            logger.error('member invalidation after projected create failed', e);
                        }
                    } else {
                        // create budget transaction (unchanged behavior)
                        const created = await budgetApi.createBudgetTransaction(payload);
                        setLocalTx((prev) => (prev || []).map((t) => (t.id === id ? { ...created } : t)));

                        try {
                            const acctToInvalidate = created.account ?? payload.account ?? filters?.account ?? null;
                            invalidateAccountAndMembers(acctToInvalidate);
                        } catch (e) {
                            logger.error('invalidate budget queries failed', e);
                        }

                        if (attemptedIsJoint) {
                            try {
                                invalidateAccountAndMembers('joint');
                            } catch (e) {
                                logger.error('invalidate joint after budget create failed', e);
                            }
                        }

                        if (addAnother) {
                            try {
                                const defaultPM = (typeof window !== 'undefined' && window && window.__getDefaultPaymentMethodForAccount)
                                    ? window.__getDefaultPaymentMethodForAccount(filters?.account)
                                    : undefined;
                                const newTx = {
                                    id: makeTempId(),
                                    name: '',
                                    amount: 0,
                                    category: '',
                                    criticality: '',
                                    transactionDate: new Date().toISOString(),
                                    account: filters?.account || '',
                                    paymentMethod: defaultPM || '',
                                    memo: '',
                                    __isNew: true,
                                    statementPeriod,
                                };
                                setLocalTx((prev) => [newTx, ...(prev || [])]);
                                setEditing({ id: newTx.id, mode: 'row' });
                            } catch (e) {
                                logger.error('addAnother flow failed', e);
                            }
                        }
                    }
                } else {
                    // Update existing (unchanged behavior)
                    const payload = stripClientFields({ ...txToPersist, statementPeriod });

                    if (txToPersist.__isProjected) {
                        await projectedApi.updateProjectedTransaction(id, payload);
                        try {
                            // refresh the projections for the account the edit was attempted on
                            const attemptedAccount = payload.account ?? filters?.account ?? 'joint';
                            const projKey = projectedQK.accountListKey(String(attemptedAccount), statementPeriod ? { statementPeriod } : null);

                            await queryClient.fetchQuery({
                                queryKey: projKey,
                                queryFn: () => projectedApi.fetchAccountProjectedTransactionList(attemptedAccount, statementPeriod ? { statementPeriod } : {}),
                            });
                            logger.info('fetched projections for account after update', { account: attemptedAccount, statementPeriod });
                        } catch (err) {
                            logger.error('failed to fetch projections after projected update', err);
                        }

                        try {
                            invalidateAccountAndMembers(filters?.account ?? payload.account ?? null);
                        } catch (e) {
                            logger.error('invalidate projected after update failed', e);
                        }
                    } else {
                        await budgetApi.updateBudgetTransaction(id, payload);
                        try {
                            invalidateAccountAndMembers(payload.account ?? filters?.account ?? null);
                        } catch (e) {
                            logger.error('invalidate budget queries after update failed', e);
                        }

                        try {
                            const attemptedAccount = payload.account ?? filters?.account ?? null;
                            if (attemptedAccount && String(attemptedAccount).toLowerCase() === 'joint') {
                                invalidateAccountAndMembers('joint');
                            }
                        } catch (e) {
                            logger.error('invalidate joint after budget update failed', e);
                        }
                    }
                }
            } catch (err) {
                logger.error('handleSaveRow: persist failed', err);
                setSaveErrors((prev) => ({ ...(prev || {}), [id]: err?.message || String(err) }));
                // on update failure attempt a refetch to reconcile local state with server
                if (!isNew) {
                    try {
                        await budgetResult?.refetch?.();
                    } catch (fetchErr) {
                        logger.error('fetchTransactions after failed persist also failed', fetchErr);
                    }
                }
            } finally {
                setSavingIds((prev) => {
                    const copy = new Set(prev || []);
                    copy.delete(id);
                    return copy;
                });
            }
        },
        [
            setLocalTx,
            setEditing,
            setSaveErrors,
            setSavingIds,
            makeTempId,
            filters,
            statementPeriod,
            invalidateAccountAndMembers,
            budgetResult,
            queryClient,
        ]
    );

    /**
     * handleDeleteSelected
     *
     * - Deletes the currently selected ids (mix of local temp rows, budget and projected)
     * - Updates local state to remove temporary rows immediately and calls APIs for server rows.
     * - Invalidates account-scoped queries after deletions.
     *
     * NOTE: assumes selectedIds is provided externally (we accept it via deps closure).
     *
     * @param {Set<string>} selectedIds - set of selected ids to delete
     * @returns {Promise<void>}
     */
    const handleDeleteSelected = useCallback(
        async (selectedIds) => {
            if (!selectedIds || selectedIds.size === 0) return;
            const ids = Array.from(selectedIds);
            const localOnly = ids.filter((id) => String(id).startsWith(TEMP_ID_PREFIX));
            const toDeleteFromAPI = ids.filter((id) => !String(id).startsWith(TEMP_ID_PREFIX));

            // remove local-only immediately
            if (localOnly.length) {
                setLocalTx((prev) => (prev || []).filter((t) => !localOnly.includes(t.id)));
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

                // Invalidate queries for impacted accounts
                if (budgetIds.length > 0) {
                    try {
                        const acct = filters?.account ?? null;
                        invalidateAccountAndMembers(acct);
                        // also invalidate joint when we attempted deletion from joint view
                        if (acct && String(acct).toLowerCase() === 'joint') invalidateAccountAndMembers('joint');
                    } catch (err) {
                        logger.error('invalidate after budget delete failed', err);
                    }
                }

                if (projectionIds.length > 0) {
                    try {
                        const projAcct = filters?.account ?? null;
                        invalidateAccountAndMembers(projAcct);
                        if (projAcct && String(projAcct).toLowerCase() === 'joint') invalidateAccountAndMembers('joint');
                    } catch (err) {
                        logger.error('invalidate after projection delete failed', err);
                    }
                }
            } catch (err) {
                logger.error('Error deleting transactions', err);
            }
        },
        [localTx, projectedTx, setLocalTx, filters, invalidateAccountAndMembers]
    );

    /**
     * handleFileChange
     *
     * - Handles CSV upload and invalidation after success.
     *
     * @param {Event} ev - file input change event
     * @returns {Promise<void>}
     */
    const handleFileChange = useCallback(
        async (ev) => {
            const file = ev?.target?.files && ev.target.files[0];
            if (!file) return;
            try {
                await budgetApi.uploadBudgetTransactions(file, statementPeriod);
                try {
                    const acct = filters?.account ?? null;
                    invalidateAccountAndMembers(acct);
                    if (acct && String(acct).toLowerCase() === 'joint') invalidateAccountAndMembers('joint');
                } catch (e) {
                    logger.error('invalidate after upload failed', e);
                }
            } catch (err) {
                logger.error('Upload failed', err);
                throw err;
            } finally {
                if (ev?.target) ev.target.value = '';
            }
        },
        [statementPeriod, filters, invalidateAccountAndMembers]
    );

    return {
        handleSaveRow,
        handleDeleteSelected,
        handleFileChange,
    };
}