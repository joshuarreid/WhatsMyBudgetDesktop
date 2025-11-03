/**
 * Generic API client base class built on axios.
 *
 * - Single axios instance per ApiClient instance
 * - Responsible for reading BASE_URL from process.env.BASE_URL when baseURL is not provided
 * - Centralizes generation and propagation of X-Transaction-ID header for every request
 * - Fetch-like makeRequest mapped to axios
 * - Thin HTTP helpers: get/post/put/patch/delete
 * - Centralized validation helpers (validateRequired, validateId)
 *
 * Important:
 *  - ApiClient will attempt to locate the application's base URL only from process.env.BASE_URL
 *    when the caller does not pass a baseURL. This keeps higher layers (resource clients,
 *    hooks, UI) free of any references to env/base URL configuration.
 *  - X-Transaction-ID is generated and attached by this client. Higher layers must NOT accept
 *    or pass transaction IDs.
 *
 * @module ApiClient
 */

import axios from 'axios';

/**
 * Standardized logger for debugging and traceability.
 * Never log sensitive values.
 *
 * @constant
 * @type {{info: Function, error: Function}}
 */
const logger = {
    info: (...args) => console.log('[ApiClient]', ...args),
    error: (...args) => console.error('[ApiClient]', ...args),
};

/**
 * Generate a stable, reasonably unique transaction id.
 * Uses crypto.randomUUID when available; falls back to timestamp+random string.
 *
 * @private
 * @returns {string}
 */
function generateTransactionId() {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
    } catch (e) {
        // ignore and fall back
    }
    // fallback
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Resolve the base URL for API requests from process.env.BASE_URL only.
 *
 * @private
 * @returns {string|null} base URL string or null if not found
 */
function resolveBaseUrlFromEnv() {
    if (typeof process !== 'undefined' && process.env && process.env.BASE_URL) {
        return String(process.env.BASE_URL).trim();
    }
    return null;
}

/**
 * Generic API client base class.
 */
export default class ApiClient {
    /**
     * Creates an instance of ApiClient.
     *
     * If baseURL is not provided the constructor will attempt to read it from process.env.BASE_URL.
     * Resource clients and layers above should not reference environment variables; they should construct ApiClient
     * without passing baseURL and let ApiClient resolve it.
     *
     * @param {Object} options
     * @param {string} [options.baseURL] - Base URL for the API (optional; resolved from process.env.BASE_URL when omitted)
     * @param {number} [options.timeout=10000] - Default request timeout in milliseconds
     * @param {string} [options.apiPath=''] - Base API path that will prefix resource paths (e.g. '/api')
     * @throws {Error} if baseURL cannot be resolved from options or process.env.BASE_URL
     */
    constructor({ baseURL, timeout = 10000, apiPath = '' } = {}) {
        logger.info('constructor called', { baseURLProvided: !!baseURL, timeout, apiPath });

        // Only source allowed: process.env.BASE_URL when baseURL not provided
        const resolvedBaseUrl = baseURL || resolveBaseUrlFromEnv();

        if (!resolvedBaseUrl || typeof resolvedBaseUrl !== 'string') {
            throw new Error(
                'ApiClient: baseURL must be provided or set in environment (process.env.BASE_URL)'
            );
        }

        this.baseURL = String(resolvedBaseUrl).replace(/\/+$/, '');
        this.apiPath = String(apiPath || '').replace(/^\/+|\/+$/g, '');

        this._defaultTransactionId = null; // optional: can be set for testing
        this.axios = axios.create({
            baseURL: this.baseURL,
            timeout,
            headers: { Accept: 'application/json' },
            withCredentials: true,
        });

        this._attachInterceptors();
    }

    /**
     * Attach basic interceptors. Subclasses can override _onRequest/_onResponse/_onError.
     *
     * @private
     * @returns {void}
     */
    _attachInterceptors() {
        this.axios.interceptors.request.use(
            (config) => this._onRequest(config),
            (err) => this._onError(err)
        );

        this.axios.interceptors.response.use(
            (res) => this._onResponse(res),
            (err) => this._onError(err)
        );
    }

