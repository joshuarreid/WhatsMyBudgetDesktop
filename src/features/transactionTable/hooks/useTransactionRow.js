/**
 * Updated useTransactionRow
 *
 * Replaces the repetitive inline field renderers for category/account/payment with the
 * SmartSelect component for both field-level and row-level flows. The hook still
 * exposes lower-level handlers for backward compatibility and for other callers
 * that want full control.
 *
 * NOTE: SmartSelect.jsx is expected to live next to this hook (same folder) for the
 * relative import below. Adjust import path if you place SmartSelect elsewhere.
 */

const logger = {
    info: (...args) => console.log('[useTransactionRow]', ...args),
    error: (...args) => console.error('[useTransactionRow]', ...args),
};

import React, { useEffect, useState, useMemo, useRef } from "react";
// Use centralized config helpers instead of reading the JSON file directly.
import {
    getCategories,
    getCriticalityForCategory,
    get as getConfig,
    getAccounts,
    getPaymentMethods,
    getDefaultPaymentMethodForAccount
} from '../../../config/config.ts';

import SmartSelect from '../components/SmartSelect';

const DEFAULT_CRITICALITY_OPTIONS = ["Essential", "Nonessential"];
const CRITICALITY_OPTIONS = (() => {
    try {
        const cfg = getConfig('criticalityOptions');
        if (Array.isArray(cfg) && cfg.length > 0) return cfg.map(String);
        logger.info('useTransactionRow: criticalityOptions not found; using defaults', { fallback: DEFAULT_CRITICALITY_OPTIONS });
        return DEFAULT_CRITICALITY_OPTIONS;
    } catch (err) {
        logger.error('useTransactionRow: failed to read criticalityOptions from config; using defaults', err);
        return DEFAULT_CRITICALITY_OPTIONS;
    }
})();
const DEFAULT_CRITICALITY = CRITICALITY_OPTIONS[0] || "Essential";

