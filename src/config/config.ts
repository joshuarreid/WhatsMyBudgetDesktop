// Minimal centralized config accessor with lightweight logging.
// - Loads ../../wmbservice-config.json via require (works without resolveJsonModule).
// - Exposes get(), setOverrides() and helpers including mapping default payment method to users/accounts.
//
// Robust logging per project convention:
const logger = {
    info: (...args: any[]) => console.log('[Config]', ...args),
    error: (...args: any[]) => console.error('[Config]', ...args),
};

type AnyObj = Record<string, unknown>;

let fileConfig: AnyObj = {};

// Loads config from public folder using fetch
export async function loadConfig(): Promise<void> {
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
 * mergedConfig is exported as the live configuration object.
 * setOverrides mutates it in-place so imports keep seeing updates.
 */
const mergedConfig: AnyObj = { ...fileConfig };

/**
 * Apply shallow runtime overrides (useful in tests/bootstrap)
 */
export function setOverrides(overrides: AnyObj = {}): void {
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
 */
export function get<T = unknown>(path: string, fallback?: T): T | undefined {
    if (!path) return fallback;
    const parts = String(path).split('.');
    let cur: any = mergedConfig;
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
    return cur as T;
}

/* Basic list helpers */
export function getCategories(): string[] {
    try {
        const val = (mergedConfig as any).categories;
        if (Array.isArray(val)) {
            const filtered = val.filter((v: any) => typeof v === 'string').map(String);
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

export function getPaymentMethods(): string[] {
    try {
        const val = (mergedConfig as any).paymentMethods;
        if (Array.isArray(val)) {
            const filtered = val.filter((v: any) => typeof v === 'string').map(String);
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

export function getAccounts(): string[] {
    try {
        const val = (mergedConfig as any).accounts;
        if (Array.isArray(val)) {
            const filtered = val.filter((v: any) => typeof v === 'string').map(String);
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

/* Criticality helpers */
export function getCriticalityMap(): Record<string, string> {
    try {
        const val = (mergedConfig as any).defaultCriticalityMap;
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            const out: Record<string, string> = {};
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

export function getCriticalityForCategory(category?: string): string {
    try {
        const map = getCriticalityMap();
        if (!category) {
            const fallback = (mergedConfig as any).criticalityOptions?.[0] ?? 'Essential';
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

        const fallback = (mergedConfig as any).criticalityOptions?.[0] ?? 'Essential';
        logger.info('getCriticalityForCategory: not found, using fallback', { category, fallback });
        return fallback;
    } catch (err) {
        logger.error('getCriticalityForCategory failed', err);
        return (mergedConfig as any).criticalityOptions?.[0] ?? 'Essential';
    }
}

/* Default payment method helpers */

/**
 * Return the defaultPaymentMethodMap defined in config (if any).
 * Example key format in JSON: { "defaultPaymentMethodMap": { "josh": "Freedom", "anna": "Amex" } }
 */
export function getDefaultPaymentMethodMap(): Record<string, string> {
    try {
        const val = (mergedConfig as any).defaultPaymentMethodMap;
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            const out: Record<string, string> = {};
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
 */
function resolveAccountToUserKey(account?: string): string | undefined {
    if (!account) return undefined;
    try {
        const acctLower = String(account).toLowerCase();
        const userKeys = ['user1', 'user2', 'joint'];
        for (const key of userKeys) {
            const userObj = (mergedConfig as any)[key];
            if (!userObj || typeof userObj !== 'object') continue;
            const filter = String((userObj as any).filter ?? '').toLowerCase();
            const name = String((userObj as any).name ?? '').toLowerCase();
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
 */
export function getDefaultPaymentMethodForAccount(account?: string): string | undefined {
    try {
        if (!account) {
            const fallback = getPaymentMethods()[0];
            logger.info('getDefaultPaymentMethodForAccount: no account provided, using fallback', { fallback });
            return fallback;
        }

        // 1) resolve to user key and check user.paymentMethod
        const userKey = resolveAccountToUserKey(account);
        if (userKey) {
            const userObj = (mergedConfig as any)[userKey];
            const pm = userObj && typeof userObj === 'object' ? (userObj as any).paymentMethod : undefined;
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

logger.info('config.ts: baseUrl at startup', { baseUrl: mergedConfig.baseUrl });
