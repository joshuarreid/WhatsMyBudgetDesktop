/**
 * Preload script exposing a secure API to the renderer.
 * Bulletproof React conventions: Standardized logging, JSDoc.
 * @module preload
 */
const { contextBridge, ipcRenderer } = require('electron');
console.log('[preload] script loaded');
const logger = {
    info: (...args) => console.log('[preload]', ...args),
    error: (...args) => console.error('[preload]', ...args),
};

contextBridge.exposeInMainWorld('electronAPI', {
    /**
     * Reads config file from main process.
     * @async
     * @returns {Promise<Object>}
     */
    readConfig: async () => {
        logger.info('readConfig invoked');
        try {
            const res = await ipcRenderer.invoke('read-config');
            logger.info('readConfig result=', res);
            return res;
        } catch (error) {
            logger.error('readConfig failed:', error);
            throw error;
        }
    },
    // Add additional API methods as needed, with JSDoc and logging.
});