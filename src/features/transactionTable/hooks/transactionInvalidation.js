/**
 * Encapsulates queryClient invalidation logic for budget, projected and paymentSummary queries.
 *
 * - Keeps all queryClient.invalidateQueries usage in one place so keys are consistent across the app.
 * - Handles the special 'joint' account case by invalidating member accounts and aggregate payment summary.
 *
 * Improvements:
 * - Use canonical query-key helpers for list-level invalidation (optionally scoped by statementPeriod).
 * - When invalidating 'joint' also invalidate the projected 'joint' key.
 * - Prefer canonicalPaymentAccounts when provided for aggregate payment summary invalidation; fall back to config accounts.
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
 * - If acct is falsy, invalidates the "list" keys (optionally scoped by statementPeriod).
 * - If acct === 'joint' (case-insensitive), invalidates the joint account key (both budget + projected),
 *   then invalidates each member's keys, and also invalidates the aggregate payment summary for canonical accounts.
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
        // List-level invalidation (no specific account)
        if (!norm) {
            const listFilters = statementPeriod ? { statementPeriod } : null;

            try {
                const budgetListKey = budgetQK.listKey(listFilters);
                logger.info('invalidating budget list key', { budgetListKey });
                queryClient.invalidateQueries({ queryKey: budgetListKey });
            } catch (e) {
                logger.error('invalidate budget lists key failed', e);
            }

            try {
                const projListKey = projectedQK.listKey(listFilters);
                logger.info('invalidating projected list key', { projListKey });
                queryClient.invalidateQueries({ queryKey: projListKey });
            } catch (e) {
                logger.error('invalidate projected lists key failed', e);
            }

            try {
                const aggAccounts = Array.isArray(canonicalPaymentAccounts) && canonicalPaymentAccounts.length
                    ? canonicalPaymentAccounts
                    : (getAccounts?.() || []);
                const aggKey = paymentSummaryQK.summaryKey(aggAccounts, statementPeriod);
                logger.info('invalidating aggregate payment summary', { aggKey });
                queryClient.invalidateQueries({ queryKey: aggKey });
            } catch (e) {
                logger.error('invalidate aggregate payment summary failed', e);
            }

            return;
        }

        const lower = String(norm).toLowerCase();

        // Joint account special handling: invalidate joint + all member accounts + aggregate payment summary
        if (lower === 'joint') {
            // Invalidate budget joint key
            try {
                const jointBudgetKey = budgetQK.accountListKey('joint', { statementPeriod });
                logger.info('invalidating budget joint key', { jointBudgetKey });
                queryClient.invalidateQueries({ queryKey: jointBudgetKey });
            } catch (e) {
                logger.error('invalidate budget joint account key failed', e);
            }

            // Invalidate projected joint key
            try {
                const jointProjKey = projectedQK.accountListKey('joint', { statementPeriod });
                logger.info('invalidating projected joint key', { jointProjKey });
                queryClient.invalidateQueries({ queryKey: jointProjKey });
            } catch (e) {
                logger.error('invalidate projected joint account key failed', e);
            }

            // Determine member accounts: prefer canonicalPaymentAccounts if provided, else use getAccounts()
            let members = [];
            try {
                members = Array.isArray(canonicalPaymentAccounts) && canonicalPaymentAccounts.length
                    ? canonicalPaymentAccounts.map((a) => String(a).toLowerCase())
                    : (getAccounts?.() || []).map((a) => String(a).toLowerCase());
                members = members.filter((a) => a && a !== 'joint');
            } catch (err) {
                logger.error('failed to determine member accounts, falling back to config.getAccounts', err);
                try {
                    members = (getAccounts?.() || []).map((a) => String(a).toLowerCase()).filter((a) => a && a !== 'joint');
                } catch (e) {
                    logger.error('fallback getAccounts failed', e);
                    members = [];
                }
            }

            // Invalidate each member's budget/proj/payment summary keys
            members.forEach((m) => {
                try {
                    const acctKey = budgetQK.accountListKey(String(m), { statementPeriod });
                    logger.info('invalidating budget account key for member', { member: m, acctKey });
                    queryClient.invalidateQueries({ queryKey: acctKey });
                } catch (err) {
                    logger.error('invalidate budget account key failed for member', m, err);
                }
                try {
                    const projKey = projectedQK.accountListKey(String(m), { statementPeriod });
                    logger.info('invalidating projected account key for member', { member: m, projKey });
                    queryClient.invalidateQueries({ queryKey: projKey });
                } catch (err) {
                    logger.error('invalidate projected key failed for member', m, err);
                }
                try {
                    const perAccountKey = paymentSummaryQK.summaryKey([String(m)], statementPeriod);
                    logger.info('invalidating per-account payment summary for member', { member: m, perAccountKey });
                    queryClient.invalidateQueries({ queryKey: perAccountKey });
                } catch (psErr) {
                    logger.error('invalidate per-account paymentSummary failed for', m, psErr);
                }
            });

            // Invalidate aggregate payment summary used by payments page
            try {
                const aggAccounts = Array.isArray(canonicalPaymentAccounts) && canonicalPaymentAccounts.length
                    ? canonicalPaymentAccounts
                    : members;
                const aggregateKey = paymentSummaryQK.summaryKey(aggAccounts || [], statementPeriod);
                logger.info('invalidating aggregate payment summary after joint change', { aggregateKey });
                queryClient.invalidateQueries({ queryKey: aggregateKey });
            } catch (e) {
                logger.error('invalidate aggregate payment summary failed', e);
            }

            return;
        }

        // Normal single-account invalidation
        try {
            const acctKey = budgetQK.accountListKey(String(norm), { statementPeriod });
            logger.info('invalidating budget account key', { acct: norm, acctKey });
            queryClient.invalidateQueries({ queryKey: acctKey });
        } catch (e) {
            logger.error('invalidate budget account key failed', e);
        }

        try {
            const projKey = projectedQK.accountListKey(String(norm), { statementPeriod });
            logger.info('invalidating projected account key', { acct: norm, projKey });
            queryClient.invalidateQueries({ queryKey: projKey });
        } catch (e) {
            logger.error('invalidate projected account key failed', e);
        }

        try {
            const perAccountKey = paymentSummaryQK.summaryKey([String(norm)], statementPeriod);
            logger.info('invalidating paymentSummary per-account', { acct: norm, perAccountKey });
            queryClient.invalidateQueries({ queryKey: perAccountKey });
        } catch (e) {
            logger.error('invalidate paymentSummary per-account failed', e);
        }
    } catch (err) {
        logger.error('invalidateAccountAndMembers failed', err, acct, statementPeriod);
    }
}

export default {
    invalidateAccountAndMembers,
};