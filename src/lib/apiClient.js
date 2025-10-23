const logger = {
    info: (...args) => console.log('[apiClient]', ...args),
    error: (...args) => console.error('[apiClient]', ...args),
};

import axios from 'axios';
import config from '../wmbservice-config.json';
const BASE_URL = config.baseUrl || '';

function generateTransactionId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    } else {
        return 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: config.defaultHeaders || {},
    timeout: 10000,
});

// Request interceptor: add Tx ID and log
apiClient.interceptors.request.use(
    (request) => {
        const tx = generateTransactionId();
        request.headers = request.headers || {};
        request.headers['X-Transaction-ID'] = tx;
        logger.info('request', {
            url: request.baseURL ? (request.baseURL + (request.url || '')) : request.url,
            method: request.method,
            params: request.params,
            dataPreview: request.data ? (typeof request.data === 'object' ? { ...request.data } : request.data) : undefined,
            transactionId: tx,
        });
        return request;
    },
    (err) => {
        logger.error('request error', err);
        return Promise.reject(err);
    }
);

// Response interceptor: log success and normalize errors
apiClient.interceptors.response.use(
    (resp) => {
        logger.info('response', {
            url: resp.config?.url,
            status: resp.status,
            dataPreview: resp.data && (typeof resp.data === 'object' ? { ...resp.data } : resp.data),
        });
        return resp;
    },
    (err) => {
        // Try to extract useful info for logging
        const status = err?.response?.status;
        const url = err?.config?.url;
        const message = err?.response?.data?.message || err.message;
        logger.error('response error', { url, status, message, raw: err });
        // Optionally: attach normalized error payload
        return Promise.reject(err);
    }
);

export { apiClient };
export default apiClient;