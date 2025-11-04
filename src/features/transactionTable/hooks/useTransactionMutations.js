/**
 * useTransactionMutations
 *
 * - Encapsulates all create/update/delete/upload mutation logic for transactions.
 * - Calls budgetApi / projectedApi, updates local optimistic state via injected setters,
 *   and triggers cache invalidation via the injected invalidateAccountAndMembers helper.
 *
 * This hook is side-effectful (API + queryClient) but kept decoupled from local state shape
 * by accepting setter callbacks and current local arrays as dependencies.
 *
 * @module hooks/useTransactionMutations
 */

import { useCallback } from 'react';
import budgetApi from '../../../api/budgetTransaction/budgetTransaction';
import projectedApi from '../../../api/projectedTransaction/projectedTransaction';
import { TEMP_ID_PREFIX } from '../utils/constants';

const logger = {
    info: (...args) => console.log('[useTransactionMutations]', ...args),
    error: (...args) => console.error('[useTransactionMutations]', ...args),
};

/**
 * @typedef UseTransactionMutationsDeps
 * @property {import('@tanstack/react-query').QueryClient} queryClient
 * @property {Object} filters
 * @property {string|null|undefined} statementPeriod
 * @property {Array<string>} canonicalPaymentAccounts
 * @property {Function} invalidateAccountAndMembers - (acct) => void
 * @property {Function} setLocalTx - React setState for localTx
 * @property {Function} setSaveErrors - React setState for saveErrors
 * @property {Function} setSavingIds - React setState for savingIds
 * @property {Function} setEditing - React setState for editing
 * @property {Function} makeTempId - function that returns a temporary id string
 * @property {Object} budgetResult - full budgetResult returned by read hook (used to refetch on error)
 * @property {Function} refetchProjected - function to refetch projected transactions
 * @property {Array} localTx - current localTx array (used to detect row types)
 * @property {Array} projectedTx - current projectedTx array
 */

/**
 * Creates mutation handlers for transactions.
 *
 * @param {UseTransactionMutationsDeps} deps
 * @returns {Object} { handleSaveRow, handleDeleteSelected, handleFileChange }
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
     * stripClientFields
     * - Local helper to remove client-only fields before sending to API.
     *
     * @param {Object} tx
     * @returns {Object}
     */
    const stripClientFields = (tx) => {
        const copy = { ...tx };
        delete copy.id;
        delete copy.__isNew;
        delete copy.__isProjected;
        return copy;
    };

    /**
     * handleSaveRow
     *
     * - Persists a single row (create or update) to the appropriate API.
     * - Updates localTx after server response and triggers invalidation.
     *
     * @param {string} id - id of the local row (may be temporary)
     * @param {Object} updatedFields - partial fields to merge into existing local row
     * @param {boolean} [addAnother=false] - when creating, add a blank new row after success
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
                    const attemptedAccount = (payload.account ?? filters?.account ?? null);
                    const attemptedIsJoint = attemptedAccount && String(attemptedAccount).toLowerCase() === 'joint';

                    if (txToPersist.__isProjected) {
                        // create projected
                        const created = await projectedApi.createProjectedTransaction(payload);
                        const createdWithFlag = { ...created, __isProjected: true };
                        setLocalTx((prev) => (prev || []).map((t) => (t.id === id ? createdWithFlag : t)));

                        // invalidate appropriate keys:
                        // 1) invalidate the account the server returned (member accounts if split)
                        try {
                            invalidateAccountAndMembers(created.account ?? payload.account ?? filters?.account ?? null);
                        } catch (e) {
                            logger.error('invalidate projected after create failed', e);
                        }

                        // 2) If the original attempted account was 'joint', also invalidate joint keys so
                        //    joint transactionTable and joint categoryTable refresh even if the server split rows.
                        if (attemptedIsJoint) {
                            try {
                                invalidateAccountAndMembers('joint');
                            } catch (e) {
                                logger.error('invalidate joint after projected create failed', e);
                            }
                        }
                    } else {
                        // create budget transaction
                        const created = await budgetApi.createBudgetTransaction(payload);
                        setLocalTx((prev) => (prev || []).map((t) => (t.id === id ? { ...created } : t)));

                        try {
                            const acctToInvalidate = created.account ?? payload.account ?? filters?.account ?? null;
                            invalidateAccountAndMembers(acctToInvalidate);
                        } catch (e) {
                            logger.error('invalidate budget queries failed', e);
                        }

                        // If created in joint (attempted), also invalidate joint so joint-category views refresh
                        const attemptedIsJointBudget = attemptedAccount && String(attemptedAccount).toLowerCase() === 'joint';
                        if (attemptedIsJointBudget) {
                            try {
                                invalidateAccountAndMembers('joint');
                            } catch (e) {
                                logger.error('invalidate joint after budget create failed', e);
                            }
                        }

                        if (addAnother) {
                            try {
                                const defaultPM = (typeof window !== 'undefined' && window && window.__getDefaultPaymentMethodForAccount) ? window.__getDefaultPaymentMethodForAccount(filters?.account) : undefined;
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
                    const payload = stripClientFields({ ...txToPersist, statementPeriod });

                    if (txToPersist.__isProjected) {
                        await projectedApi.updateProjectedTransaction(id, payload);
                        try {
                            invalidateAccountAndMembers(filters?.account ?? payload.account ?? null);
                        } catch (e) {
                            logger.error('invalidate projected after update failed', e);
                        }

                        // If the edit was attempted on the joint screen, also ensure joint keys are invalidated
                        try {
                            const attemptedAccount = (payload.account ?? filters?.account ?? null);
                            if (attemptedAccount && String(attemptedAccount).toLowerCase() === 'joint') {
                                invalidateAccountAndMembers('joint');
                            }
                        } catch (e) {
                            logger.error('invalidate joint after projected update failed', e);
                        }
                    } else {
                        await budgetApi.updateBudgetTransaction(id, payload);
                        try {
                            invalidateAccountAndMembers(payload.account ?? filters?.account ?? null);
                        } catch (e) {
                            logger.error('invalidate budget queries after update failed', e);
                        }

                        // Also consider joint invalidation when the attempted account was joint
                        try {
                            const attemptedAccount = (payload.account ?? filters?.account ?? null);
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