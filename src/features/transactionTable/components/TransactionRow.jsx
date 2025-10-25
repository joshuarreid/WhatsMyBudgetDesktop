const logger = {
    info: (...args) => console.log('[TransactionRow]', ...args),
    error: (...args) => console.error('[TransactionRow]', ...args),
};

import React, { useEffect, useState, useMemo, useRef } from "react";
import PropTypes from "prop-types";
// Use centralized config helpers instead of reading the JSON file directly.
import { getCategories, getCriticalityForCategory, get as getConfig } from '../../../config/config.ts';

/**
 * TransactionRow
 *
 * - Renders Save / Cancel / Save and add another buttons while in whole-row edit mode.
 * - Calls onSaveRow(id, normalized, addAnother) when saving.
 * - Autofills category suggestions from config categories as user types.
 * - When a category is selected (or focus leaves the category input), it will set the mapped
 *   criticality for that category (if mapping exists) for row-edit mode; for single-field edits
 *   it will attempt to save both category and mapped criticality via onSaveEdit.
 *
 * Notes:
 * - Suggestions are simple and in-component. For a larger app consider extracting an Autocomplete component
 *   or using a battle-tested library (Downshift, Combobox from Radix).
 * - Logging added to help diagnose interactions.
 */

const DEFAULT_CRITICALITY_OPTIONS = ["Essential", "Nonessential"];
const CRITICALITY_OPTIONS = (() => {
    try {
        const cfg = getConfig('criticalityOptions');
        if (Array.isArray(cfg) && cfg.length > 0) return cfg.map(String);
        logger.info('TransactionRow: criticalityOptions not found; using defaults', { fallback: DEFAULT_CRITICALITY_OPTIONS });
        return DEFAULT_CRITICALITY_OPTIONS;
    } catch (err) {
        logger.error('TransactionRow: failed to read criticalityOptions from config; using defaults', err);
        return DEFAULT_CRITICALITY_OPTIONS;
    }
})();
const DEFAULT_CRITICALITY = CRITICALITY_OPTIONS[0] || "Essential";

