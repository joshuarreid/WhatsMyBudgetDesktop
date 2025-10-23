import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

import './StatementPeriodDropdown.css';
import {generateOptions, getCurrentOption} from "../../services/StatementPeriodService";

const logger = {
    info: (...args) => console.log('[StatementPeriodDropdown]', ...args),
    error: (...args) => console.error('[StatementPeriodDropdown]', ...args),
};

/**
 * UI-only StatementPeriodDropdown (Step 1)
 *
 * Props:
 *  - onChange(value) optional callback invoked when selection changes (for future wiring)
 *
 * Notes:
 *  - Local-only state (no server calls)
 *  - Accessible basics: role=listbox/option, aria-selected, Enter/Space/Escape
 *  - Arrow navigation & focus management left for later steps
 */
export default function StatementPeriodDropdown({ onChange = null }) {
    const options = useMemo(() => generateOptions({ prev: 1, forward: 5 }), []);
    const defaultOpt = useMemo(() => getCurrentOption(options), [options]);

    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(defaultOpt ? defaultOpt.value : '');
    const containerRef = useRef(null);

    useEffect(() => {
        logger.info('mount', { defaultValue: defaultOpt && defaultOpt.value });
        return () => logger.info('unmount');
    }, [defaultOpt]);

    // close on outside click
    useEffect(() => {
        function onDocMouseDown(e) {
            if (!isOpen) return;
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                logger.info('closed via outside click');
            }
        }
        window.addEventListener('mousedown', onDocMouseDown);
        return () => window.removeEventListener('mousedown', onDocMouseDown);
    }, [isOpen]);

    const toggleOpen = useCallback((ev) => {
        ev?.preventDefault();
        setIsOpen((s) => {
            const next = !s;
            logger.info('toggle', { open: next });
            return next;
        });
    }, []);

    const handleSelect = useCallback(
        (value) => {
            const prev = selectedValue;
            setSelectedValue(value);
            setIsOpen(false);
            logger.info('select', { oldValue: prev, newValue: value });
            try {
                if (typeof onChange === 'function') onChange(value);
            } catch (err) {
                logger.error('onChange callback failed', err);
            }
        },
        [selectedValue, onChange]
    );

    const onButtonKeyDown = useCallback((e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((s) => !s);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    }, []);

    const onOptionKeyDown = useCallback((e, value) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSelect(value);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    }, [handleSelect]);

    const selectedLabel = useMemo(() => {
        const found = options.find((o) => o.value === selectedValue);
        return found ? found.label : selectedValue || 'SELECT PERIOD';
    }, [options, selectedValue]);

    return (
        <div className="statement-period-dropdown" ref={containerRef}>
            <button
                type="button"
                className="tt-link-btn statement-period-button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={toggleOpen}
                onKeyDown={onButtonKeyDown}
                title="Statement Period"
            >
                <span className="tt-icon">📅</span>
                {selectedLabel}
            </button>

            {isOpen && (
                <div
                    className="statement-period-popover"
                    role="listbox"
                    aria-label="Statement periods"
                    tabIndex={-1}
                >
                    <ul className="statement-period-list" role="presentation">
                        {options.map((opt) => {
                            const isSelected = opt.value === selectedValue;
                            return (
                                <li key={opt.value} className="statement-period-item">
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        className={`tt-link-btn statement-period-option ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleSelect(opt.value)}
                                        onKeyDown={(e) => onOptionKeyDown(e, opt.value)}
                                    >
                                        <span className="statement-period-label">{opt.label}</span>
                                        <span className="statement-period-check" aria-hidden="true">
                      {isSelected ? '✔' : ''}
                    </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}

StatementPeriodDropdown.propTypes = {
    onChange: PropTypes.func,
};