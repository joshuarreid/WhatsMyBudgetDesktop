// Simple pub/sub for transaction change notifications
// Consumers can subscribe to be notified when transactions change (create/update/delete/upload)
const subscribers = new Set();

export function subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    subscribers.add(fn);
    return () => subscribers.delete(fn);
}

export function publish(payload) {
    try {
        for (const fn of Array.from(subscribers)) {
            try {
                fn(payload);
            } catch (err) {
                // defensive: don't let one subscriber break others
                console.error('[TransactionEvents] subscriber threw', err);
            }
        }
    } catch (err) {
        console.error('[TransactionEvents] publish failed', err);
    }
}

export default { subscribe, publish };
