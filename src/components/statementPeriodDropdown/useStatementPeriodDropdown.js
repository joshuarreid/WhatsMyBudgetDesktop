import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { generateOptions, getCurrentOption } from "../../services/StatementPeriodService";

const logger = {
    info: (...args) => console.log('[useStatementPeriodDropdown]', ...args),
    error: (...args) => console.error('[useStatementPeriodDropdown]', ...args),
};

/**
 * useStatementPeriodDropdown.
 * Generates dropdown options, manages open/close, saving state, and keyboard logic.
 * Does NOT own selectedValue; expects it to be managed by provider/context.
 *
 * @param {object} [params]
 * @param {number} [params.prev=1]
 * @param {number} [params.forward=5]
 * @param {Date} [params.anchor=new Date()]
 * @returns {object} Dropdown state/actions for UI consumption.
 */
export default function useStatementPeriodDropdown({ prev = 1, forward = 5, anchor = new Date() } = {}) {
    const options = useMemo(() => generateOptions({ anchor, prev, forward }), [anchor, prev, forward]);
    const defaultOpt = useMemo(() => getCurrentOption(options), [options]);

    // Only open/close, saving, and UI refs are managed here
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const containerRef = useRef(null);

    /**
     * Toggles dropdown open/closed.
     * @function toggleOpen
     * @param {Event} [ev]
     */
    const toggleOpen = useCallback((ev) => {
        ev?.preventDefault();
        setIsOpen((s) => !s);
        logger.info('toggleOpen called', { isOpen: !isOpen });
    }, [isOpen]);

    /**
     * Handles keyboard events for dropdown button.
     *
     * @function onButtonKeyDown
     * @param {KeyboardEvent} e
     */
    const onButtonKeyDown = useCallback((e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((s) => !s);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    }, []);

    /**
     * Handles keyboard events for dropdown options.
     *
     * @function onOptionKeyDown
     * @param {KeyboardEvent} e
     * @param {string} value
     */
    const onOptionKeyDown = useCallback((e, value) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Consumer should call updateStatementPeriod(value)
            setIsOpen(false);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    }, []);

    /**
     * setSelectedValue
     * Allows provider to update selected value and trigger UI refresh if needed.
     * @param {string} value
     */
    const setSelectedValue = useCallback((value) => {
        // No-op here; provider owns the canonical value
        logger.info('setSelectedValue called (noop in dropdown hook)', { value });
    }, []);

    return {
        options,
        defaultOpt,
        isOpen,
        isSaving,
        containerRef,
        toggleOpen,
        onButtonKeyDown,
        onOptionKeyDown,
        setSelectedValue,
        setIsOpen,
    };
}