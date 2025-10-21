import { useEffect, useState, useCallback} from 'react';
import apiService from '../services/apiService';

/**
 * useTransactions - fetches transactions for given filters.
 * Returns { data, loading, error, refetch }.
 */

export default function useTransactions(filters) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);


    const fetchData = useCallback(async (currentFilters) => {
        setLoading(true);
        setError(null);

        try {
            console.log("[useTransactions] fetchData called with filters", currentFilters);
            const transactions = await apiService.getTransactions(currentFilters);
            setData(transactions);
        } catch (err) {
            console.error("[useTransactions] Error fetching transactions", err);
            setResult()
            setResult('Error: ' + (err && err.message ? err.message : String(err)));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(filters);
    }, [filters, fetchData]);

    const refetch = useCallback(() => fetchData(filters, [fetchData, filters]));
    return { data, loading, error, refetch };
}