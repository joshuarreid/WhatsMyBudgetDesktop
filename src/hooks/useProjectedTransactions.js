/**
 * useProjectedTransactions.js
 *
 * Hook to fetch projected transactions for a given statementPeriod/account.
 * Improved diagnostics and tolerant response parsing to help investigate missing
 * projected rows (handles variations in API response shape).
 *
 * Public API:
 *   projectedTx         - Array of projected transaction objects (may be empty)
 *   loading             - boolean fetch-in-progress flag
 *   error               - error object if fetch failed
 *   refetch             - function to re-run the fetch
 *
 * @module useProjectedTransactions
 */

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * NOTE: import the projections service (explicit path).
 */
import projectedTransactionService from "../services/ProjectedTransactionService";

const logger = {
    info: (...args) => console.log("[useProjectedTransactions]", ...args),
    error: (...args) => console.error("[useProjectedTransactions]", ...args),
};

/**
 * @typedef {Object} UseProjectedTransactionsOpts
 * @property {string} statementPeriod - statement period value (e.g. OCTOBER2025). Required to fetch.
 * @property {string} [account] - optional account filter
 */

/**
 * useProjectedTransactions
 *
 * Fetch projected transactions for a statementPeriod (and optional account).
 *
 * Diagnostics & resilience:
 * - Logs network calls and returned payload shape.
 * - Accepts multiple response shapes: { transactions }, { data: { transactions } }, plain array, or { items }.
 * - Marks fetched items with __isProjected:true so UI can render them specially.
 *
 * @param {UseProjectedTransactionsOpts} opts
 * @returns {{ projectedTx: Object[], loading: boolean, error: Error|null, refetch: Function }}
 */
export default function useProjectedTransactions(opts = {}) {
    const { statementPeriod = "", account = "" } = opts;

    const [projectedTx, setProjectedTx] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Keep a ref to the latest params to support refetch()
    const lastParamsRef = useRef({ statementPeriod, account });
    const inflightRef = useRef(0);

    /**
     * normalizePayload
     * Attempts to extract an array of transactions from various server response shapes.
     *
     * @param {any} raw - raw response from service
     * @returns {Array} array of transaction objects
     */
    const normalizePayload = (raw) => {
        if (!raw) return [];
        // Common shapes:
        // 1) { transactions: [...] }
        if (Array.isArray(raw.transactions)) return raw.transactions;
        // 2) { data: { transactions: [...] } } or { data: [...] }
        if (raw.data) {
            if (Array.isArray(raw.data)) return raw.data;
            if (Array.isArray(raw.data.transactions)) return raw.data.transactions;
        }
        // 3) API might return plain array
        if (Array.isArray(raw)) return raw;
        // 4) some backends use "items" or "results"
        if (Array.isArray(raw.items)) return raw.items;
        if (Array.isArray(raw.results)) return raw.results;
        // fallback: try to find first array property
        for (const k of Object.keys(raw)) {
            if (Array.isArray(raw[k])) return raw[k];
        }
        return [];
    };

    /**
     * fetchProjected
     *
     * @param {{statementPeriod:string, account:string}} params
     */
    const fetchProjected = useCallback(
        async (params = { statementPeriod, account }) => {
            const { statementPeriod: sp, account: acc } = params;
            inflightRef.current += 1;
            const reqId = inflightRef.current;
            logger.info("fetchProjected:start", { reqId, statementPeriod: sp, account: acc });

            // If no statementPeriod provided, clear state and return
            if (!sp) {
                logger.info("fetchProjected: no statementPeriod provided — clearing projectedTx");
                setProjectedTx([]);
                setLoading(false);
                setError(null);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // call the dedicated projections service
                const resp = await projectedTransactionService.getTransactions({ statementPeriod: sp, account: acc });
                logger.info("fetchProjected: raw response received", { reqId, preview: resp && (Array.isArray(resp) ? `array(${resp.length})` : Object.keys(resp).slice(0,6)) });

                const txs = normalizePayload(resp);
                logger.info("fetchProjected: normalized transactions count", { reqId, count: txs.length });

                // Ensure we don't stomp state with out-of-order responses:
                if (reqId < inflightRef.current) {
                    logger.info("fetchProjected: ignoring out-of-order response", { reqId, inflight: inflightRef.current });
                    return;
                }

                // Mark as projected and coerce numeric amounts
                const marked = txs.map((t) => ({
                    ...t,
                    __isProjected: true,
                    // normalize amount to number if possible
                    amount: t == null ? 0 : (t.amount == null ? 0 : Number(t.amount)),
                }));

                setProjectedTx(marked);
                setError(null);
                logger.info("fetchProjected: success", { reqId, returned: marked.length });
            } catch (err) {
                logger.error("fetchProjected: failed", { reqId, err });
                setError(err);
                setProjectedTx([]);
            } finally {
                // Only clear loading if this is the latest request
                if (reqId === inflightRef.current) setLoading(false);
            }
        },
        [statementPeriod, account]
    );

    // Fetch initially and whenever statementPeriod/account change
    useEffect(() => {
        const params = { statementPeriod, account };
        lastParamsRef.current = params;
        void fetchProjected(params).catch((err) => {
            logger.error("useProjectedTransactions: unexpected fetch error", err);
        });
    }, [statementPeriod, account, fetchProjected]);

    const refetch = useCallback(() => {
        const params = lastParamsRef.current || { statementPeriod, account };
        return fetchProjected(params);
    }, [fetchProjected, statementPeriod, account]);

    return {
        projectedTx,
        loading,
        error,
        refetch,
    };
}