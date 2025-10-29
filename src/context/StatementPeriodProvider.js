import React, { createContext, useContext } from 'react';
import useStatementPeriodDropdown from '../components/statementPeriodDropdown/useStatementPeriodDropdown';

const logger = {
    info: (...args) => console.log('[StatementPeriodProvider]', ...args),
    error: (...args) => console.error('[StatementPeriodProvider]', ...args),
};

/**
 * StatementPeriodContext.
 * Context for managing statement period dropdown state and actions.
 * @type {React.Context}
 */
const StatementPeriodContext = createContext(undefined);

/**
 * StatementPeriodProvider.
 * Wraps children and provides statement period context.
 *
 * @function StatementPeriodProvider
 * @param {object} props
 * @param {React.ReactNode} props.children - Child nodes to render within context provider.
 * @returns {JSX.Element}
 */
export const StatementPeriodProvider = ({ children }) => {
    logger.info('StatementPeriodProvider initialized');
    const dropdown = useStatementPeriodDropdown();

    return (
        <StatementPeriodContext.Provider value={dropdown}>
            {children}
        </StatementPeriodContext.Provider>
    );
};

/**
 * useStatementPeriodContext.
 * Consumes the StatementPeriodContext.
 *
 * @function useStatementPeriodContext
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