    /**
     * Default request interceptor.
     * - Ensures Accept header
     * - Ensures X-Transaction-ID header is present (generated here)
     *
     * Higher layers must not set or read X-Transaction-ID; it is internal to ApiClient.
     *
     * @protected
     * @param {import('axios').InternalAxiosRequestConfig} config
     * @returns {import('axios').InternalAxiosRequestConfig}
     */
    _onRequest(config) {
        config.headers = config.headers || {};
        config.headers.Accept = config.headers.Accept || 'application/json';

        // If a caller set X-Transaction-ID explicitly in headers, respect it.
        // But typical usage should NOT set it; ApiClient will generate one.
        if (!config.headers['X-Transaction-ID'] && !config.headers['x-transaction-id']) {
            const tx = this._defaultTransactionId || generateTransactionId();
            config.headers['X-Transaction-ID'] = tx;
            // keep it in lowercase variant too to be safe for some servers
            config.headers['x-transaction-id'] = tx;
        }

        logger.info('_onRequest', config.method?.toUpperCase(), config.url, '[X-Transaction-ID attached]');
        return config;
    }

    /**
     * Default response interceptor. Logs X-Transaction-ID returned by server for traceability.
     *
     * @protected
     * @param {import('axios').AxiosResponse} response
     * @returns {import('axios').AxiosResponse}
     */
    _onResponse(response) {
        const respTx = response.headers && (response.headers['x-transaction-id'] || response.headers['X-Transaction-ID']);
        if (respTx) {
            logger.info('_onResponse', response.config?.url, 'status', response.status, 'X-Transaction-ID', respTx);
        } else {
            logger.info('_onResponse', response.config?.url, 'status', response.status);
        }
        return response;
    }

    /**
     * Default error interceptor: normalize and rethrow.
     *
     * @protected
     * @param {any} error
     * @throws {{message:string,status:number|null,data:any,originalError:any}}
     */
    _onError(error) {
        const normalized = this._normalizeError(error);
        logger.error('_onError', normalized.message, { status: normalized.status });
        throw normalized;
    }

    /**
     * Normalize axios or generic errors into a predictable shape.
     *
     * @private
     * @param {any} error
     * @returns {{ message: string, status: number|null, data: any, originalError: any }}
     */
    _normalizeError(error) {
        if (error && error.isAxiosError) {
            const status = error.response?.status ?? null;
            const data = error.response?.data ?? null;
            const message =
                (error.response && (error.response.data?.message || error.response.statusText)) ||
                error.message ||
                'Request failed';
            return { message, status, data, originalError: error };
        }

        if (error && error.name === 'AbortError') {
            return { message: 'Request was aborted', status: null, data: null, originalError: error };
        }

        return { message: error?.message || String(error), status: null, data: null, originalError: error };
    }

    /**
     * Build an endpoint combining the configured apiPath with a resource path and an optional relative path.
     *
     * @param {string} resourcePath - resource root (e.g. 'transactions')
     * @param {string} [relativePath=''] - path under the resource (e.g. '123' or 'upload')
     * @returns {string} joined endpoint (no leading slash)
     */
    resourceEndpoint(resourcePath, relativePath = '') {
        const r = String(resourcePath || '').replace(/^\/+|\/+$/g, '');
        const rel = String(relativePath || '').replace(/^\/+|\/+$/g, '');
        if (!r && !rel) return '';
        return rel ? `${r}/${rel}` : r;
    }

