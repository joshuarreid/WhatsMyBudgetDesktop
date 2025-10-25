const logger = {
    info: (...args) => console.log('[TransactionRow]', ...args),
    error: (...args) => console.error('[TransactionRow]', ...args),
};

import React, { useEffect, useState, useMemo, useRef } from "react";
import PropTypes from "prop-types";
// Use centralized config helpers instead of reading the JSON file directly.
import {
    getCategories,
    getCriticalityForCategory,
    get as getConfig,
    getAccounts,
    getPaymentMethods,
    getDefaultPaymentMethodForAccount
} from '../../../config/config.ts';

/**
 * TransactionRow
 *
 * - Renders Save / Cancel / Save and add another buttons while in whole-row edit mode.
 * - Calls onSaveRow(id, normalized, addAnother) when saving.
 * - Autofills category/account/payment suggestions from config lists as user types.
 * - When a category is selected (or focus leaves the category input), it will set the mapped
 *   criticality for that category (if mapping exists) for row-edit mode; for single-field edits
 *   it will attempt to save both category and mapped criticality via onSaveEdit.
 * - When account is selected/changed, the row will attempt to set (or persist) the default payment
 *   method for that account using config.getDefaultPaymentMethodForAccount(account).
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

    // load configured lists once
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

    const ALL_ACCOUNTS = useMemo(() => {
        try {
            const acc = getAccounts() || [];
            logger.info('TransactionRow: loaded accounts', { count: acc.length, sample: acc.slice(0, 6) });
            return acc;
        } catch (err) {
            logger.error('TransactionRow: failed to load accounts', err);
            return [];
        }
    }, []);

    const ALL_PAYMENT_METHODS = useMemo(() => {
        try {
            const pms = getPaymentMethods() || [];
            logger.info('TransactionRow: loaded paymentMethods', { count: pms.length, sample: pms.slice(0, 6) });
            return pms;
        } catch (err) {
            logger.error('TransactionRow: failed to load paymentMethods', err);
            return [];
        }
    }, []);

    const IS_CATEGORY_DROPDOWN = Array.isArray(ALL_CATEGORIES) && ALL_CATEGORIES.length > 0;
    const IS_ACCOUNT_DROPDOWN = Array.isArray(ALL_ACCOUNTS) && ALL_ACCOUNTS.length > 0;
    const IS_PAYMENT_DROPDOWN = Array.isArray(ALL_PAYMENT_METHODS) && ALL_PAYMENT_METHODS.length > 0;

    // local draft state used only when editing the whole row
    const [draft, setDraft] = useState(() => ({ ...tx }));

    // suggestion state (separate per field to avoid conflicts)
    // category suggestion state
    const [catSuggestions, setCatSuggestions] = useState([]);
    const [catShowSuggestions, setCatShowSuggestions] = useState(false);
    const [catHighlightIndex, setCatHighlightIndex] = useState(-1);
    const categoryInputRef = useRef(null);

    // account suggestion state
    const [accSuggestions, setAccSuggestions] = useState([]);
    const [accShowSuggestions, setAccShowSuggestions] = useState(false);
    const [accHighlightIndex, setAccHighlightIndex] = useState(-1);
    const accountInputRef = useRef(null);

    // payment method suggestion state
    const [pmSuggestions, setPmSuggestions] = useState([]);
    const [pmShowSuggestions, setPmShowSuggestions] = useState(false);
    const [pmHighlightIndex, setPmHighlightIndex] = useState(-1);
    const paymentInputRef = useRef(null);

    // keep draft in sync when tx changes and not currently editing row
    useEffect(() => {
        if (!isRowEditing) {
            // ensure new tx gets default criticality if missing (prefer category-derived)
            // and ensure default paymentMethod for the account is applied for new txs when missing
            if (tx?.__isNew) {
                const derivedCrit = getCriticalityForCategory(tx.category) || DEFAULT_CRITICALITY;
                const derivedPM = getDefaultPaymentMethodForAccount(tx.account) || tx.paymentMethod || '';
                setDraft({ ...tx, criticality: derivedCrit, paymentMethod: derivedPM });
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

    // --- Filtering helpers ---
    const filterCategories = (q) => {
        if (!q) return ALL_CATEGORIES.slice(0, 8);
        const lower = String(q).toLowerCase();
        return ALL_CATEGORIES
            .filter((c) => String(c).toLowerCase().includes(lower))
            .slice(0, 8);
    };

    const filterAccounts = (q) => {
        if (!q) return ALL_ACCOUNTS.slice(0, 8);
        const lower = String(q).toLowerCase();
        return ALL_ACCOUNTS
            .filter((a) => String(a).toLowerCase().includes(lower))
            .slice(0, 8);
    };

    const filterPaymentMethods = (q) => {
        if (!q) return ALL_PAYMENT_METHODS.slice(0, 8);
        const lower = String(q).toLowerCase();
        return ALL_PAYMENT_METHODS
            .filter((p) => String(p).toLowerCase().includes(lower))
            .slice(0, 8);
    };

    const hideCatSuggestions = () => {
        setCatShowSuggestions(false);
        setCatHighlightIndex(-1);
    };
    const hideAccSuggestions = () => {
        setAccShowSuggestions(false);
        setAccHighlightIndex(-1);
    };
    const hidePmSuggestions = () => {
        setPmShowSuggestions(false);
        setPmHighlightIndex(-1);
    };

    // --- Selection handlers for row-level suggestion selection ---
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
            hideCatSuggestions();
            categoryInputRef.current?.focus();
        }
    };

    const handleSelectAccountForRow = (value) => {
        try {
            logger.info('account suggestion selected (row)', { txId: tx.id, account: value });
            updateDraft('account', value);
            // apply default payment method for this account (if any)
            const defaultPm = getDefaultPaymentMethodForAccount(value);
            if (defaultPm) {
                logger.info('applying default paymentMethod for account (row)', { txId: tx.id, account: value, paymentMethod: defaultPm });
                updateDraft('paymentMethod', defaultPm);
            }
        } catch (err) {
            logger.error('handleSelectAccountForRow failed', err);
        } finally {
            hideAccSuggestions();
            accountInputRef.current?.focus();
        }
    };

    const handleSelectPaymentForRow = (value) => {
        try {
            logger.info('payment suggestion selected (row)', { txId: tx.id, paymentMethod: value });
            updateDraft('paymentMethod', value);
        } catch (err) {
            logger.error('handleSelectPaymentForRow failed', err);
        } finally {
            hidePmSuggestions();
            paymentInputRef.current?.focus();
        }
    };

    // --- Field-edit selection handlers (persist immediately) ---
    const handleSelectCategoryForFieldEdit = async (value) => {
        try {
            logger.info('category suggestion selected (field)', { txId: tx.id, category: value });
            editValueRef.current = value;
            if (typeof onSaveEdit === 'function') {
                await onSaveEdit(tx.id, 'category', value);
            }
            const mapped = getCriticalityForCategory(value);
            if (mapped && typeof onSaveEdit === 'function') {
                logger.info('mapped criticality applied (field)', { txId: tx.id, category: value, criticality: mapped });
                await onSaveEdit(tx.id, 'criticality', mapped);
            }
        } catch (err) {
            logger.error('handleSelectCategoryForFieldEdit failed', err);
        } finally {
            hideCatSuggestions();
        }
    };

    const handleSelectAccountForFieldEdit = async (value) => {
        try {
            logger.info('account suggestion selected (field)', { txId: tx.id, account: value });
            editValueRef.current = value;
            if (typeof onSaveEdit === 'function') {
                await onSaveEdit(tx.id, 'account', value);
            }
            // persist default payment method for this account (if any)
            const defaultPm = getDefaultPaymentMethodForAccount(value);
            if (defaultPm && typeof onSaveEdit === 'function') {
                logger.info('applying default paymentMethod for account (field)', { txId: tx.id, account: value, paymentMethod: defaultPm });
                await onSaveEdit(tx.id, 'paymentMethod', defaultPm);
            }
        } catch (err) {
            logger.error('handleSelectAccountForFieldEdit failed', err);
        } finally {
            hideAccSuggestions();
        }
    };

    const handleSelectPaymentForFieldEdit = async (value) => {
        try {
            logger.info('payment suggestion selected (field)', { txId: tx.id, paymentMethod: value });
            editValueRef.current = value;
            if (typeof onSaveEdit === 'function') {
                await onSaveEdit(tx.id, 'paymentMethod', value);
            }
        } catch (err) {
            logger.error('handleSelectPaymentForFieldEdit failed', err);
        } finally {
            hidePmSuggestions();
        }
    };

    // --- Blur handlers for row-level editing (apply mapped criticality for category) ---
    const handleCategoryBlurForRow = () => {
        setTimeout(() => {
            try {
                hideCatSuggestions();
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

    const handleAccountBlurForRow = () => {
        setTimeout(() => {
            try {
                hideAccSuggestions();
                const accountVal = draft.account;
                if (accountVal) {
                    const defaultPm = getDefaultPaymentMethodForAccount(accountVal);
                    if (defaultPm && defaultPm !== draft.paymentMethod) {
                        logger.info('apply default paymentMethod on blur (row)', { txId: tx.id, account: accountVal, paymentMethod: defaultPm });
                        updateDraft('paymentMethod', defaultPm);
                    }
                }
            } catch (err) {
                logger.error('handleAccountBlurForRow failed', err);
            }
        }, 150);
    };

    const handlePaymentBlurForRow = () => {
        setTimeout(() => {
            try {
                hidePmSuggestions();
            } catch (err) {
                logger.error('handlePaymentBlurForRow failed', err);
            }
        }, 150);
    };

    // --- Field-level blur handlers to persist changes on blur (similar to category) ---
    const handleCategoryBlurForField = async () => {
        try {
            const val = String(editValueRef.current ?? '').trim();
            if (val === '') {
                hideCatSuggestions();
                return;
            }
            hideCatSuggestions();
            if (typeof onSaveEdit === 'function') {
                logger.info('field edit category blur: saving category', { txId: tx.id, category: val });
                await onSaveEdit(tx.id, 'category', val);
            }
            const mapped = getCriticalityForCategory(val);
            if (mapped && typeof onSaveEdit === 'function') {
                logger.info('field edit category blur: saving mapped criticality', { txId: tx.id, category: val, criticality: mapped });
                await onSaveEdit(tx.id, 'criticality', mapped);
            }
        } catch (err) {
            logger.error('handleCategoryBlurForField failed', err);
        }
    };

    const handleAccountBlurForField = async () => {
        try {
            const val = String(editValueRef.current ?? '').trim();
            if (val === '') {
                hideAccSuggestions();
                return;
            }
            hideAccSuggestions();
            if (typeof onSaveEdit === 'function') {
                logger.info('field edit account blur: saving account', { txId: tx.id, account: val });
                await onSaveEdit(tx.id, 'account', val);
            }
            // persist default payment method
            const defaultPm = getDefaultPaymentMethodForAccount(val);
            if (defaultPm && typeof onSaveEdit === 'function') {
                logger.info('field edit account blur: saving default paymentMethod', { txId: tx.id, account: val, paymentMethod: defaultPm });
                await onSaveEdit(tx.id, 'paymentMethod', defaultPm);
            }
        } catch (err) {
            logger.error('handleAccountBlurForField failed', err);
        }
    };

    const handlePaymentBlurForField = async () => {
        try {
            const val = String(editValueRef.current ?? '').trim();
            if (val === '') {
                hidePmSuggestions();
                return;
            }
            hidePmSuggestions();
            if (typeof onSaveEdit === 'function') {
                logger.info('field edit payment blur: saving paymentMethod', { txId: tx.id, paymentMethod: val });
                await onSaveEdit(tx.id, 'paymentMethod', val);
            }
        } catch (err) {
            logger.error('handlePaymentBlurForField failed', err);
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

        // Category field-level input: select if configured otherwise autocomplete textbox
        if (field === "category") {
            const initial = (tx.category ?? '');
            if (IS_CATEGORY_DROPDOWN) {
                return (
                    <select
                        className="tt-input"
                        autoFocus
                        defaultValue={initial}
                        onChange={async (e) => {
                            const val = e.target.value;
                            editValueRef.current = val;
                            if (typeof onSaveEdit === 'function') {
                                try { await onSaveEdit(tx.id, 'category', val); } catch (err) { logger.error('failed to save category on select change', err); }
                            }
                            const mapped = getCriticalityForCategory(val);
                            if (mapped && typeof onSaveEdit === 'function') {
                                try { await onSaveEdit(tx.id, 'criticality', mapped); } catch (err) { logger.error('failed to save mapped criticality on select change', err); }
                            }
                            setEditing(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") e.preventDefault();
                            else if (e.key === "Escape") setEditing(null);
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

            return (
                <div style={{ position: 'relative' }}>
                    <input
                        ref={categoryInputRef}
                        className="tt-input"
                        autoFocus
                        defaultValue={initial}
                        onChange={(e) => {
                            editValueRef.current = e.target.value;
                            const matched = filterCategories(e.target.value);
                            setCatSuggestions(matched);
                            setCatShowSuggestions(matched.length > 0);
                        }}
                        onBlur={handleCategoryBlurForField}
                        onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                await onSaveEdit(tx.id, 'category', editValueRef.current);
                                const mapped = getCriticalityForCategory(editValueRef.current);
                                if (mapped) await onSaveEdit(tx.id, 'criticality', mapped);
                                setEditing(null);
                            } else if (e.key === "Escape") {
                                setEditing(null);
                            } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setCatHighlightIndex((i) => Math.min(i + 1, catSuggestions.length - 1));
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setCatHighlightIndex((i) => Math.max(i - 1, 0));
                            } else if (e.key === 'Tab') {
                                // let blur handler run
                            } else {
                                onEditKey(e, tx.id, field);
                            }
                        }}
                        {...props}
                    />
                    {catShowSuggestions && catSuggestions.length > 0 && (
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
                            {catSuggestions.map((opt, idx) => (
                                <div
                                    key={opt}
                                    role="option"
                                    aria-selected={idx === catHighlightIndex}
                                    onMouseDown={(ev) => {
                                        ev.preventDefault();
                                        handleSelectCategoryForFieldEdit(opt);
                                    }}
                                    onMouseEnter={() => setCatHighlightIndex(idx)}
                                    style={{
                                        padding: '6px 8px',
                                        background: idx === catHighlightIndex ? 'rgba(0,0,0,0.04)' : 'white',
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

        // Account field-level input
        if (field === "account") {
            const initial = (tx.account ?? '');
            if (IS_ACCOUNT_DROPDOWN) {
                return (
                    <select
                        className="tt-input"
                        autoFocus
                        defaultValue={initial}
                        onChange={async (e) => {
                            const val = e.target.value;
                            editValueRef.current = val;
                            if (typeof onSaveEdit === 'function') {
                                try { await onSaveEdit(tx.id, 'account', val); } catch (err) { logger.error('failed to save account on select change', err); }
                            }
                            // persist default payment method for this account (if any)
                            const defaultPm = getDefaultPaymentMethodForAccount(val);
                            if (defaultPm && typeof onSaveEdit === 'function') {
                                try { await onSaveEdit(tx.id, 'paymentMethod', defaultPm); } catch (err) { logger.error('failed to save default paymentMethod on account select change', err); }
                            }
                            setEditing(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") e.preventDefault();
                            else if (e.key === "Escape") setEditing(null);
                            else onEditKey(e, tx.id, field);
                        }}
                        {...props}
                    >
                        <option value="">{/* allow empty */}</option>
                        {ALL_ACCOUNTS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            }

            return (
                <div style={{ position: 'relative' }}>
                    <input
                        ref={accountInputRef}
                        className="tt-input"
                        autoFocus
                        defaultValue={initial}
                        onChange={(e) => {
                            editValueRef.current = e.target.value;
                            const matched = filterAccounts(e.target.value);
                            setAccSuggestions(matched);
                            setAccShowSuggestions(matched.length > 0);
                        }}
                        onBlur={handleAccountBlurForField}
                        onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                await onSaveEdit(tx.id, 'account', editValueRef.current);
                                // persist default payment method after account save
                                const defaultPm = getDefaultPaymentMethodForAccount(editValueRef.current);
                                if (defaultPm) await onSaveEdit(tx.id, 'paymentMethod', defaultPm);
                                setEditing(null);
                            } else if (e.key === "Escape") {
                                setEditing(null);
                            } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setAccHighlightIndex((i) => Math.min(i + 1, accSuggestions.length - 1));
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setAccHighlightIndex((i) => Math.max(i - 1, 0));
                            } else if (e.key === 'Tab') {
                                // let blur handler run
                            } else {
                                onEditKey(e, tx.id, field);
                            }
                        }}
                        {...props}
                    />
                    {accShowSuggestions && accSuggestions.length > 0 && (
                        <div
                            role="listbox"
                            aria-label="Account suggestions"
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
                            {accSuggestions.map((opt, idx) => (
                                <div
                                    key={opt}
                                    role="option"
                                    aria-selected={idx === accHighlightIndex}
                                    onMouseDown={(ev) => {
                                        ev.preventDefault();
                                        handleSelectAccountForFieldEdit(opt);
                                    }}
                                    onMouseEnter={() => setAccHighlightIndex(idx)}
                                    style={{
                                        padding: '6px 8px',
                                        background: idx === accHighlightIndex ? 'rgba(0,0,0,0.04)' : 'white',
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

        // Payment method field-level input
        if (field === "paymentMethod") {
            const initial = (tx.paymentMethod ?? '');
            if (IS_PAYMENT_DROPDOWN) {
                return (
                    <select
                        className="tt-input"
                        autoFocus
                        defaultValue={initial}
                        onChange={async (e) => {
                            const val = e.target.value;
                            editValueRef.current = val;
                            if (typeof onSaveEdit === 'function') {
                                try { await onSaveEdit(tx.id, 'paymentMethod', val); } catch (err) { logger.error('failed to save paymentMethod on select change', err); }
                            }
                            setEditing(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") e.preventDefault();
                            else if (e.key === "Escape") setEditing(null);
                            else onEditKey(e, tx.id, field);
                        }}
                        {...props}
                    >
                        <option value="">{/* allow empty */}</option>
                        {ALL_PAYMENT_METHODS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            }

            return (
                <div style={{ position: 'relative' }}>
                    <input
                        ref={paymentInputRef}
                        className="tt-input"
                        autoFocus
                        defaultValue={initial}
                        onChange={(e) => {
                            editValueRef.current = e.target.value;
                            const matched = filterPaymentMethods(e.target.value);
                            setPmSuggestions(matched);
                            setPmShowSuggestions(matched.length > 0);
                        }}
                        onBlur={handlePaymentBlurForField}
                        onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                await onSaveEdit(tx.id, 'paymentMethod', editValueRef.current);
                                setEditing(null);
                            } else if (e.key === "Escape") {
                                setEditing(null);
                            } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setPmHighlightIndex((i) => Math.min(i + 1, pmSuggestions.length - 1));
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setPmHighlightIndex((i) => Math.max(i - 1, 0));
                            } else if (e.key === 'Tab') {
                                // let blur handler run
                            } else {
                                onEditKey(e, tx.id, field);
                            }
                        }}
                        {...props}
                    />
                    {pmShowSuggestions && pmSuggestions.length > 0 && (
                        <div
                            role="listbox"
                            aria-label="Payment method suggestions"
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
                            {pmSuggestions.map((opt, idx) => (
                                <div
                                    key={opt}
                                    role="option"
                                    aria-selected={idx === pmHighlightIndex}
                                    onMouseDown={(ev) => {
                                        ev.preventDefault();
                                        handleSelectPaymentForFieldEdit(opt);
                                    }}
                                    onMouseEnter={() => setPmHighlightIndex(idx)}
                                    style={{
                                        padding: '6px 8px',
                                        background: idx === pmHighlightIndex ? 'rgba(0,0,0,0.04)' : 'white',
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
        const normalized = { ...draft };
        if (normalized.transactionDate && normalized.transactionDate.length === 10) {
            normalized.transactionDate = new Date(normalized.transactionDate).toISOString();
        }
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
                                const mapped = getCriticalityForCategory(val);
                                if (mapped) updateDraft('criticality', mapped);
                            }}
                            onBlur={handleCategoryBlurForRow}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onSaveRowClick();
                                if (e.key === 'Escape') onCancelRowLocal();
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setCatHighlightIndex((i) => Math.min(i + 1, ALL_CATEGORIES.length - 1));
                                }
                                if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setCatHighlightIndex((i) => Math.max(i - 1, 0));
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
                                    setCatSuggestions(matched);
                                    setCatShowSuggestions(matched.length > 0);
                                }}
                                onBlur={handleCategoryBlurForRow}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onSaveRowClick();
                                    if (e.key === 'Escape') onCancelRowLocal();
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setCatHighlightIndex((i) => Math.min(i + 1, catSuggestions.length - 1));
                                    }
                                    if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setCatHighlightIndex((i) => Math.max(i - 1, 0));
                                    }
                                    if (e.key === 'Tab') {
                                        // let blur handler run
                                    }
                                }}
                            />
                            {catShowSuggestions && catSuggestions.length > 0 && (
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
                                    {catSuggestions.map((opt, idx) => (
                                        <div
                                            key={opt}
                                            role="option"
                                            aria-selected={idx === catHighlightIndex}
                                            onMouseDown={(ev) => {
                                                ev.preventDefault();
                                                handleSelectCategoryForRow(opt);
                                            }}
                                            onMouseEnter={() => setCatHighlightIndex(idx)}
                                            style={{
                                                padding: '6px 8px',
                                                background: idx === catHighlightIndex ? 'rgba(0,0,0,0.04)' : 'white',
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
                    IS_ACCOUNT_DROPDOWN ? (
                        <select
                            className="tt-input"
                            value={draft.account || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                updateDraft('account', val);
                                // apply default payment method for this account (row-level)
                                const defaultPm = getDefaultPaymentMethodForAccount(val);
                                if (defaultPm) updateDraft('paymentMethod', defaultPm);
                            }}
                            onBlur={handleAccountBlurForRow}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onSaveRowClick();
                                if (e.key === 'Escape') onCancelRowLocal();
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setAccHighlightIndex((i) => Math.min(i + 1, ALL_ACCOUNTS.length - 1));
                                }
                                if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setAccHighlightIndex((i) => Math.max(i - 1, 0));
                                }
                            }}
                        >
                            <option value="">{/* allow empty */}</option>
                            {ALL_ACCOUNTS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <input
                                ref={accountInputRef}
                                className="tt-input"
                                value={draft.account || ''}
                                onChange={(e) => {
                                    updateDraft('account', e.target.value);
                                    const matched = filterAccounts(e.target.value);
                                    setAccSuggestions(matched);
                                    setAccShowSuggestions(matched.length > 0);
                                }}
                                onBlur={handleAccountBlurForRow}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onSaveRowClick();
                                    if (e.key === 'Escape') onCancelRowLocal();
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setAccHighlightIndex((i) => Math.min(i + 1, accSuggestions.length - 1));
                                    }
                                    if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setAccHighlightIndex((i) => Math.max(i - 1, 0));
                                    }
                                    if (e.key === 'Tab') {
                                        // let blur handler run
                                    }
                                }}
                            />
                            {accShowSuggestions && accSuggestions.length > 0 && (
                                <div
                                    role="listbox"
                                    aria-label="Account suggestions"
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
                                    {accSuggestions.map((opt, idx) => (
                                        <div
                                            key={opt}
                                            role="option"
                                            aria-selected={idx === accHighlightIndex}
                                            onMouseDown={(ev) => {
                                                ev.preventDefault();
                                                handleSelectAccountForRow(opt);
                                            }}
                                            onMouseEnter={() => setAccHighlightIndex(idx)}
                                            style={{
                                                padding: '6px 8px',
                                                background: idx === accHighlightIndex ? 'rgba(0,0,0,0.04)' : 'white',
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
                    <div onDoubleClick={() => onCellDoubleClick(tx, "account")}>{tx.account}</div>
                )}
            </div>

            {/* Payment Method */}
            <div className="tt-cell" title="Double click to edit">
                {isFieldEditing("paymentMethod") ? (
                    renderFieldInput("paymentMethod")
                ) : isRowEditing ? (
                    IS_PAYMENT_DROPDOWN ? (
                        <select
                            className="tt-input"
                            value={draft.paymentMethod || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                updateDraft('paymentMethod', val);
                            }}
                            onBlur={handlePaymentBlurForRow}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onSaveRowClick();
                                if (e.key === 'Escape') onCancelRowLocal();
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setPmHighlightIndex((i) => Math.min(i + 1, ALL_PAYMENT_METHODS.length - 1));
                                }
                                if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setPmHighlightIndex((i) => Math.max(i - 1, 0));
                                }
                            }}
                        >
                            <option value="">{/* allow empty */}</option>
                            {ALL_PAYMENT_METHODS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <input
                                ref={paymentInputRef}
                                className="tt-input"
                                value={draft.paymentMethod || ''}
                                onChange={(e) => {
                                    updateDraft('paymentMethod', e.target.value);
                                    const matched = filterPaymentMethods(e.target.value);
                                    setPmSuggestions(matched);
                                    setPmShowSuggestions(matched.length > 0);
                                }}
                                onBlur={handlePaymentBlurForRow}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onSaveRowClick();
                                    if (e.key === 'Escape') onCancelRowLocal();
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setPmHighlightIndex((i) => Math.min(i + 1, pmSuggestions.length - 1));
                                    }
                                    if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setPmHighlightIndex((i) => Math.max(i - 1, 0));
                                    }
                                    if (e.key === 'Tab') {
                                        // let blur handler run
                                    }
                                }}
                            />
                            {pmShowSuggestions && pmSuggestions.length > 0 && (
                                <div
                                    role="listbox"
                                    aria-label="Payment method suggestions"
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
                                    {pmSuggestions.map((opt, idx) => (
                                        <div
                                            key={opt}
                                            role="option"
                                            aria-selected={idx === pmHighlightIndex}
                                            onMouseDown={(ev) => {
                                                ev.preventDefault();
                                                handleSelectPaymentForRow(opt);
                                            }}
                                            onMouseEnter={() => setPmHighlightIndex(idx)}
                                            style={{
                                                padding: '6px 8px',
                                                background: idx === pmHighlightIndex ? 'rgba(0,0,0,0.04)' : 'white',
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