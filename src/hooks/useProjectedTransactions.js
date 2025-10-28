/**
 * useProjectedTransactions
 *
 * Hook to load projected transactions (either global or account-scoped).
 * Subscribes to TransactionEvents and automatically refetches when projection-related
 * events occur (create/update/delete). Ensures returned transactions are annotated
 * with __isProjected=true so UI can render a visual indicator consistently.
 *
 * @module useProjectedTransactions
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import projectedTransactionService from '../services/ProjectedTransactionService';
import { subscribe } from '../services/TransactionEvents';

const logger = {
    info: (...args) => console.log('[useProjectedTransactions]', ...args),
    error: (...args) => console.error('[useProjectedTransactions]', ...args),
};

/**
 * flattenAccountProjectedList
 * - Utility to convert AccountProjectedTransactionList into a flattened array
 *   (personalTransactions followed by jointTransactions) similar to serverTx merging.
 *
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
 * annotateProjection
 * - Ensure each returned projection has a client-side marker used by the UI.
 *
 * @param {Array} arr
 * @returns {Array}
 */
function annotateProjection(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map((item) => ({ ...(item || {}), __isProjected: true }));
}

/**
 * useProjectedTransactions
 *
 * @param {Object} params - { statementPeriod?: string, account?: string }
 * @returns {{ projectedTx: Array, loading: boolean, error: any, refetch: Function }}
 */
export default function useProjectedTransactions({ statementPeriod, account } = {}) {
    const [projectedTx, setProjectedTx] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // keep a stable ref to params for event handler checks
    const paramsRef = useRef({ statementPeriod, account });
    paramsRef.current = { statementPeriod, account };

    /**
     * fetchProjected
     * - Calls the appropriate projectedTransactionService endpoint.
     *
     * @async
     * @returns {Promise<void>}
     */
    const fetchProjected = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (account) {
                // account-scoped endpoint returns an AccountProjectedTransactionList (personal/joint)
                const acctList = await projectedTransactionService.getTransactionsForAccount({
                    account,
                    statementPeriod,
                });
                const flattened = flattenAccountProjectedList(acctList);
                // annotate and sort by date desc to match table ordering
                const sorted = annotateProjection(Array.isArray(flattened) ? flattened : [])
                    .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
                setProjectedTx(sorted);
                logger.info('fetchProjected (account) success', { account, count: sorted.length });
            } else {
                // generic projections list
                const res = await projectedTransactionService.getTransactions({ statementPeriod });
                const list = res?.transactions || [];
                // annotate and sort
                const sorted = annotateProjection(Array.isArray(list) ? list : [])
                    .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
                setProjectedTx(sorted);
                logger.info('fetchProjected (global) success', { statementPeriod, count: sorted.length });
            }
        } catch (err) {
            logger.error('fetchProjected error', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [account, statementPeriod]);

    // initial fetch + refetch when params change
    useEffect(() => {
        fetchProjected();
    }, [fetchProjected]);

    // subscribe to TransactionEvents so other screens will refetch when projections change.
    useEffect(() => {
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
            } catch (err) {
                logger.error('unsubscribe failed', err);
            }
        };
    }, [fetchProjected]);

    return {
        projectedTx,
        loading,
        error,
        refetch: fetchProjected,
    };
}