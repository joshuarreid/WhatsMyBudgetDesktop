/**
 * src/context/StatementPeriodProvider(tanStack).js
 *
 * StatementPeriodProvider migrated to use localStorage for persistence (client-only).
 * - Reads 'currentStatementPeriod' from localStorage ONCE on mount.
 * - Persists updates to localStorage when updateStatementPeriod is called.
 * - Exposes the same context API as the legacy provider so consumers require no changes:
 *   { options, defaultOpt, isOpen, isSaving, containerRef, toggleOpen, onButtonKeyDown,
 *     onOptionKeyDown, setSelectedValue, setIsOpen, statementPeriod, updateStatementPeriod,
 *     selectedLabel, isLoaded }
 *
 * NOTE: Temporary filename contains "(tanStack)" during migration.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import useStatementPeriodDropdown from '../components/statementPeriodDropdown/useStatementPeriodDropdown';

const STORAGE_KEY = 'currentStatementPeriod';

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
 */
const StatementPeriodContext = createContext(undefined);

/**
 * readLocalStatementPeriod
 * - Reads the canonical statementPeriod value from localStorage.
 *
 * @returns {string|null} The cached statementPeriod or null if not present.
 */
function readLocalStatementPeriod() {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return null;
        const v = window.localStorage.getItem(STORAGE_KEY);
        logger.info('readLocalStatementPeriod read', { value: v });
        return v;
    } catch (err) {
        logger.error('readLocalStatementPeriod failed', err);
        return null;
    }
}

/**
 * StatementPeriodProvider (tanStack, localStorage-backed)
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

    // Read cached statementPeriod from localStorage once on mount.
    useEffect(() => {
        let mounted = true;
        try {
            logger.info('Initializing statement period from localStorage');
            const cacheValue = readLocalStatementPeriod();
            if (mounted && cacheValue) {
                setStatementPeriod(cacheValue);
                logger.info('Loaded statementPeriod from localStorage', { cacheValue });
            } else if (mounted) {
                const fallback = dropdown.defaultOpt ? dropdown.defaultOpt.value : '';
                setStatementPeriod(fallback);
                logger.info('No localStorage value, using dropdown defaultOpt', { value: fallback });
            }
        } catch (err) {
            logger.error('Failed to load statementPeriod from localStorage', err);
            if (mounted) {
                const fallback = dropdown.defaultOpt ? dropdown.defaultOpt.value : '';
                setStatementPeriod(fallback);
            }
        } finally {
            if (mounted) setIsLoaded(true);
        }
        return () => {
            mounted = false;
        };
    }, []);

    /**
     * updateStatementPeriod
     * - Updates statement period in context and persists to localStorage.
     * - Does not re-read localStorage after update.
     *
     * @async
     * @function updateStatementPeriod
     * @param {string} value - New statement period value.
     */
    const updateStatementPeriod = useCallback(async (value) => {
        try {
            setStatementPeriod(value);
            if (typeof window !== 'undefined' && window.localStorage) {
                try {
                    window.localStorage.setItem(STORAGE_KEY, String(value));
                    logger.info('Persisted statementPeriod to localStorage', { value });
                } catch (err) {
                    logger.error('Failed to persist statementPeriod to localStorage', err);
                }
            }
        } catch (err) {
            logger.error('updateStatementPeriod failed', err);
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