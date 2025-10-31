/**
 * Minimal centralized config accessor with lightweight logging.
 * - Loads wmbservice-config.json via Electron IPC (window.electronAPI.readConfig).
 * - Exposes get(), setOverrides(), and helpers such as mapping default payment method to users/accounts.
 *
 * @module config
 */

const logger = {
    info: (...args) => console.log('[Config]', ...args),
    error: (...args) => console.error('[Config]', ...args),
};

/**
 * @typedef {Record<string, unknown>} AnyObj
 */

/** @type {AnyObj} */
let fileConfig = {};

/**
 * Loads config from Electron main process via IPC.
 * @async
 * @function loadConfig
 * @returns {Promise<void>}
 */
export async function loadConfig() {
    try {
        // @ts-ignore
        console.log('window.electronAPI:', window.electronAPI);
        if (!window.electronAPI || typeof window.electronAPI.readConfig !== 'function') {
            logger.error('window.electronAPI.readConfig is not available. Are you running in Electron with the correct preload script?');
            fileConfig = {};
            return;
        }
        const config = await window.electronAPI.readConfig();
        fileConfig = config || {};
        Object.assign(mergedConfig, fileConfig);
        logger.info('loaded static config via Electron IPC', { keys: Object.keys(fileConfig), baseUrl: mergedConfig.baseUrl });
    } catch (err) {
        logger.error('Failed to load config via Electron IPC', err);
        fileConfig = {};
    }
}

/**
 * Live configuration object. setOverrides mutates it in-place.
 * @type {AnyObj}
 */
const mergedConfig = { ...fileConfig };

/**
 * Apply shallow runtime overrides (useful in tests/bootstrap)
 * @function setOverrides
 * @param {AnyObj} [overrides={}]
 * @returns {void}
 */
export function setOverrides(overrides = {}) {
    if (!overrides || typeof overrides !== 'object') {
        logger.error('setOverrides expects a plain object', { receivedType: typeof overrides });
        return;
    }
    Object.assign(mergedConfig, overrides);
    logger.info('applied runtime config overrides', { keys: Object.keys(overrides) });
}

/**
 * Safe dot-path getter.
 * Example: get('user1.name', 'Default Name')
 * @function get
 * @template T
 * @param {string} path
 * @param {T} [fallback]
 * @returns {T|undefined}
 */
export function get(path, fallback) {
    if (!path) return fallback;
    const parts = String(path).split('.');
    let cur = mergedConfig;
    for (const p of parts) {
        if (cur == null) return fallback;
        cur = cur[p];
    }
    if (cur === undefined) return fallback;
    try {
        logger.info('config.get', { path, valuePreview: typeof cur === 'object' ? { ...cur } : cur });
        if (path === 'baseUrl') {
            logger.info('config.get: baseUrl', { value: cur });
        }
    } catch {
        // ignore logging errors
    }
    return cur;
}

/**
 * Returns categories from config.
 * @function getCategories
 * @returns {string[]}
 */
export function getCategories() {
    try {
        const val = mergedConfig.categories;
        if (Array.isArray(val)) {
            const filtered = val.filter(v => typeof v === 'string').map(String);
            logger.info('getCategories', { count: filtered.length, sample: filtered.slice(0, 5) });
            return filtered;
        }
        logger.info('getCategories: missing or invalid; returning empty list');
        return [];
    } catch (err) {
        logger.error('getCategories failed', err);
        return [];
    }
}

/**
 * Returns payment methods from config.
 * @function getPaymentMethods
 * @returns {string[]}
 */
export function getPaymentMethods() {
    try {
        const val = mergedConfig.paymentMethods;
        if (Array.isArray(val)) {
            const filtered = val.filter(v => typeof v === 'string').map(String);
            logger.info('getPaymentMethods', { count: filtered.length, sample: filtered.slice(0, 5) });
            return filtered;
        }
        logger.info('getPaymentMethods: missing or invalid; returning empty list');
        return [];
    } catch (err) {
        logger.error('getPaymentMethods failed', err);
        return [];
    }
}

/**
 * Returns account names from config.
 * @function getAccounts
 * @returns {string[]}
 */
export function getAccounts() {
    try {
        const val = mergedConfig.accounts;
        if (Array.isArray(val)) {
            const filtered = val.filter(v => typeof v === 'string').map(String);
            logger.info('getAccounts', { count: filtered.length, sample: filtered.slice(0, 5) });
            return filtered;
        }
        logger.info('getAccounts: missing or invalid; returning empty list');
        return [];
    } catch (err) {
        logger.error('getAccounts failed', err);
        return [];
    }
}

/**
 * Returns the criticality map from config.
 * @function getCriticalityMap
 * @returns {Record<string, string>}
 */
export function getCriticalityMap() {
    try {
        const val = mergedConfig.defaultCriticalityMap;
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            const out = {};
            for (const [k, v] of Object.entries(val)) {
                if (typeof v === 'string') out[k] = v;
            }
            logger.info('getCriticalityMap', { count: Object.keys(out).length, sample: Object.entries(out).slice(0, 5) });
            return out;
        }
        logger.info('getCriticalityMap: missing or invalid; returning empty map');
        return {};
    } catch (err) {
        logger.error('getCriticalityMap failed', err);
        return {};
    }
}

/**
 * Returns criticality for a given category, or fallback.
 * @function getCriticalityForCategory
 * @param {string} [category]
 * @returns {string}
 */
