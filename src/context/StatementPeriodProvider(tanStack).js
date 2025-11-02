/**
 * src/context/StatementPeriodProvider(tanStack).js
 *
 * StatementPeriodProvider migrated to use TanStack Query to load cached statementPeriod once.
 * - Uses useQuery to load local cache value ONCE, with staleTime: Infinity to mimic "read once" behavior.
 * - Maintains updateStatementPeriod to persist to localCacheService when user changes the value.
 *
 * NOTE: Temporary filename contains "(tanStack)" during migration.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import useStatementPeriodDropdown from '../components/statementPeriodDropdown/useStatementPeriodDropdown';
import localCacheService from '../services/LocalCacheService';
import { useQuery } from '@tanstack/react-query';

const logger = {
    info: (...args) => console.log('[StatementPeriodProvider]', ...args),
    error: (...args) => console.error('[StatementPeriodProvider]', ...args),
};

/**
 * StatementPeriodContext
 * - Provides statement period state and actions throughout the app.
 */
const StatementPeriodContext = createContext(undefined);

/**
 * readCachedStatementPeriod
 * - Query function to read the cached currentStatementPeriod value via localCacheService.
 *
 * @returns {Promise<any>}
 */
async function readCachedStatementPeriod() {
    // localCacheService.get may return { cacheValue } or string — keep compatibility.
    return await localCacheService.get('currentStatementPeriod');
}

/**
 * StatementPeriodProvider (tanStack)
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export const StatementPeriodProvider = ({ children }) => {
    const dropdown = useStatementPeriodDropdown();

    // Local canonical statementPeriod and loaded flag
    const [statementPeriod, setStatementPeriod] = useState(undefined);
    const [isLoaded, setIsLoaded] = useState(false);

    // Use react-query to fetch cached statementPeriod ONCE. Set staleTime to Infinity so it won't refetch automatically.
    const query = useQuery({
        queryKey: ['currentStatementPeriod'],
        queryFn: readCachedStatementPeriod,
        staleTime: Infinity,
        cacheTime: Infinity,
        retry: 0,
        onError: (err) => {
            logger.error('StatementPeriodProvider: failed to read cache via query', err);
        },
    });

    // Resolve the cache result into a canonical string value (same logic as previous implementation)
    useEffect(() => {
        if (query.isLoading) {
            // still loading; wait
            return;
        }

        try {
            const res = query.data;
            const cacheValue = res?.cacheValue || res?.value || (typeof res === 'string' ? res : null);
            if (cacheValue) {
                setStatementPeriod(cacheValue);
                logger.info('Loaded statementPeriod from cache (query)', { cacheValue });
            } else {
                // fallback to dropdown default option
                const fallback = dropdown.defaultOpt ? dropdown.defaultOpt.value : '';
                setStatementPeriod(fallback);
                logger.info('No cache, using dropdown defaultOpt', { value: fallback });
            }
        } catch (err) {
            logger.error('Error while resolving cached statementPeriod', err);
            const fallback = dropdown.defaultOpt ? dropdown.defaultOpt.value : '';
            setStatementPeriod(fallback);
        } finally {
            setIsLoaded(true);
        }
        // We intentionally only react to query.isLoading/query.data once; query has staleTime: Infinity.
    }, [query.isLoading, query.data, dropdown.defaultOpt]);

    /**
     * updateStatementPeriod
     * - Persists the new statementPeriod to localCacheService and updates context.
     *
     * @param {string} value
     */
    const updateStatementPeriod = useCallback(async (value) => {
        setStatementPeriod(value);
        try {
            await localCacheService.set('currentStatementPeriod', value);
            logger.info('Persisted statementPeriod to cache', { value });
        } catch (err) {
            logger.error('Failed to persist statementPeriod to cache', err);
        }
    }, []);

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
 * - Consumes the StatementPeriodContext. Throws if used outside provider.
 *
 * @returns {object}
 */
export const useStatementPeriodContext = () => {
    const ctx = useContext(StatementPeriodContext);
    if (!ctx) {
        logger.error('useStatementPeriodContext called outside provider');
        throw new Error('useStatementPeriodContext must be used within StatementPeriodProvider');
    }
    return ctx;
};

export default {
    StatementPeriodProvider,
    useStatementPeriodContext,
};