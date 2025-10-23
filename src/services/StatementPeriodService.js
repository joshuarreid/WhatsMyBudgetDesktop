const logger = {
    info: (...args) => console.log('[StatementPeriodService]', ...args),
    error: (...args) => console.error('[StatementPeriodService]', ...args),
};

import { apiClient } from '../lib/apiClient';

/**
 * StatementPeriodService
 *
 * Exposes:
 * - generateOptions(anchor, prev, forward)  -> named export
 * - getCurrentOption(options)               -> named export
 * - getAllFromServer()                      -> named export (uses centralized apiClient)
 *
 * Also provides a default export object for backward compatibility.
 */

/**
 * generateOptions({ anchor = new Date(), prev = 1, forward = 5 })
 */
export function generateOptions({ anchor = new Date(), prev = 1, forward = 5 } = {}) {
    try {
        const options = [];
        for (let i = -prev; i <= forward; i += 1) {
            const d = new Date(anchor.getTime());
            d.setMonth(d.getMonth() + i, 1); // stable first-of-month
            const monthName = d.toLocaleString('en-US', { month: 'long' }).toUpperCase();
            const year = d.getFullYear();
            const label = monthName;
            const value = `${monthName}${year}`;
            const iso = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
            options.push({ label, value, iso, offset: i });
        }
        logger.info('generateOptions produced', { count: options.length, anchor: anchor.toISOString() });
        return options;
    } catch (err) {
        logger.error('generateOptions failed', err);
        return [];
    }
}

/**
 * getCurrentOption(options)
 */
export function getCurrentOption(options = []) {
    if (!Array.isArray(options) || options.length === 0) return null;
    return options.find((o) => o.offset === 0) || options[Math.floor(options.length / 2)];
}

/**
 * getAllFromServer()
 * GET /api/statement-periods using centralized apiClient
 */
export async function getAllFromServer() {
    logger.info('getAllFromServer entry');
    try {
        const response = await apiClient.get('/api/statement-periods');
        logger.info('getAllFromServer success', { count: Array.isArray(response.data) ? response.data.length : 0 });
        return response.data;
    } catch (err) {
        logger.error('getAllFromServer error', err);
        throw err;
    }
}

const defaultExport = {
    generateOptions,
    getCurrentOption,
    getAllFromServer,
};

export default defaultExport;