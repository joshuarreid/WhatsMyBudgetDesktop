/**
 * QueryClient factory and singleton for TanStack Query (react-query).
 *
 * - Centralizes QueryClient configuration used by the app.
 * - Keeps default options and any global plugins in one place.
 * - Export a ready-to-use `queryClient` instance for QueryClientProvider.
 *
 * @module lib/queryClient
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Standardized logger for this module.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[queryClient]', ...args),
    error: (...args) => console.error('[queryClient]', ...args),
};

logger.info('Initializing QueryClient with app defaults');

/**
 * queryClient
 * - Singleton QueryClient configured with conservative defaults appropriate for
 *   this application (minimal automatic retries, moderate staleTime).
 *
 * @type {QueryClient}
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Avoid surprising automatic retries during development; tune for prod as needed.
            retry: false,
            // Keep cached data "fresh" for 5 minutes by default to reduce refetch noise.
            staleTime: 1000 * 60 * 5,
            // Do not refetch on window focus by default to preserve the provider's "read once" semantics.
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        },
        mutations: {
            // Default: no automatic retry for mutations unless explicitly requested.
            retry: false,
        },
    },
});