    /**
     * Internal helper to build final URL that axios will use (prefixes apiPath).
     *
     * @private
     * @param {string} endpoint - endpoint built via resourceEndpoint or raw endpoint (may include query)
     * @returns {string} path relative to baseURL passed to axios (starts with '/' unless empty)
     */
    _buildUrl(endpoint = '') {
        if (!endpoint) {
            return this.apiPath ? `/${this.apiPath}` : '/';
        }

        if (/^https?:\/\//i.test(endpoint)) return endpoint;

        const cleanEndpoint = String(endpoint).replace(/^\/+/, '');
        const prefix = this.apiPath ? `/${this.apiPath}` : '';
        return `${prefix}/${cleanEndpoint}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    }

    /**
     * Set a default X-Transaction-ID to be attached to all requests from this instance.
     * Useful for testing. Production callers typically won't use this.
     *
     * @param {string|null} txId - transaction id to force, or null to clear
     */
    setDefaultTransactionId(txId) {
        this._defaultTransactionId = txId ? String(txId) : null;
        logger.info('setDefaultTransactionId called', this._defaultTransactionId ? '[set]' : '[cleared]');
    }

    /**
     * Generic request executor. Accepts fetch-like options and converts to axios config.
     *
     * @async
     * @param {string} endpoint - endpoint returned by resourceEndpoint (no leading slash) or absolute URL
     * @param {Object} [options={}] - fetch-like options
     * @param {string} [options.method='GET']
     * @param {Object} [options.headers]
     * @param {Object} [options.params] - query params (axios will serialize)
     * @param {any} [options.body] - fetch-like body
     * @param {any} [options.data] - alias for body
     * @param {number} [options.timeout] - per-request timeout
     * @param {AbortSignal} [options.signal] - abort signal
     * @param {string} [options.responseType] - axios responseType
     * @param {boolean} [options.rawResponse=false] - return full axios response instead of response.data
     * @returns {Promise<any>} resolves with response.data (unless rawResponse true)
     */
    async makeRequest(endpoint, options = {}) {
        const {
            method = 'GET',
            headers = {},
            params = undefined,
            body = undefined,
            data = undefined,
            timeout = undefined,
            signal = undefined,
            responseType = undefined,
            rawResponse = false,
        } = options;

        const url = this._buildUrl(endpoint);
        logger.info('makeRequest', method?.toUpperCase(), url);

        const mergedHeaders = { ...(headers || {}) };

        // Ensure transaction id present on per-request headers (allow explicit override)
        if (!mergedHeaders['X-Transaction-ID'] && !mergedHeaders['x-transaction-id']) {
            const tx = this._defaultTransactionId || generateTransactionId();
            mergedHeaders['X-Transaction-ID'] = tx;
            mergedHeaders['x-transaction-id'] = tx;
        }

        let payload = data !== undefined ? data : body;

        const hasContentType = Object.keys(mergedHeaders).some((h) => h.toLowerCase() === 'content-type');
        const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;

        if (payload !== undefined && payload !== null && !hasContentType && !isFormData) {
            mergedHeaders['Content-Type'] = 'application/json';
        }

        const config = {
            url,
            method: String(method).toLowerCase(),
            headers: mergedHeaders,
            params,
            data: payload,
            timeout: typeof timeout === 'number' ? timeout : undefined,
            responseType,
        };

        if (signal) config.signal = signal;

        try {
            const response = await this.axios.request(config);
            // Log server-echoed transaction id if provided
            const serverTx = response.headers && (response.headers['x-transaction-id'] || response.headers['X-Transaction-ID']);
            if (serverTx) {
                logger.info('makeRequest completed', method?.toUpperCase(), url, 'serverTxId=', serverTx);
            }
            return rawResponse ? response : response.data;
        } catch (err) {
            const normalized = this._normalizeError(err);
            logger.error('makeRequest failed', method?.toUpperCase(), url, { status: normalized.status });
            throw normalized;
        }
    }

    /**
     * HTTP GET helper that appends params to the endpoint using URLSearchParams if provided.
     *
     * @async
     * @param {string} endpoint - endpoint returned by resourceEndpoint or absolute URL
     * @param {Object} [params={}]
     * @param {Object} [options={}] - additional makeRequest options
     * @returns {Promise<any>}
     */
    async get(endpoint, params = {}, options = {}) {
        let url = endpoint;
        if (params && Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (Array.isArray(value)) {
                        value.forEach((v) => v !== undefined && v !== null && searchParams.append(key, String(v)));
                    } else {
                        searchParams.append(key, String(value));
                    }
                }
            });
            const qs = searchParams.toString();
            if (qs) url += (String(url).includes('?') ? '&' : '?') + qs;
        }

        return this.makeRequest(url, { method: 'GET', ...options });
    }

    /**
     * HTTP POST helper. Attaches body only when provided.
     *
     * @async
     * @param {string} endpoint
     * @param {any|null} data
     * @param {Object} [options={}]
     * @returns {Promise<any>}
     */
    async post(endpoint, data = null, options = {}) {
        const config = { method: 'POST', ...options };
        if (data !== null && data !== undefined) {
            config.headers = { Accept: 'application/json', ...(options.headers || {}) };
            config.body = data;
        }
        return this.makeRequest(endpoint, config);
    }

    /**
     * HTTP PUT helper.
     *
     * @async
     * @param {string} endpoint
     * @param {any|null} data
     * @param {Object} [options={}]
     * @returns {Promise<any>}
     */
    async put(endpoint, data = null, options = {}) {
        const config = { method: 'PUT', ...options };
        if (data !== null && data !== undefined) {
            config.headers = { Accept: 'application/json', ...(options.headers || {}) };
            config.body = data;
        }
        return this.makeRequest(endpoint, config);
    }

    /**
     * HTTP PATCH helper.
     *
     * @async
     * @param {string} endpoint
     * @param {any|null} data
     * @param {Object} [options={}]
     * @returns {Promise<any>}
     */
    async patch(endpoint, data = null, options = {}) {
        const config = { method: 'PATCH', ...options };
        if (data !== null && data !== undefined) {
            config.headers = { Accept: 'application/json', ...(options.headers || {}) };
            config.body = data;
        }
        return this.makeRequest(endpoint, config);
    }

    /**
     * HTTP DELETE helper. Accepts optional params to be appended to URL.
     *
     * @async
     * @param {string} endpoint
     * @param {Object} [params={}]
     * @param {Object} [options={}]
     * @returns {Promise<any>}
     */
    async delete(endpoint, params = {}, options = {}) {
        let url = endpoint;
        if (params && Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (Array.isArray(value)) {
                        value.forEach((v) => v !== undefined && v !== null && searchParams.append(key, String(v)));
                    } else {
                        searchParams.append(key, String(value));
                    }
                }
            });
            const qs = searchParams.toString();
            if (qs) url += (String(url).includes('?') ? '&' : '?') + qs;
        }

        return this.makeRequest(url, { method: 'DELETE', ...options });
    }

    /**
     * Validate that a value is provided and optionally of a given type.
     *
     * @param {any} value - value to validate
     * @param {string} paramName - name used in error messages
     * @param {string|null} [type=null] - optional expected type: 'string'|'number'|'object'
     * @throws {Error} when validation fails
     */
    validateRequired(value, paramName, type = null) {
        if (value === null || value === undefined) {
            throw new Error(`${paramName} is required`);
        }

        if (type === 'string') {
            if (typeof value !== 'string' || value.trim() === '') {
                throw new Error(`${paramName} cannot be empty`);
            }
        }

        if (type === 'number') {
            if (typeof value !== 'number' || Number.isNaN(value)) {
                throw new Error(`${paramName} must be a valid number`);
            }
        }

        if (type === 'object') {
            if (typeof value !== 'object' || value === null) {
                throw new Error(`${paramName} must be an object`);
            }
        }
    }

    /**
     * Validate an identifier (numeric id). Accepts number or numeric-string.
     *
     * @param {any} id
     * @param {string} [resourceName='Resource']
     * @throws {Error} when id is missing or not numeric
     */
    validateId(id, resourceName = 'Resource') {
        if (id === null || id === undefined) {
            throw new Error(`${resourceName} id is required`);
        }

        const parsed = typeof id === 'string' && id.trim() !== '' ? Number(id) : id;
        if (parsed === null || parsed === undefined || Number.isNaN(Number(parsed)) || !Number.isFinite(Number(parsed))) {
            throw new Error(`${resourceName} id must be a valid number`);
        }
    }
}