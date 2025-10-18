// No-op reportWebVitals used in the template to avoid requiring 'web-vitals'.
// Install 'web-vitals' and restore the original implementation if you need performance metrics.

export default function reportWebVitals(onPerfEntry) {
    if (typeof onPerfEntry === 'function') {
        try {
            console.log('[reportWebVitals] stub called - no-op (install web-vitals to enable metrics)');
            onPerfEntry(null);
        } catch (err) {
            console.warn('[reportWebVitals] callback error', err && err.message);
        }
    }
}