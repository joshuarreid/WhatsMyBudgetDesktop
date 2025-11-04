/**
 * Simple, human-friendly query keys for TanStack Query (react-query)
 * for the PaymentSummary resource.
 *
 * - Minimal constants and helpers so hooks/components can share keys for
 *   queries and invalidations.
 * - Keys are plain arrays (recommended by TanStack Query).
 *
 * Usage:
 *   import qk from './paymentSummaryQueryKeys';
 *   useQuery(qk.summaryKey(['CardA','CardB'], '2025-11'), () => api.getPaymentSummary(...));
 *
 * @module paymentSummaryQueryKeys
 */

/**
 * Base key for payment summary.
 * @type {Array<string>}
 */
export const PAYMENT_SUMMARY = ['paymentSummary'];

/**
 * Key for a payment summary request.
 *
 * Accounts may be provided as a string (comma separated) or an array.
 * We canonicalize to a sorted, comma-separated string so the key is deterministic.
 *
 * @param {string|string[]} accounts - account or list of accounts
 * @param {string} statementPeriod - statement period
 * @returns {Array<any>} query key
 */
export function summaryKey(accounts, statementPeriod) {
    if (!accounts) return [...PAYMENT_SUMMARY, { statementPeriod }];
    const acctArray = Array.isArray(accounts)
        ? accounts.map((a) => String(a).trim()).filter(Boolean)
        : String(accounts).split(',').map((s) => s.trim()).filter(Boolean);

    // canonicalize ordering to make keys deterministic
    const canonicalAccounts = acctArray.slice().sort().join(',');
    return [...PAYMENT_SUMMARY, 'summary', canonicalAccounts, String(statementPeriod)];
}

/**
 * Convenience invalidation helper for a particular (accounts, statementPeriod) combo.
 *
 * @param {string|string[]} accounts
 * @param {string} statementPeriod
 * @returns {Array<any>}
 */
export const invalidateSummaryKey = (accounts, statementPeriod) => summaryKey(accounts, statementPeriod);

/**
 * Default export grouping helpers for convenient import.
 */
const paymentSummaryQueryKeys = {
    PAYMENT_SUMMARY,
    summaryKey,
    invalidateSummaryKey,
};

export default paymentSummaryQueryKeys;