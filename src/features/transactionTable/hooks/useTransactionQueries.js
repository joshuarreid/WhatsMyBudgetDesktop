/**
 * useTransactionQueries
 *
 * - Encapsulates read-only react-query usage for budget + projected transactions.
 * - Computes derived arrays (serverTx), totals, counts and exposes loading/error/refetch helpers.
 * - Keeps query composition isolated so useTransactionTable can focus on UI state & mutations.
 *
 * @module hooks/useTransactionQueries
 */

import { useMemo } from 'react';
import useBudgetTransactionsQuery from '../../../hooks/useBudgetTransactionQuery';
import useProjectedTransactionsQuery from '../../../hooks/useProjectedTransactionQuery';

const logger = {
    info: (...args) => console.log('[useTransactionQueries]', ...args),
    error: (...args) => console.error('[useTransactionQueries]', ...args),
};

/**
 * useTransactionQueries
 *
 * @param {Object} filters - component-provided filters (may include account, category, etc.)
 * @param {Object} opts - options bag
 *   @param {string|null|undefined} opts.statementPeriod - statementPeriod from context
 *   @param {boolean} [opts.isStatementPeriodLoaded=true] - whether statementPeriod loading completed
 *
 * @returns {Object} - { budgetResult, projectedTx, serverTx, projectedTotal, total, personalBalance, jointBalance, count, loading, error, refetchProjected }
 */
export default function useTransactionQueries(filters = {}, opts = {}) {
    const { statementPeriod, isStatementPeriodLoaded = true } = opts || {};

    // compose account filters the same way callers expect
    const accountFilters = useMemo(() => ({ ...(filters || {}), statementPeriod }), [filters, statementPeriod]);

    // --- Queries (react-query hooks) ---
    const budgetResult = useBudgetTransactionsQuery(accountFilters);

    const {
        projectedTx = [],
        loading: projectedLoading = false,
        error: projectedError = null,
        refetch: refetchProjected,
    } = useProjectedTransactionsQuery({ account: filters?.account || undefined, statementPeriod });

    // Flatten server transactions for UI (sorted desc)
    const serverTx = useMemo(() => {
        try {
            const personal = budgetResult.personalTransactions?.transactions || [];
            const joint = budgetResult.jointTransactions?.transactions || [];
            return [...personal, ...joint].sort((a, b) => {
                const da = a?.transactionDate ? new Date(a.transactionDate).getTime() : 0;
                const db = b?.transactionDate ? new Date(b.transactionDate).getTime() : 0;
                return db - da;
            });
        } catch (err) {
            logger.error('compute serverTx failed', err);
            return [];
        }
    }, [budgetResult.personalTransactions, budgetResult.jointTransactions]);

    // Totals & aggregates (guarded by statementPeriod load state for parity with previous behavior)
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
    }, [budgetResult.total, projectedTx, isStatementPeriodLoaded, statementPeriod]);

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

    const loading = Boolean(budgetResult.loading || projectedLoading);
    const error = budgetResult.error || projectedError || null;

    return {
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
    };
}