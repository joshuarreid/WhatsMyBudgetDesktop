/**
 * Encapsulates queryClient invalidation logic for budget, projected and paymentSummary queries.
 *
 * - Keeps all queryClient.invalidateQueries usage in one place so keys are consistent across the app.
 * - Handles the special 'joint' account case by invalidating member accounts and aggregate payment summary.
 *
 * @module hooks/transactionInvalidation
 */

import paymentSummaryQK from '../../../api/paymentSummary/paymentSummaryQueryKeys';
import budgetQK from '../../../api/budgetTransaction/budgetTransactionQueryKeys';
import projectedQK from '../../../api/projectedTransaction/projectedTransactionQueryKeys';
import { getAccounts } from '../../../config/config.js';

const logger = {
    info: (...args) => console.log('[transactionInvalidation]', ...args),
    error: (...args) => console.error('[transactionInvalidation]', ...args),
};

/**
 * invalidateAccountAndMembers
 *
 * Invalidate account-scoped queries for budget, projected and paymentSummary.
 * - If acct is falsy, invalidates the "list" keys (broad list-level keys).
 * - If acct === 'joint' (case-insensitive), invalidates the joint account key and each member's keys,
 *   and also invalidates the aggregate payment summary for canonical accounts.
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient - react-query QueryClient instance
 * @param {string|null|undefined} acct - account identifier (e.g. 'josh', 'anna', 'joint') or null/undefined for list-level
 * @param {string|null|undefined} statementPeriod - optional statementPeriod filter used to scope keys
 * @param {Array<string>} [canonicalPaymentAccounts=[]] - optional canonical accounts used for aggregate payment summary invalidation
 * @throws {Error} - will not throw under normal operation; errors are logged.
 */
export function invalidateAccountAndMembers(queryClient, acct, statementPeriod, canonicalPaymentAccounts = []) {
    try {
        const norm = acct == null ? null : String(acct).trim();
        if (!norm) {
            // nothing specific to invalidate; invalidate list-level keys
            try {
                queryClient.invalidateQueries({ queryKey: budgetQK.invalidateListsKey() });
            } catch (e) {
                logger.error('invalidate budget lists key failed', e);
            }
            try {
                queryClient.invalidateQueries({ queryKey: projectedQK.invalidateListsKey() });
            } catch (e) {
                logger.error('invalidate projected lists key failed', e);
            }
            return;
        }

        const lower = String(norm).toLowerCase();

        if (lower === 'joint') {
            // Invalidate joint key
            try {
                const jointKey = budgetQK.accountListKey('joint', { statementPeriod });
                queryClient.invalidateQueries({ queryKey: jointKey });
            } catch (e) {
                logger.error('invalidate joint account key failed', e);
            }

            // Also invalidate each member account key so user compact tables refresh after a joint create that gets split
            try {
                const members = getAccounts()
                    .map((a) => String(a).toLowerCase())
                    .filter((a) => a && a !== 'joint');
                members.forEach((m) => {
                    try {
                        const acctKey = budgetQK.accountListKey(String(m), { statementPeriod });
                        queryClient.invalidateQueries({ queryKey: acctKey });
                    } catch (err) {
                        logger.error('invalidate budget account key failed for member', m, err);
                    }
                    try {
                        const projKey = projectedQK.accountListKey(String(m), { statementPeriod });
                        queryClient.invalidateQueries({ queryKey: projKey });
                    } catch (err) {
                        logger.error('invalidate projected key failed for member', m, err);
                    }

                    // payment summary per-member
                    try {
                        const perAccountKey = paymentSummaryQK.summaryKey([String(m)], statementPeriod);
                        queryClient.invalidateQueries({ queryKey: perAccountKey });
                    } catch (psErr) {
                        logger.error('invalidate per-account paymentSummary failed for', m, psErr);
                    }
                });
            } catch (err) {
                logger.error('invalidate member accounts after joint change failed', err);
            }

            // Also invalidate aggregate payment summary used by payments page (use provided canonical list or fallback to config accounts)
            try {
                const aggregateKey = paymentSummaryQK.summaryKey(canonicalPaymentAccounts || [], statementPeriod);
                queryClient.invalidateQueries({ queryKey: aggregateKey });
            } catch (e) {
                logger.error('invalidate aggregate payment summary failed', e);
            }

            return;
        }

        // Normal single-account invalidation
        try {
            const acctKey = budgetQK.accountListKey(String(norm), { statementPeriod });
            queryClient.invalidateQueries({ queryKey: acctKey });
        } catch (e) {
            logger.error('invalidate budget account key failed', e);
        }

        try {
            const projKey = projectedQK.accountListKey(String(norm), { statementPeriod });
            queryClient.invalidateQueries({ queryKey: projKey });
        } catch (e) {
            logger.error('invalidate projected account key failed', e);
        }

        try {
            const perAccountKey = paymentSummaryQK.summaryKey([String(norm)], statementPeriod);
            queryClient.invalidateQueries({ queryKey: perAccountKey });
        } catch (e) {
            logger.error('invalidate paymentSummary per-account failed', e);
        }
    } catch (err) {
        logger.error('invalidateAccountAndMembers failed', err, acct);
    }
}

export default {
    invalidateAccountAndMembers,
};