/**
 * src/lib/queryClientRegistry(tanStack).js
 *
 * Small registry to expose the app QueryClient to non-React modules during migration.
 * This allows TransactionEvents or legacy code to call invalidateQueries while migrating.
 *
 * NOTE: Temporary file (tanStack suffix).
 */

const logger = {
    info: (...args) => console.log('[queryClientRegistry]', ...args),
    error: (...args) => console.error('[queryClientRegistry]', ...args),
};

/**
 * @typedef {Object} Registry
 * @property {import('@tanstack/react-query').QueryClient|null} queryClient
 */

/** @type {Registry} */
const registry = {
    queryClient: null,
};

/**
 * registerQueryClient
 * - Register the QueryClient globally for transient non-React access.
 *
 * @param {import('@tanstack/react-query').QueryClient} qc - QueryClient instance
 * @returns {void}
 */
export function registerQueryClient(qc) {
    registry.queryClient = qc;
    logger.info('registerQueryClient: QueryClient registered globally');
}

/**
 * getRegisteredQueryClient
 * - Retrieve the registered QueryClient, or null if none has been registered.
 *
 * @returns {import('@tanstack/react-query').QueryClient|null}
 */
export function getRegisteredQueryClient() {
    return registry.queryClient;
}