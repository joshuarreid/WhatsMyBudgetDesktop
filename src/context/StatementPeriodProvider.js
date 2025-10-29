import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import useStatementPeriodDropdown from '../components/statementPeriodDropdown/useStatementPeriodDropdown';
import localCacheService from '../services/LocalCacheService';

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
 * StatementPeriodProvider
 * - Context provider for statement period selection and persistence.
 * - Reads cache ONCE on mount, then only persists on user change.
 * - Prevents flashback bugs by never re-reading cache after initial load.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Child nodes to render within context provider.
 * @returns {JSX.Element}
 */
export const StatementPeriodProvider = ({ children }) => {
    const dropdown = useStatementPeriodDropdown();

    // State for canonical statement period value. Starts undefined until cache loads.
    const [statementPeriod, setStatementPeriod] = useState(undefined);
    // State for loading status of cache/context.
    const [isLoaded, setIsLoaded] = useState(false);

    /**
     * Loads statement period from local cache ONCE on mount.
     * Never re-reads after initial load.
     * Sets isLoaded to true after first attempt.
     */
    useEffect(() => {
        let mounted = true;
        (async function () {
            try {
                logger.info('Initializing statement period from cache');
                const res = await localCacheService.get('currentStatementPeriod');
                const cacheValue = res?.cacheValue || res?.value || (typeof res === 'string' ? res : null);
                if (mounted && cacheValue) {
                    setStatementPeriod(cacheValue);
                    logger.info('Loaded statementPeriod from cache', { cacheValue });
                } else if (mounted) {
                    setStatementPeriod(dropdown.defaultOpt ? dropdown.defaultOpt.value : '');
                    logger.info('No cache, using dropdown defaultOpt', { value: dropdown.defaultOpt?.value });
                }
            } catch (err) {
                logger.error('Failed to load statementPeriod from cache', err);
                if (mounted) {
                    setStatementPeriod(dropdown.defaultOpt ? dropdown.defaultOpt.value : '');
                }
            } finally {
                setIsLoaded(true);
            }
        })();
        return () => { mounted = false; };
    }, []);

    /**
     * updateStatementPeriod
     * - Updates statement period in context and persists to cache.
     * - Does not re-read cache after update.
     *
     * @async
     * @function updateStatementPeriod
     * @param {string} value - New statement period value.
     */
    const updateStatementPeriod = useCallback(
        /**
         * @param {string} value
         */
        async (value) => {
            setStatementPeriod(value);
            try {
                await localCacheService.set('currentStatementPeriod', value);
                logger.info('Persisted statementPeriod to cache', { value });
            } catch (err) {
                logger.error('Failed to persist statementPeriod to cache', err);
            }
        },
        []
    );

    /**
     * selectedLabel
     * - Returns label for the current statement period value.
     * @returns {string}
     */
    const selectedLabel = (() => {
        const found = dropdown.options.find((o) => o.value === statementPeriod);
        return found ? found.label : statementPeriod || '';
    })();

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
 * - Consumes the StatementPeriodContext.
 * - Throws if used outside provider.
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