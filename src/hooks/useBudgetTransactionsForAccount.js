import { useEffect, useState, useCallback, useRef } from 'react';
import budgetTransactionService from '../services/BudgetTransactionService';
import { subscribe as subscribeTransactionEvents } from '../services/TransactionEvents';

/**
 * Logger for useBudgetTransactionsForAccount hook.
 */
const logger = {
    info: (...args) => console.log('[useBudgetTransactionsForAccount]', ...args),
    error: (...args) => console.error('[useBudgetTransactionsForAccount]', ...args),
};

/**
 * Fetches only budget transactions for a specific account and filters.
 *
 * @function useBudgetTransactionsForAccount
 * @param {Object} filters - Must include account.
 * @returns {Object} { transactions, count, total, loading, error, refetch }
 * @sideEffects API call to fetch budget transactions, subscribes to transaction events.
 */
export function useBudgetTransactionsForAccount(filters) {
    const [data, setData] = useState({ transactions: [], count: 0, total: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const latestPeriodRef = useRef(filters?.statementPeriod);

    const fetchData = useCallback(async (currentFilters) => {
        setLoading(true);
        setError(null);
        latestPeriodRef.current = currentFilters?.statementPeriod;
        try {
            logger.info('fetchData (budget only) called with filters', currentFilters);
            const result = await budgetTransactionService.getBudgetTransactionsForAccount(currentFilters);
            logger.info('fetchData (budget only) success', {
                count: result.transactions?.length ?? 0,
                total: result.total ?? 0,
            });
            if (currentFilters?.statementPeriod === latestPeriodRef.current) {
                setData({
                    transactions: result.transactions || [],
                    count: result.count || 0,
                    total: result.total || 0,
                });
            } else {
                logger.info('Ignored stale data for period', currentFilters?.statementPeriod);
            }
        } catch (err) {
            logger.error('Error fetching budget-only transactions', err);
            setError('Error: ' + (err && err.message ? err.message : String(err)));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        logger.info('Initializing useBudgetTransactionsForAccount effect with filters', filters);
        fetchData(filters);
    }, [filters, fetchData]);

    useEffect(() => {
        logger.info('Subscribing to transaction events (budget only)');
        const unsub = subscribeTransactionEvents(() => {
            try {
                logger.info('Transaction event received (budget only), refetching...');
                fetchData(filters);
            } catch (err) {
                logger.error('refetch on event failed (budget only)', err);
            }
        });
        return unsub;
    }, [fetchData, filters]);

    const refetch = useCallback(() => fetchData(filters), [fetchData, filters]);
    return { ...data, loading, error, refetch };
}