export default function TransactionRow({
                                           tx,
                                           selected,
                                           onSelect,
                                           editing,
                                           editValueRef,
                                           onCellDoubleClick,
                                           onEditKey,
                                           onSaveEdit,
                                           onSaveRow, // now supports third param addAnother (boolean)
                                           onCancelRow, // NEW: provided by parent hook to remove local new rows
                                           toInputDate,
                                           setEditing,
                                           savingIds = new Set(),
                                           saveErrors = {},
                                           startEditingRow,
                                       }) {
    const isFieldEditing = (field) => editing && editing.id === tx.id && editing.mode === 'field' && editing.field === field;
    const isRowEditing = editing && editing.id === tx.id && editing.mode === 'row';
    const isSaving = savingIds && savingIds.has(tx.id);
    const inlineError = saveErrors && saveErrors[tx.id];

    // load configured categories once
    const ALL_CATEGORIES = useMemo(() => {
        try {
            const cats = getCategories() || [];
            logger.info('TransactionRow: loaded categories', { count: cats.length, sample: cats.slice(0, 6) });
            return cats;
        } catch (err) {
            logger.error('TransactionRow: failed to load categories', err);
            return [];
        }
    }, []);

    const IS_CATEGORY_DROPDOWN = Array.isArray(ALL_CATEGORIES) && ALL_CATEGORIES.length > 0;

    // local draft state used only when editing the whole row
    const [draft, setDraft] = useState(() => ({ ...tx }));

    // suggestion state for category autocomplete (used only when NOT using dropdown)
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);

    // ref to category input to manage focus/keyboard
    const categoryInputRef = useRef(null);

    // keep draft in sync when tx changes and not currently editing row
    useEffect(() => {
        if (!isRowEditing) {
            // ensure new tx gets default criticality if missing (prefer category-derived)
            if (tx?.__isNew && (tx.criticality == null || String(tx.criticality).trim() === '')) {
                const derived = getCriticalityForCategory(tx.category) || DEFAULT_CRITICALITY;
                setDraft({ ...tx, criticality: derived });
            } else {
                setDraft({ ...tx });
            }
        }
    }, [tx.id, tx, isRowEditing]);

    // debug: log when row mounts / tx changes
    useEffect(() => {
        try {
            logger.info('render row', {
                id: tx?.id ?? null,
                __isNew: !!tx?.__isNew,
                date: tx?.transactionDate ?? null,
                editing: editing ? (editing.id === tx.id ? editing.mode : false) : false,
                isSaving,
            });
        } catch (err) {
            logger.error('row logging failed', err);
        }
    }, [tx, editing, isSaving]);

    const updateDraft = (field, value) => {
        setDraft((prev) => ({ ...prev, [field]: value }));
    };

    // --- Category suggestion helpers (only used when no categories configured) ---
    const filterCategories = (q) => {
        if (!q) return ALL_CATEGORIES.slice(0, 8);
        const lower = String(q).toLowerCase();
        return ALL_CATEGORIES
            .filter((c) => String(c).toLowerCase().includes(lower))
            .slice(0, 8);
    };

    const hideSuggestions = () => {
        setShowSuggestions(false);
        setHighlightIndex(-1);
    };

    const handleSelectCategoryForRow = (value) => {
        try {
            logger.info('category suggestion selected (row)', { txId: tx.id, category: value });
            updateDraft('category', value);
            // set mapped criticality if available
            const mapped = getCriticalityForCategory(value);
            if (mapped) {
                logger.info('mapped criticality applied (row)', { txId: tx.id, category: value, criticality: mapped });
                updateDraft('criticality', mapped);
            }
        } catch (err) {
            logger.error('handleSelectCategoryForRow failed', err);
        } finally {
            hideSuggestions();
            // keep focus on category input after select so user can continue
            categoryInputRef.current?.focus();
        }
    };

    const handleSelectCategoryForFieldEdit = async (value) => {
        try {
            logger.info('category suggestion selected (field)', { txId: tx.id, category: value });
            // update editValueRef so the input shows the selected value
            editValueRef.current = value;
            // save the category field
            if (typeof onSaveEdit === 'function') {
                await onSaveEdit(tx.id, 'category', value);
            }
            // set criticality if mapped (attempt to save it too)
            const mapped = getCriticalityForCategory(value);
            if (mapped) {
                logger.info('mapped criticality applied (field)', { txId: tx.id, category: value, criticality: mapped });
                if (typeof onSaveEdit === 'function') {
                    // attempt to persist criticality as a separate single-field save
                    await onSaveEdit(tx.id, 'criticality', mapped);
                }
            }
        } catch (err) {
            logger.error('handleSelectCategoryForFieldEdit failed', err);
        } finally {
            hideSuggestions();
        }
    };

    // Called when the category input (row edit) loses focus: ensure suggestions close and mapped criticality applied
    const handleCategoryBlurForRow = (ev) => {
        // small timeout to allow click on suggestion (mousedown handlers handle selection)
        setTimeout(() => {
            try {
                hideSuggestions();
                const categoryVal = draft.category;
                if (categoryVal) {
                    const mapped = getCriticalityForCategory(categoryVal);
                    if (mapped && mapped !== draft.criticality) {
                        logger.info('apply mapped criticality on blur (row)', { txId: tx.id, category: categoryVal, criticality: mapped });
                        updateDraft('criticality', mapped);
                    }
                }
            } catch (err) {
                logger.error('handleCategoryBlurForRow failed', err);
            }
        }, 150);
    };

    // For field-level editing: on blur save the category and apply mapped criticality (if any)
    const handleCategoryBlurForField = async (ev) => {
        try {
            const val = String(editValueRef.current ?? '').trim();
            if (val === '') {
                // nothing to save
                hideSuggestions();
                return;
            }
            hideSuggestions();
            // first persist category
            if (typeof onSaveEdit === 'function') {
                logger.info('field edit category blur: saving category', { txId: tx.id, category: val });
                await onSaveEdit(tx.id, 'category', val);
            }
            // then derive and persist criticality if mapped
            const mapped = getCriticalityForCategory(val);
            if (mapped) {
                logger.info('field edit category blur: saving mapped criticality', { txId: tx.id, category: val, criticality: mapped });
                if (typeof onSaveEdit === 'function') {
                    await onSaveEdit(tx.id, 'criticality', mapped);
                }
            }
        } catch (err) {
            logger.error('handleCategoryBlurForField failed', err);
        }
    };

    // --- Rendering helpers (field inputs) ---
    const renderFieldInput = (field, props = {}) => {
        if (field === "amount") {
            return (
                <input
                    className="tt-input tt-input-number"
                    type="number"
                    step="0.01"
                    autoFocus
                    defaultValue={String(tx.amount)}
                    onChange={(e) => (editValueRef.current = e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") onSaveEdit(tx.id, field, editValueRef.current);
                        else if (e.key === "Escape") setEditing(null);
                        else onEditKey(e, tx.id, field);
                    }}
                    {...props}
                />
            );
        }

        if (field === "transactionDate") {
            return (
                <input
                    className="tt-input"
                    type="date"
                    autoFocus
                    defaultValue={toInputDate(tx.transactionDate)}
                    onChange={(e) => (editValueRef.current = e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") onSaveEdit(tx.id, field, editValueRef.current);
                        else if (e.key === "Escape") setEditing(null);
                        else onEditKey(e, tx.id, field);
                    }}
                    {...props}
                />
            );
        }

        if (field === "criticality") {
            // Field-level editing uses editValueRef for value transfer (consistent with other fields)
            const dv = (tx.criticality && String(tx.criticality)) ? tx.criticality : DEFAULT_CRITICALITY;
            return (
                <select
                    className="tt-input"
                    autoFocus
                    defaultValue={dv}
                    onChange={(e) => (editValueRef.current = e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") onSaveEdit(tx.id, field, editValueRef.current);
                        else if (e.key === "Escape") setEditing(null);
                        else onEditKey(e, tx.id, field);
                    }}
                    {...props}
                >
                    {CRITICALITY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );
        }

        // Category field-level input: if config supplies categories render a dropdown, otherwise the previous autocomplete textbox
        if (field === "category") {
            const initial = (tx.category ?? '');
            if (IS_CATEGORY_DROPDOWN) {
                // render select for field edit — persist immediately on change and also persist mapped criticality
                return (
                    <select
                        className="tt-input"
                        autoFocus
                        defaultValue={initial}
                        onChange={async (e) => {
                            const val = e.target.value;
                            editValueRef.current = val;
                            // persist category immediately
                            if (typeof onSaveEdit === 'function') {
                                try {
                                    await onSaveEdit(tx.id, 'category', val);
                                } catch (err) {
                                    logger.error('failed to save category on select change', err);
                                }
                            }
                            // persist mapped criticality if present
                            const mapped = getCriticalityForCategory(val);
                            if (mapped && typeof onSaveEdit === 'function') {
                                try {
                                    await onSaveEdit(tx.id, 'criticality', mapped);
                                } catch (err) {
                                    logger.error('failed to save mapped criticality on select change', err);
                                }
                            }
                            setEditing(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                // handled by onChange already
                            } else if (e.key === "Escape") setEditing(null);
                            else onEditKey(e, tx.id, field);
                        }}
                        {...props}
                    >
                        <option value="">{/* allow empty selection */}</option>
                        {ALL_CATEGORIES.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            }

            // fallback: freeform input with suggestions (previous behavior)
            return (
                <div style={{ position: 'relative' }}>
                    <input
                        ref={categoryInputRef}
                        className="tt-input"
                        autoFocus
                        defaultValue={initial}
                        onChange={(e) => {
                            editValueRef.current = e.target.value;
                            const q = e.target.value;
                            const matched = filterCategories(q);
                            setSuggestions(matched);
                            setShowSuggestions(matched.length > 0);
                        }}
                        onBlur={handleCategoryBlurForField}
                        onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                await onSaveEdit(tx.id, 'category', editValueRef.current);
                                // apply mapped criticality on Enter as well
                                const mapped = getCriticalityForCategory(editValueRef.current);
                                if (mapped) {
                                    await onSaveEdit(tx.id, 'criticality', mapped);
                                }
                                setEditing(null);
                            } else if (e.key === "Escape") {
                                setEditing(null);
                            } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setHighlightIndex((i) => Math.max(i - 1, 0));
                            } else if (e.key === 'Tab') {
                                // let blur handler run
                            } else {
                                onEditKey(e, tx.id, field);
                            }
                        }}
                        {...props}
                    />
                    {showSuggestions && suggestions.length > 0 && (
                        <div
                            role="listbox"
                            aria-label="Category suggestions"
                            style={{
                                position: 'absolute',
                                zIndex: 2000,
                                background: 'white',
                                border: '1px solid rgba(0,0,0,0.12)',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                width: '100%',
                                maxHeight: 220,
                                overflowY: 'auto',
                                marginTop: 6,
                            }}
                        >
                            {suggestions.map((opt, idx) => (
                                <div
                                    key={opt}
                                    role="option"
                                    aria-selected={idx === highlightIndex}
                                    onMouseDown={(ev) => {
                                        // prevent blur before click handled
                                        ev.preventDefault();
                                        handleSelectCategoryForFieldEdit(opt);
                                    }}
                                    onMouseEnter={() => setHighlightIndex(idx)}
                                    style={{
                                        padding: '6px 8px',
                                        background: idx === highlightIndex ? 'rgba(0,0,0,0.04)' : 'white',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {opt}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        // default text input
        return (
            <input
                className="tt-input"
                autoFocus
                defaultValue={tx[field]}
                onChange={(e) => (editValueRef.current = e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") onSaveEdit(tx.id, field, editValueRef.current);
                    else if (e.key === "Escape") setEditing(null);
                    else onEditKey(e, tx.id, field);
                }}
                {...props}
            />
        );
    };

    // Save whole-row (explicit Save). addAnother = boolean indicates "save and add another"
    const onSaveRowClick = (addAnother = false) => {
        // normalize date input if needed (if transactionDate is in yyyy-mm-dd)
        const normalized = { ...draft };
        if (normalized.transactionDate && normalized.transactionDate.length === 10) {
            // assume yyyy-mm-dd -> convert to ISO
            normalized.transactionDate = new Date(normalized.transactionDate).toISOString();
        }
        // ensure criticality is normalized to an allowed option
        const s = normalized.criticality;
        if (s == null || String(s).trim() === '') {
            normalized.criticality = DEFAULT_CRITICALITY;
        } else {
            const exact = CRITICALITY_OPTIONS.find((o) => String(o).toLowerCase() === String(s).toLowerCase());
            normalized.criticality = exact || DEFAULT_CRITICALITY;
        }
        onSaveRow(tx.id, normalized, addAnother);
    };

    const onCancelRowLocal = () => {
        // If parent provided a cancel handler (useTransactionTable.handleCancelRow),
        // call it (it will remove local new rows). Otherwise fallback to existing behavior.
        try {
            if (onCancelRow && typeof onCancelRow === 'function') {
                onCancelRow(tx.id);
            } else {
                setEditing(null);
                setDraft({ ...tx });
                logger.info('cancel row edit (local fallback)', { id: tx.id });
            }
        } catch (err) {
            logger.error('onCancelRow handler failed', err);
            // fallback behaviour
            setEditing(null);
            setDraft({ ...tx });
        }
    };

    const onStartRowEdit = () => {
        startEditingRow(tx.id);
        setDraft({ ...tx });
    };

    // --- Render ---
    return (
        <div className={`tt-row${selected ? " tt-row-selected" : ""}`} key={tx.id}>
            <div className="tt-checkbox-col">
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={onSelect}
                    aria-label={`Select transaction ${tx.name || tx.id}`}
                />
            </div>

            {/* Name */}
            <div className="tt-cell" title="Double click to edit">
                {isFieldEditing("name") ? (
                    <>
                        {renderFieldInput("name")}
                        {inlineError && <div style={{ color: '#ff8a8a', marginTop: 6 }}>{inlineError}</div>}
                    </>
                ) : isRowEditing ? (
                    <>
                        <input
                            className="tt-input"
                            autoFocus
                            value={draft.name || ''}
                            onChange={(e) => updateDraft('name', e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onSaveRowClick();
                                if (e.key === 'Escape') onCancelRowLocal();
                            }}
                        />
                    </>
                ) : (
                    <div onDoubleClick={() => onCellDoubleClick(tx, "name")}>{tx.name}</div>
                )}
            </div>

            {/* Amount */}
            <div className="tt-cell tt-amount" title="Double click to edit" style={{ textAlign: "right" }}>
                {isFieldEditing("amount") ? (
                    <>
                        {renderFieldInput("amount")}
                        {inlineError && <div style={{ color: '#ff8a8a', marginTop: 6 }}>{inlineError}</div>}
                    </>
                ) : isRowEditing ? (
                    <>
                        <input
                            className="tt-input tt-input-number"
                            type="number"
                            step="0.01"
                            value={draft.amount ?? 0}
                            onChange={(e) => updateDraft('amount', e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onSaveRowClick();
                                if (e.key === 'Escape') onCancelRowLocal();
                            }}
                            style={{ textAlign: 'right' }}
                        />
                    </>
                ) : (
                    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(tx.amount) || 0)
                )}
            </div>

            {/* Category */}
            <div className="tt-cell" title="Double click to edit">
                {isFieldEditing("category") ? (
                    renderFieldInput("category")
                ) : isRowEditing ? (
                    IS_CATEGORY_DROPDOWN ? (
                        <select
                            className="tt-input"
                            value={draft.category || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                updateDraft('category', val);
                                // apply mapped criticality if present
                                const mapped = getCriticalityForCategory(val);
                                if (mapped) updateDraft('criticality', mapped);
                            }}
                            onBlur={handleCategoryBlurForRow}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onSaveRowClick();
                                if (e.key === 'Escape') onCancelRowLocal();
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setHighlightIndex((i) => Math.min(i + 1, ALL_CATEGORIES.length - 1));
                                }
                                if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setHighlightIndex((i) => Math.max(i - 1, 0));
                                }
                            }}
                        >
                            <option value="">{/* allow empty */}</option>
                            {ALL_CATEGORIES.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <input
                                ref={categoryInputRef}
                                className="tt-input"
                                value={draft.category || ''}
                                onChange={(e) => {
                                    updateDraft('category', e.target.value);
                                    const matched = filterCategories(e.target.value);
                                    setSuggestions(matched);
                                    setShowSuggestions(matched.length > 0);
                                }}
                                onBlur={handleCategoryBlurForRow}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onSaveRowClick();
                                    if (e.key === 'Escape') onCancelRowLocal();
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
                                    }
                                    if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setHighlightIndex((i) => Math.max(i - 1, 0));
                                    }
                                    if (e.key === 'Tab') {
                                        // let blur handler run
                                    }
                                }}
                            />
                            {showSuggestions && suggestions.length > 0 && (
                                <div
                                    role="listbox"
                                    aria-label="Category suggestions"
                                    style={{
                                        position: 'absolute',
                                        zIndex: 2000,
                                        background: 'white',
                                        border: '1px solid rgba(0,0,0,0.12)',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                        width: '100%',
                                        maxHeight: 220,
                                        overflowY: 'auto',
                                        marginTop: 6,
                                    }}
                                >
                                    {suggestions.map((opt, idx) => (
                                        <div
                                            key={opt}
                                            role="option"
                                            aria-selected={idx === highlightIndex}
                                            onMouseDown={(ev) => {
                                                // prevent blur before click handled
                                                ev.preventDefault();
                                                handleSelectCategoryForRow(opt);
                                            }}
                                            onMouseEnter={() => setHighlightIndex(idx)}
                                            style={{
                                                padding: '6px 8px',
                                                background: idx === highlightIndex ? 'rgba(0,0,0,0.04)' : 'white',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    <div onDoubleClick={() => onCellDoubleClick(tx, "category")}>{tx.category}</div>
                )}
            </div>

            {/* Criticality (dropdown) */}
            <div className="tt-cell" title="Double click to edit">
                {isFieldEditing("criticality") ? (
                    renderFieldInput("criticality")
                ) : isRowEditing ? (
                    <select
                        className="tt-input"
                        value={draft.criticality ? draft.criticality : DEFAULT_CRITICALITY}
                        onChange={(e) => updateDraft('criticality', e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveRowClick();
                            if (e.key === 'Escape') onCancelRowLocal();
                        }}
                    >
                        {CRITICALITY_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                ) : (
                    <div onDoubleClick={() => onCellDoubleClick(tx, "criticality")}>{tx.criticality}</div>
                )}
            </div>

            {/* Date */}
            <div className="tt-cell" title="Double click to edit">
                {isFieldEditing("transactionDate") ? (
                    renderFieldInput("transactionDate")
                ) : isRowEditing ? (
                    <input
                        className="tt-input"
                        type="date"
                        value={draft.transactionDate ? draft.transactionDate.slice(0, 10) : ''}
                        onChange={(e) => updateDraft('transactionDate', e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveRowClick();
                            if (e.key === 'Escape') onCancelRowLocal();
                        }}
                    />
                ) : tx.transactionDate ? (
                    new Date(tx.transactionDate).toLocaleDateString('en-US', { timeZone: 'UTC' })
                ) : (
                    ""
                )}
            </div>

            {/* Account */}
            <div className="tt-cell" title="Double click to edit">
                {isFieldEditing("account") ? (
                    renderFieldInput("account")
                ) : isRowEditing ? (
                    <input
                        className="tt-input"
                        value={draft.account || ''}
                        onChange={(e) => updateDraft('account', e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveRowClick();
                            if (e.key === 'Escape') onCancelRowLocal();
                        }}
                    />
                ) : (
                    <div onDoubleClick={() => onCellDoubleClick(tx, "account")}>{tx.account}</div>
                )}
            </div>

            {/* Payment Method */}
            <div className="tt-cell" title="Double click to edit">
                {isFieldEditing("paymentMethod") ? (
                    renderFieldInput("paymentMethod")
                ) : isRowEditing ? (
                    <input
                        className="tt-input"
                        value={draft.paymentMethod || ''}
                        onChange={(e) => updateDraft('paymentMethod', e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveRowClick();
                            if (e.key === 'Escape') onCancelRowLocal();
                        }}
                    />
                ) : (
                    <div onDoubleClick={() => onCellDoubleClick(tx, "paymentMethod")}>{tx.paymentMethod}</div>
                )}
            </div>

            {/* Row-level controls that span across the data columns (appears underneath inputs) */}
            {isRowEditing && (
                <div className="tt-row-controls" role="group" aria-label="Row actions">
                    <button
                        className="tt-action-btn tt-action-outline"
                        onClick={onCancelRowLocal}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>

                    <button
                        className="tt-action-btn tt-action-primary"
                        onClick={() => onSaveRowClick(false)}
                        disabled={isSaving}
                    >
                        Save
                    </button>

                    {tx.__isNew ? (
                        <button
                            className="tt-action-btn tt-action-ghost"
                            onClick={() => onSaveRowClick(true)}
                            disabled={isSaving}
                        >
                            Save and add another
                        </button>
                    ) : null}

                    {isSaving && <span style={{ color: '#9be3a7', marginLeft: 8 }}>Saving…</span>}
                    {inlineError && <div style={{ color: '#ff8a8a', marginTop: 6 }}>{inlineError}</div>}
                </div>
            )}
        </div>
    );
}

TransactionRow.propTypes = {
    tx: PropTypes.object.isRequired,
    selected: PropTypes.bool.isRequired,
    onSelect: PropTypes.func.isRequired,
    editing: PropTypes.object,
    editValueRef: PropTypes.object.isRequired,
    onCellDoubleClick: PropTypes.func.isRequired,
    onEditKey: PropTypes.func.isRequired,
    onSaveEdit: PropTypes.func.isRequired,
    onSaveRow: PropTypes.func.isRequired,
    onCancelRow: PropTypes.func, // optional
    toInputDate: PropTypes.func.isRequired,
    setEditing: PropTypes.func.isRequired,
    savingIds: PropTypes.object,
    saveErrors: PropTypes.object,
    startEditingRow: PropTypes.func.isRequired,
};