import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * IMPORTANT:
 * - This index.js has been updated to wrap the application with QueryClientProviderWrapper
 *   so TanStack Query is available during the migration.
 *
 * - The provider wrapper file is named with the "(tanStack)" suffix while migrating.
 */

import { QueryClientProviderWrapper } from './lib/queryClient(tanStack)';

const logger = {
    info: (...args) => console.log('[index]', ...args),
    error: (...args) => console.error('[index]', ...args),
};

function ConfigLoader() {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        setReady(true);
    }, []);
    if (!ready) return <div style={{ padding: 32 }}>Loading configuration...</div>;
    return <App />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
        <QueryClientProviderWrapper>
            <ConfigLoader />
        </QueryClientProviderWrapper>
    </ErrorBoundary>
);

logger.info('index: App rendered with QueryClientProviderWrapper');