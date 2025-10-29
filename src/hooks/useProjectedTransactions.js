/**
 * useProjectedTransactions
 *
 * Custom hook to load projected transactions (either global or account-scoped).
 * Subscribes to TransactionEvents and automatically refetches when projection-related
 * events occur (create/update/delete). Ensures returned transactions are annotated
 * with __isProjected=true for consistent UI rendering.
 *
 * @module useProjectedTransactions
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import projectedTransactionService from '../services/ProjectedTransactionService';
import { subscribe } from '../services/TransactionEvents';

/**
 * Logger for useProjectedTransactions.
 * Logs initialization, API calls, event handling, and errors.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[useProjectedTransactions]', ...args),
    error: (...args) => console.error('[useProjectedTransactions]', ...args),
};

/**
 * Flattens AccountProjectedTransactionList into a single array of transactions.
 * Combines personal and joint transactions for UI consumption.
 *
 * @function flattenAccountProjectedList
 * @param {Object} accountList - The account-scoped projected transaction list.
 * @returns {Array} Flattened array of transactions.
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
 * Annotates an array of transactions with __isProjected: true for UI indicator.
 *
 * @function annotateProjection
 * @param {Array} arr - Array of transactions.
 * @returns {Array} Annotated transactions with __isProjected: true.
 */
function annotateProjection(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map((item) => ({ ...(item || {}), __isProjected: true }));
}

/**
 * useProjectedTransactions
 * Loads projected transactions and manages subscription to projection events.
 *
 * @function useProjectedTransactions
 * @param {Object} params
 * @param {string} [params.statementPeriod] - Optional statement period filter.
 * @param {string} [params.account] - Optional account filter.
 * @returns {Object} {
 *   projectedTx: Array,
 *   loading: boolean,
 *   error: any,
 *   refetch: Function
 * }
 */
export default function useProjectedTransactions({ statementPeriod, account } = {}) {
    /** @type {[Array, Function]} */
    const [projectedTx, setProjectedTx] = useState([]);
    /** @type {[boolean, Function]} */
    const [loading, setLoading] = useState(false);
    /** @type {[any, Function]} */
    const [error, setError] = useState(null);

    // Track the latest statementPeriod requested
    const latestPeriodRef = useRef(statementPeriod);

    // Keep params in ref for event matching
    const paramsRef = useRef({ statementPeriod, account });
    useEffect(() => {
        paramsRef.current = { statementPeriod, account };
    }, [statementPeriod, account]);

    /**
     * Fetches projected transactions from the API.
     * Sets loading and error state, and updates projectedTx if period matches.
     *
     * @async
     * @function fetchProjected
     * @returns {Promise<void>}
     * @throws {Error} On API failure.
     */
    const fetchProjected = useCallback(async () => {
        logger.info('fetchProjected called', { statementPeriod, account });
        setLoading(true);
        setError(null);
        latestPeriodRef.current = statementPeriod;
        try {
            let sorted;
            if (account) {
                const acctList = await projectedTransactionService.getTransactionsForAccount({
                    account,
                    statementPeriod,
                });
                const flattened = flattenAccountProjectedList(acctList);
                sorted = annotateProjection(Array.isArray(flattened) ? flattened : [])
                    .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
            } else {
                const res = await projectedTransactionService.getTransactions({ statementPeriod });
                const list = res?.transactions || [];
                sorted = annotateProjection(Array.isArray(list) ? list : [])
                    .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
            }
            // Only set if period matches latest
            if (statementPeriod === latestPeriodRef.current) {
                setProjectedTx(sorted);
                logger.info('fetchProjected: setProjectedTx', { count: sorted.length });
            } else {
                // Ignore stale response
                logger.info('fetchProjected: Ignored stale data for period', statementPeriod);
            }
        } catch (err) {
            logger.error('fetchProjected error', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [account, statementPeriod]);

    /**
     * Initial fetch and refetch when params change.
     * Side effect: Updates projectedTx.
     */
    useEffect(() => {
        logger.info('useEffect: initial/refetch', { statementPeriod, account });
        fetchProjected();
    }, [fetchProjected]);

    /**
     * Subscribes to TransactionEvents and refetches on relevant projection events.
     * Cleans up subscription on unmount.
     */
    useEffect(() => {
        logger.info('useEffect: subscribe to TransactionEvents');
        const unsubscribe = subscribe((payload = {}) => {
            try {
                // Only react to projection-related events or ambiguous events that affect projections.
                const isProjectionEvent = payload?.type === 'projectionsChanged' || payload?.type === 'transactionsChanged' || payload?.type === 'transactionsChanged:upload';
                if (!isProjectionEvent) return;

                // If payload carries account/statementPeriod info, only refetch when relevant.
                const payloadAccount = payload?.account;
                const payloadStatement = payload?.statementPeriod;

                // If hook was created for a specific account, prefer precise matching:
                if (paramsRef.current.account) {
                    if (payloadAccount && String(payloadAccount) !== String(paramsRef.current.account)) {
                        // event for different account -> ignore
                        logger.info('event ignored: account mismatch', { hookAccount: paramsRef.current.account, payloadAccount });
                        return;
                    }
                }
                if (paramsRef.current.statementPeriod) {
                    if (payloadStatement && String(payloadStatement) !== String(paramsRef.current.statementPeriod)) {
                        // event for different statementPeriod -> ignore
                        logger.info('event ignored: statementPeriod mismatch', { hookStatementPeriod: paramsRef.current.statementPeriod, payloadStatement });
                        return;
                    }
                }

                // Otherwise, refetch
                logger.info('subscription: projection event received; refetching', { payload });
                // Small async tick to let UI settle before refetching (avoids race with immediate writes)
                setTimeout(() => {
                    fetchProjected().catch((err) => {
                        logger.error('subscription: fetchProjected failed', err);
                    });
                }, 50);
            } catch (err) {
                logger.error('subscription handler error', err);
            }
        });

        return () => {
            try {
                unsubscribe();
                logger.info('useEffect: unsubscribed from TransactionEvents');
            } catch (err) {
                logger.error('unsubscribe failed', err);
            }
        };
    }, [fetchProjected]);

    /**
     * API surface for projected transactions.
     * @returns {Object} {
     *   projectedTx: Array of projected transactions,
     *   loading: boolean flag,
     *   error: API or subscription error,
     *   refetch: Function to manually refetch projected transactions
     * }
     */
    return {
        projectedTx,
        loading,
        error,
        refetch: fetchProjected,
    };
}