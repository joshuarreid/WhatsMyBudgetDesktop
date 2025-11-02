/**
 * src/lib/queryClient(tanStack).js
 *
 * QueryClient factory and provider wrapper for TanStack Query.
 * - Creates a configured QueryClient instance with sane defaults.
 * - Exposes a React provider wrapper that registers the client in the registry
 *   for non-React modules to access during migration.
 *
 * NOTE: This file is temporary and includes the "(tanStack)" suffix until migration is complete.
 */

const logger = {
    info: (...args) => console.log('[queryClient]', ...args),
    error: (...args) => console.error('[queryClient]', ...args),
};

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerQueryClient } from './queryClientRegistry(tanStack)';

/**
 * createQueryClient
 * - Creates and returns a configured QueryClient instance.
 *
 * @returns {import('@tanstack/react-query').QueryClient} QueryClient instance
 */
export function createQueryClient() {
    const qc = new QueryClient({
        defaultOptions: {
            queries: {
                retry: 1,
                refetchOnWindowFocus: false,
                staleTime: 1000 * 60 * 2, // 2 minutes default - tune per feature
            },
            mutations: {
                retry: 0,
            },
        },
    });
    logger.info('createQueryClient: QueryClient created');
    return qc;
}

/**
 * QueryClientProviderWrapper
 * - Wraps children with QueryClientProvider and registers the client globally.
 *
 * @param {Object} props
 * @param {import('@tanstack/react-query').QueryClient} [props.client] - Optional QueryClient instance (useful for tests)
 * @param {React.ReactNode} props.children - React children
 * @returns {JSX.Element}
 */
export function QueryClientProviderWrapper({ children, client }) {
    const qc = client || createQueryClient();

    // Register for non-react modules (TransactionEvents, legacy services) to use during migration.
    try {
        registerQueryClient(qc);
        logger.info('QueryClientProviderWrapper: registered QueryClient in registry');
    } catch (err) {
        logger.error('QueryClientProviderWrapper: failed to register QueryClient', err);
    }

    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

export default createQueryClient;