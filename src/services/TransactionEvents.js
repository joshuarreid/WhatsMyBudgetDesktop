/**
 * TransactionEvents.js
 *
 * Simple pub/sub for transaction change notifications.
 * Consumers can subscribe to be notified when transactions change (create/update/delete/upload).
 *
 * Logging follows the project's logger convention.
 */

const logger = {
    info: (...args) => console.log('[TransactionEvents]', ...args),
    error: (...args) => console.error('[TransactionEvents]', ...args),
};

/**
 * Subscribers set storing callback functions.
 * @type {Set<Function>}
 */
const subscribers = new Set();

/**
 * Subscribe to transaction change events.
 *
 * The provided callback will be invoked with a payload when publish() is called.
 * The returned unsubscribe function removes the callback from the subscribers set.
 *
 * @example
 * const unsubscribe = subscribe((payload) => { console.log(payload); });
 * // later...
 * unsubscribe();
 *
 * @param {Function} fn - Handler called with the event payload: { account?: string, statementPeriod?: string, reason?: string }
 * @returns {Function} unsubscribe - Call to remove the handler from subscribers.
 * @throws {Error} If fn is not a function.
 */
export function subscribe(fn) {
    if (typeof fn !== 'function') {
        throw new Error('subscribe: handler must be a function');
    }
    subscribers.add(fn);
    logger.info('subscribe: handler added, totalSubscribers=', subscribers.size);
    return () => {
        const removed = subscribers.delete(fn);
        logger.info('unsubscribe: handler removed, totalSubscribers=', subscribers.size, 'removed=', removed);
    };
}

/**
 * Publish a transaction change event to all subscribers.
 *
 * Each subscriber is invoked in a try/catch so one failing subscriber does not break others.
 *
 * @param {{account?: string, statementPeriod?: string, reason?: string}=} payload - Optional event details.
 *   - account: account identifier related to the change (optional)
 *   - statementPeriod: statementPeriod related to the change (optional)
 *   - reason: human-readable reason e.g. 'create' | 'update' | 'delete' | 'upload' (optional)
 * @returns {void}
 */
export function publish(payload = {}) {
    try {
        logger.info('publish: emitting event', payload, 'subscribers=', subscribers.size);
        for (const fn of Array.from(subscribers)) {
            try {
                fn(payload);
            } catch (err) {
                // defensive: don't let one subscriber break others
                logger.error('subscriber threw', err);
            }
        }
    } catch (err) {
        logger.error('publish failed', err);
    }
}

/**
 * Default export exposing subscribe & publish functions.
 *
 * @namespace TransactionEvents
 * @property {Function} subscribe - Register an event handler.
 * @property {Function} publish - Emit an event.
 */
export default { subscribe, publish };