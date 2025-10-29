import React from 'react';
import './StatementPeriodDropdown.css';
import { useStatementPeriodContext } from '../../context/StatementPeriodProvider';

/**
 * StatementPeriodDropdown.
 * Controlled dropdown using StatementPeriodContext for state/actions.
 * Follows Bulletproof React conventions.
 *
 * @returns {JSX.Element}
 */
export default function StatementPeriodDropdown() {
    const {
        options,
        statementPeriod,
        selectedLabel,
        isOpen,
        isSaving,
        containerRef,
        toggleOpen,
        updateStatementPeriod,
        setIsOpen,
        onButtonKeyDown,
        onOptionKeyDown,
    } = useStatementPeriodContext();

    /**
     * Handles user selection of a statement period.
     * Ensures dropdown closes after select.
     * @function handleSelectPeriod
     * @param {string} value
     */
    const handleSelectPeriod = async (value) => {
        await updateStatementPeriod(value);
        setIsOpen(false); // Ensure dropdown closes after selecting
    };

    return (
        <div className="statement-period-dropdown" ref={containerRef} aria-busy={isSaving}>
            <button
                type="button"
                className="tt-link-btn statement-period-button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={toggleOpen}
                onKeyDown={onButtonKeyDown}
                title="Statement Period"
                disabled={isSaving}
            >
                <span className="tt-icon">📅</span>
                {selectedLabel}
                {isSaving && <span style={{ marginLeft: 8, opacity: 0.8 }}>…saving</span>}
            </button>

            {isOpen && (
                <div className="statement-period-popover" role="listbox" aria-label="Statement periods" tabIndex={-1}>
                    <ul className="statement-period-list" role="presentation">
                        {options.map((opt) => {
                            const isSelected = opt.value === statementPeriod;
                            return (
                                <li key={opt.value} className="statement-period-item">
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        className={`tt-link-btn statement-period-option ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleSelectPeriod(opt.value)}
                                        onKeyDown={(e) => onOptionKeyDown(e, opt.value)}
                                        disabled={isSaving}
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