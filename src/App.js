/**
 * App
 * Main application component. Provides routing and context providers.
 *
 * - Wraps the app in a TanStack Query QueryClientProvider so hooks using
 *   useQuery / useMutation / useQueryClient have a QueryClient available.
 * - Keeps existing StatementPeriodProvider usage and app routes intact.
 *
 * @module App
 */

import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
/**
 * Optional: React Query Devtools is helpful during development.
 * Uncomment if @tanstack/react-query-devtools is installed.
 */
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import './App.css';
import JointScreen from "./screens/JointScreen/JointScreen";
import Sidebar from "./components/sidebar/Sidebar";
import SettingsScreen from "./screens/SettingsScreen/SettingsScreen";
import User1Screen from "./screens/User1Screen/User1Screen";
import User2Screen from "./screens/User2Screen/User2Screen";
import TransactionScreen from "./screens/TransactionScreen/TransactionScreen";
import { StatementPeriodProvider } from './context/StatementPeriodProvider';
import PaymentScreen from "./screens/PaymentsScreen/PaymentScreen";
import { queryClient } from './lib/queryClient';

/**
 * Standardized logger for App.
 * @constant
 */
const logger = {
    info: (...args) => console.log('[App]', ...args),
    error: (...args) => console.error('[App]', ...args),
};

function App() {
    logger.info('App initialized');

    return (
        <Router>
            {/* Provide a QueryClient to the application so TanStack Query hooks can be used */ }
            <QueryClientProvider client={queryClient}>
                <Sidebar />
                <StatementPeriodProvider>
                    <div className={"main-content"}>
                        <Routes>
                            <Route path="/" element={<TransactionScreen />} />
                            <Route path="/joint" element={<JointScreen />} />
                            <Route path="/user1" element={<User1Screen />} />
                            <Route path="/user2" element={<User2Screen />} />
                            <Route path="/settings" element={<SettingsScreen />} />
                            <Route path="/payments" element={<PaymentScreen />} />
                        </Routes>
                    </div>
                </StatementPeriodProvider>

                {/*
                  Optional devtools:
                  - Helpful during development for inspecting queries and mutations.
                  - Install with: npm install @tanstack/react-query-devtools
                */}
                {/*
                  <ReactQueryDevtools initialIsOpen={false} />
                */}
            </QueryClientProvider>
        </Router>
    );
}

export default App;