export function useTransactionRow({
                                      tx,
                                      editing,
                                      editValueRef,
                                      onSaveEdit,
                                      onSaveRow,
                                      onCancelRow,
                                      toInputDate,
                                      setEditing,
                                      savingIds = new Set(),
                                      saveErrors = {},
                                      startEditingRow,
                                      onEditKey,
                                  }) {
    // replicate helper functions that were previously in TransactionRow
    const isFieldEditing = (field) => editing && editing.id === tx.id && editing.mode === 'field' && editing.field === field;
    const isRowEditing = editing && editing.id === tx.id && editing.mode === 'row';
    const isSaving = savingIds && savingIds.has(tx.id);
    const inlineError = saveErrors && saveErrors[tx.id];

    // load configured lists once
    const ALL_CATEGORIES = useMemo(() => {
        try {
            const cats = getCategories() || [];
            logger.info('useTransactionRow: loaded categories', { count: cats.length, sample: cats.slice(0, 6) });
            return cats;
        } catch (err) {
            logger.error('useTransactionRow: failed to load categories', err);
            return [];
        }
    }, []);

    const ALL_ACCOUNTS = useMemo(() => {
        try {
            const acc = getAccounts() || [];
            logger.info('useTransactionRow: loaded accounts', { count: acc.length, sample: acc.slice(0, 6) });
            return acc;
        } catch (err) {
            logger.error('useTransactionRow: failed to load accounts', err);
            return [];
        }
    }, []);

    const ALL_PAYMENT_METHODS = useMemo(() => {
        try {
            const pms = getPaymentMethods() || [];
            logger.info('useTransactionRow: loaded paymentMethods', { count: pms.length, sample: pms.slice(0, 6) });
            return pms;
        } catch (err) {
            logger.error('useTransactionRow: failed to load paymentMethods', err);
            return [];
        }
    }, []);

    const IS_CATEGORY_DROPDOWN = Array.isArray(ALL_CATEGORIES) && ALL_CATEGORIES.length > 0;
    const IS_ACCOUNT_DROPDOWN = Array.isArray(ALL_ACCOUNTS) && ALL_ACCOUNTS.length > 0;
    const IS_PAYMENT_DROPDOWN = Array.isArray(ALL_PAYMENT_METHODS) && ALL_PAYMENT_METHODS.length > 0;

    // local draft state used only when editing the whole row
    const [draft, setDraft] = useState(() => ({ ...tx }));

    // suggestion state (kept for compatibility but SmartSelect also manages its own suggestions)
    const [catSuggestions, setCatSuggestions] = useState([]);
    const [catShowSuggestions, setCatShowSuggestions] = useState(false);
    const [catHighlightIndex, setCatHighlightIndex] = useState(-1);
    const categoryInputRef = useRef(null);

    const [accSuggestions, setAccSuggestions] = useState([]);
    const [accShowSuggestions, setAccShowSuggestions] = useState(false);
    const [accHighlightIndex, setAccHighlightIndex] = useState(-1);
    const accountInputRef = useRef(null);

    const [pmSuggestions, setPmSuggestions] = useState([]);
    const [pmShowSuggestions, setPmShowSuggestions] = useState(false);
    const [pmHighlightIndex, setPmHighlightIndex] = useState(-1);
    const paymentInputRef = useRef(null);

    // keep draft in sync when tx changes and not currently editing row
    useEffect(() => {
        if (!isRowEditing) {
            if (tx?.__isNew) {
                const derivedCrit = getCriticalityForCategory(tx.category) || DEFAULT_CRITICALITY;
                const derivedPM = getDefaultPaymentMethodForAccount(tx.account) || tx.paymentMethod || '';
                setDraft({ ...tx, criticality: derivedCrit, paymentMethod: derivedPM });
            } else {
                setDraft({ ...tx });
            }
        }
    }, [tx.id, tx, isRowEditing]);

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

    // --- Filtering helpers (still exposed if callers want them) ---
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

    return {
        // state & helpers
        isFieldEditing,
        isRowEditing,
        isSaving,
        inlineError,
        ALL_CATEGORIES,
        ALL_ACCOUNTS,
        ALL_PAYMENT_METHODS,
        IS_CATEGORY_DROPDOWN,
        IS_ACCOUNT_DROPDOWN,
        IS_PAYMENT_DROPDOWN,
        draft,
        updateDraft,
        categoryInputRef,
        accountInputRef,
        paymentInputRef,
        catSuggestions,
        catShowSuggestions,
        catHighlightIndex,
        accSuggestions,
        accShowSuggestions,
        accHighlightIndex,
        pmSuggestions,
        pmShowSuggestions,
        pmHighlightIndex,
        setCatSuggestions,
        setCatShowSuggestions,
        setCatHighlightIndex,
        setAccSuggestions,
        setAccShowSuggestions,
        setAccHighlightIndex,
        setPmSuggestions,
        setPmShowSuggestions,
        setPmHighlightIndex,
        filterCategories,
        filterAccounts,
        filterPaymentMethods,
        hideCatSuggestions,
        hideAccSuggestions,
        hidePmSuggestions,
        handleSelectCategoryForRow,
        handleSelectAccountForRow,
        handleSelectPaymentForRow,
        handleSelectCategoryForFieldEdit,
        handleSelectAccountForFieldEdit,
        handleSelectPaymentForFieldEdit,
        handleCategoryBlurForRow,
        handleAccountBlurForRow,
        handlePaymentBlurForRow,
        handleCategoryBlurForField,
        handleAccountBlurForField,
        handlePaymentBlurForField,
        onSaveRowClick,
        onCancelRowLocal,
        onStartRowEdit,
        // expose config-driven helpers/values for the component
        CRITICALITY_OPTIONS,
        DEFAULT_CRITICALITY,
        getCriticalityForCategory,
        getDefaultPaymentMethodForAccount,
    };
}