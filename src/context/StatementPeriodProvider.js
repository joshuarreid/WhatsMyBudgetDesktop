/**
 * StatementPeriodProvider
 * - Context provider for statement period selection and persistence.
 * - Uses a small custom hook (useLocalCacheQuery) wrapping TanStack Query to read the
 *   cache ONCE on mount, then only persists on user change.
 *
 * Notes:
 * - Provider remains authoritative once initialized (prevents "flashback" bugs).
 * - isLoaded is set when initial cache read settles (success or error).
 *
 * @module context/StatementPeriodProvider
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import useStatementPeriodDropdown from '../components/statementPeriodDropdown/useStatementPeriodDropdown';
import { useLocalCacheByKey, useSaveLocalCache } from '../hooks/useLocalCacheQuery';

/**
 * Logger for StatementPeriodProvider
 * @constant
 */
const logger = {
    info: (...args) => console.log('[StatementPeriodProvider]', ...args),
    error: (...args) => console.error('[StatementPeriodProvider]', ...args),
};

/**
 * StatementPeriodContext
 * - Provides statement period state and actions throughout the app.
 * @type {React.Context}
 */
const StatementPeriodContext = createContext(undefined);

/**
 * @constant {string} CACHE_KEY - local cache key used to persist the current statement period.
 */
const CACHE_KEY = 'currentStatementPeriod';

/**
 * StatementPeriodProvider
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Child nodes to render within context provider.
 * @returns {JSX.Element}
 */
export const StatementPeriodProvider = ({ children }) => {
    const dropdown = useStatementPeriodDropdown();

    /**
     * Canonical statementPeriod held in provider. undefined until initial load attempt completes.
     * @type {[string|undefined, Function]}
     */
    const [statementPeriod, setStatementPeriod] = useState(undefined);

    /**
     * Loading flag set true after the cache read attempt settles (success or error).
     * @type {[boolean, Function]}
     */
    const [isLoaded, setIsLoaded] = useState(false);

    // Use the encapsulated query hook to read normalized cache value (string|null)
    const cacheQuery = useLocalCacheByKey(CACHE_KEY, {
        // Keep defaults but enabled true explicitly for clarity
        enabled: true,
    });

    // Use the encapsulated mutation hook to save/update cache entries
    const saveMutation = useSaveLocalCache(CACHE_KEY);

    /**
     * Apply the query result to local provider state ONCE:
     * - Only set the canonical statementPeriod when provider has not yet set it
     *   (statementPeriod === undefined). This enforces "read once on mount".
     * - If the query errors or returns no useful value, fall back to dropdown.defaultOpt.
     *
     * We also set isLoaded true once the query has settled (either fetched or errored).
     */
    useEffect(() => {
        if (statementPeriod !== undefined) {
            // canonical value already set; do not re-apply cache reads
            return;
        }

        if (cacheQuery.isFetched) {
            try {
                const cacheValue = cacheQuery.data; // normalized string|null from the hook
                if (cacheValue) {
                    setStatementPeriod(cacheValue);
                    logger.info('Initialized statementPeriod from cache (hook)', { cacheValue });
                } else {
                    const fallback = dropdown.defaultOpt ? dropdown.defaultOpt.value : '';
                    setStatementPeriod(fallback);
                    logger.info('No cache entry found - using dropdown default', { value: fallback });
                }
            } catch (err) {
                logger.error('Error applying cache query result to state', err);
                const fallback = dropdown.defaultOpt ? dropdown.defaultOpt.value : '';
                setStatementPeriod(fallback);
                logger.info('Falling back to dropdown default after cache apply error', { value: fallback });
            } finally {
                setIsLoaded(true);
            }
        } else if (cacheQuery.isError) {
            const fallback = dropdown.defaultOpt ? dropdown.defaultOpt.value : '';
            setStatementPeriod(fallback);
            setIsLoaded(true);
            logger.error('Cache query failed; falling back to dropdown default', cacheQuery.error);
        }
        // Dependencies intentionally limited: we only care about the query state and dropdown default when statementPeriod is unset
    }, [cacheQuery.isFetched, cacheQuery.isError, cacheQuery.data, cacheQuery.error, dropdown.defaultOpt, statementPeriod]);

    /**
     * updateStatementPeriod
     * - Updates statementPeriod in provider state immediately and persists it via mutation.
     * - Does not re-read the cache after update; it writes and seeds the query cache via the mutation hook.
     *
     * @async
     * @param {string} value - New statement period value.
     */
    const updateStatementPeriod = useCallback(
        async (value) => {
            setStatementPeriod(value);
            try {
                await saveMutation.mutateAsync(value);
                logger.info('updateStatementPeriod: mutation completed', { value });
            } catch (err) {
                logger.error('updateStatementPeriod: persist failed', err);
            }
        },
        [saveMutation]
    );

    /**
     * selectedLabel
     * - Derives the UI label for the current statementPeriod value.
     *
     * @type {string}
     */
    const selectedLabel = useMemo(() => {
        const found = dropdown.options.find((o) => o.value === statementPeriod);
        return found ? found.label : statementPeriod || '';
    }, [dropdown.options, statementPeriod]);

    return (
        <StatementPeriodContext.Provider
            value={{
                ...dropdown,
                statementPeriod,
                updateStatementPeriod,
                selectedLabel,
                isLoaded,
            }}
        >
            {children}
        </StatementPeriodContext.Provider>
    );
};

/**
 * useStatementPeriodContext
 * - Consumes StatementPeriodContext and throws if used outside provider.
 *
 * @returns {object} statement period context value
 * @throws {Error} If used outside StatementPeriodProvider
 */
export const useStatementPeriodContext = () => {
    const ctx = useContext(StatementPeriodContext);
    if (!ctx) {
        logger.error('useStatementPeriodContext called outside provider');
        throw new Error('useStatementPeriodContext must be used within StatementPeriodProvider');
    }
    return ctx;
};

export default StatementPeriodProvider;