import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import useStatementPeriodDropdown from '../components/statementPeriodDropdown/useStatementPeriodDropdown';
import localCacheService from '../services/LocalCacheService';

const logger = {
    info: (...args) => console.log('[StatementPeriodProvider]', ...args),
    error: (...args) => console.error('[StatementPeriodProvider]', ...args),
};

const StatementPeriodContext = createContext(undefined);

export const StatementPeriodProvider = ({ children }) => {
    const dropdown = useStatementPeriodDropdown();

    // Start with undefined so we don't show a default period until cache loads
    const [statementPeriod, setStatementPeriod] = useState(undefined);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async function () {
            try {
                const res = await localCacheService.get('currentStatementPeriod');
                const cacheValue = res?.cacheValue || res?.value || (typeof res === 'string' ? res : null);
                if (mounted && cacheValue) {
                    setStatementPeriod(cacheValue);
                    logger.info('Loaded statementPeriod from cache', { cacheValue });
                } else if (mounted) {
                    // If no cache, fall back to dropdown default
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
    }, [dropdown]);

    const updateStatementPeriod = useCallback(async (value) => {
        setStatementPeriod(value);
        try {
            await localCacheService.set('currentStatementPeriod', value);
            logger.info('Persisted statementPeriod to cache', { value });
        } catch (err) {
            logger.error('Failed to persist statementPeriod to cache', err);
        }
    }, []);

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

export const useStatementPeriodContext = () => {
    const ctx = useContext(StatementPeriodContext);
    if (!ctx) {
        logger.error('useStatementPeriodContext called outside provider');
        throw new Error('useStatementPeriodContext must be used within StatementPeriodProvider');
    }
    return ctx;
};