export function getCriticalityForCategory(category) {
    try {
        const map = getCriticalityMap();
        if (!category) {
            const fallback = mergedConfig.criticalityOptions?.[0] ?? 'Essential';
            logger.info('getCriticalityForCategory: no category provided, using fallback', { fallback });
            return fallback;
        }

        if (map[category]) {
            logger.info('getCriticalityForCategory: exact match', { category, criticality: map[category] });
            return map[category];
        }

        const lower = category.toLowerCase();
        for (const [k, v] of Object.entries(map)) {
            if (k.toLowerCase() === lower) {
                logger.info('getCriticalityForCategory: case-insensitive match', { category, keyMatched: k, criticality: v });
                return v;
            }
        }

        const fallback = mergedConfig.criticalityOptions?.[0] ?? 'Essential';
        logger.info('getCriticalityForCategory: not found, using fallback', { category, fallback });
        return fallback;
    } catch (err) {
        logger.error('getCriticalityForCategory failed', err);
        return mergedConfig.criticalityOptions?.[0] ?? 'Essential';
    }
}

/**
 * Returns the default payment method map from config.
 * @function getDefaultPaymentMethodMap
 * @returns {Record<string, string>}
 */
export function getDefaultPaymentMethodMap() {
    try {
        const val = mergedConfig.defaultPaymentMethodMap;
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            const out = {};
            for (const [k, v] of Object.entries(val)) {
                if (typeof v === 'string') out[k] = v;
            }
            logger.info('getDefaultPaymentMethodMap', { count: Object.keys(out).length, sample: Object.entries(out).slice(0, 5) });
            return out;
        }
        logger.info('getDefaultPaymentMethodMap: missing or invalid; returning empty map');
        return {};
    } catch (err) {
        logger.error('getDefaultPaymentMethodMap failed', err);
        return {};
    }
}

/**
 * Resolve a given account identifier (e.g., "josh", "anna", "joint") to a user key in config
 * (user1, user2, joint) by matching against each user object's `filter` or `name`.
 * Returns the matching user key string or undefined.
 * @function resolveAccountToUserKey
 * @param {string} [account]
 * @returns {string|undefined}
 */
function resolveAccountToUserKey(account) {
    if (!account) return undefined;
    try {
        const acctLower = String(account).toLowerCase();
        const userKeys = ['user1', 'user2', 'joint'];
        for (const key of userKeys) {
            const userObj = mergedConfig[key];
            if (!userObj || typeof userObj !== 'object') continue;
            const filter = String(userObj.filter ?? '').toLowerCase();
            const name = String(userObj.name ?? '').toLowerCase();
            if (filter === acctLower || name === acctLower) {
                logger.info('resolveAccountToUserKey: matched account to userKey', { account, userKey: key });
                return key;
            }
        }
        logger.info('resolveAccountToUserKey: no userKey match found for account', { account });
        return undefined;
    } catch (err) {
        logger.error('resolveAccountToUserKey failed', err);
        return undefined;
    }
}

/**
 * Given an account identifier (e.g., "josh", "anna", "joint"), return the default payment
 * method for that account. Resolution steps:
 * 1. Try to resolve account -> user key (user1/user2/joint) and use that user's paymentMethod
 *    if configured (user1.paymentMethod etc).
 * 2. Fallback to defaultPaymentMethodMap[account] if present.
 * 3. Fallback to first configured payment method (paymentMethods[0]) if available.
 * 4. Otherwise return undefined.
 * @function getDefaultPaymentMethodForAccount
 * @param {string} [account]
 * @returns {string|undefined}
 */
export function getDefaultPaymentMethodForAccount(account) {
    try {
        if (!account) {
            const fallback = getPaymentMethods()[0];
            logger.info('getDefaultPaymentMethodForAccount: no account provided, using fallback', { fallback });
            return fallback;
        }

        // 1) resolve to user key and check user.paymentMethod
        const userKey = resolveAccountToUserKey(account);
        if (userKey) {
            const userObj = mergedConfig[userKey];
            const pm = userObj && typeof userObj === 'object' ? userObj.paymentMethod : undefined;
            if (pm && typeof pm === 'string') {
                logger.info('getDefaultPaymentMethodForAccount: found paymentMethod on user object', { account, userKey, paymentMethod: pm });
                return pm;
            }
        }

        // 2) fallback to defaultPaymentMethodMap
        const map = getDefaultPaymentMethodMap();
        if (map[account]) {
            logger.info('getDefaultPaymentMethodForAccount: found exact match in defaultPaymentMethodMap', { account, paymentMethod: map[account] });
            return map[account];
        }
        const acctLower = account.toLowerCase();
        for (const [k, v] of Object.entries(map)) {
            if (k.toLowerCase() === acctLower) {
                logger.info('getDefaultPaymentMethodForAccount: case-insensitive match in map', { account, keyMatched: k, paymentMethod: v });
                return v;
            }
        }

        // 3) fallback to first payment method
        const fallback = getPaymentMethods()[0];
        logger.info('getDefaultPaymentMethodForAccount: not found, using fallback', { account, fallback });
        return fallback;
    } catch (err) {
        logger.error('getDefaultPaymentMethodForAccount failed', err);
        return getPaymentMethods()[0];
    }
}

/**
 * Default export: live merged config object.
 * Use destructuring with defaults in consumers if you want fallbacks:
 *   import config, { getDefaultPaymentMethodForAccount } from 'src/config/config';
 *   const defaultPM = getDefaultPaymentMethodForAccount('josh'); // -> "Freedom"
 */
export default mergedConfig;

logger.info('config.js: baseUrl at startup', { baseUrl: mergedConfig.baseUrl });