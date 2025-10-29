/**
 * useTransactionToolbar.js
 *
 * Hook that encapsulates toolbar logic for TransactionTable feature.
 * Responsibilities:
 *  - Orchestrate actions: add transaction, add projection, import file, delete selected.
 *  - Manages loading, file input interactions, selection count, and total display.
 *  - Standardizes logging for traceability.
 *
 * @module useTransactionToolbar
 */

import { useCallback } from 'react';

/**
 * Logger for useTransactionToolbar.
 */
const logger = {
    info: (...args) => console.log('[useTransactionToolbar]', ...args),
    error: (...args) => console.error('[useTransactionToolbar]', ...args),
};

/**
 * useTransactionToolbar
 * Encapsulates toolbar logic for transaction table actions.
 *
 * @function useTransactionToolbar
 * @param {Object} params - Parameters for toolbar actions and state.
 * @param {Function} params.onAdd - Handler for adding a budget transaction.
 * @param {Function} params.onAddProjection - Handler for adding a projected transaction.
 * @param {Function} params.onImport - Handler for importing transactions from file.
 * @param {Function} params.onDelete - Handler for deleting selected transactions.
 * @param {number} params.selectedCount - Number of selected items.
 * @param {Object} params.fileInputRef - Ref for hidden file input.
 * @param {Function} params.onFileChange - Handler for file change event.
 * @param {boolean} params.loading - Flag for loading state.
 * @param {string} params.total - Formatted total string for display.
 * @returns {Object} API surface for TransactionTableToolbar
 */
export function useTransactionToolbar({
                                          onAdd,
                                          onAddProjection,
                                          onImport,
                                          onDelete,
                                          selectedCount,
                                          fileInputRef,
                                          onFileChange,
                                          loading = false,
                                          total,
                                      }) {
    /**
     * Handles add transaction click.
     */
    const handleAdd = useCallback(() => {
        logger.info('Add Transaction clicked');
        onAdd?.();
    }, [onAdd]);

    /**
     * Handles add projection click.
     */
    const handleAddProjection = useCallback(() => {
        logger.info('Add Projection clicked');
        onAddProjection?.();
    }, [onAddProjection]);

    /**
     * Handles import file click.
     */
    const handleImport = useCallback(() => {
        logger.info('Import Transactions clicked');
        onImport?.();
    }, [onImport]);

    /**
     * Handles delete selected click.
     */
    const handleDelete = useCallback(() => {
        logger.info('Delete Selected clicked', { selectedCount });
        onDelete?.();
    }, [onDelete, selectedCount]);

    /**
     * Handles file input change event.
     *
     * @param {Event} event - File input change event.
     */
    const handleFileChange = useCallback((event) => {
        logger.info('File input changed', { files: event.target?.files?.length });
        onFileChange?.(event);
    }, [onFileChange]);

    /**
     * Opens the hidden file picker input.
     */
    const openFilePicker = useCallback(() => {
        logger.info('Opening file picker');
        fileInputRef?.current?.click();
    }, [fileInputRef]);

    return {
        handleAdd,
        handleAddProjection,
        handleImport,
        handleDelete,
        handleFileChange,
        openFilePicker,
        selectedCount,
        loading,
        total,
        fileInputRef,
    };
}

export default useTransactionToolbar;