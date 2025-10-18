/**
 * Preload script exposing a small secure API to the renderer.
 * - Uses contextBridge + ipcRenderer.invoke for request/response.
 * - Exposes a subscription helper for 'transfer-progress' events.
 */
const { contextBridge, ipcRenderer } = require('electron');

console.log('[preload] preload initialized');

contextBridge.exposeInMainWorld('electronAPI', {
    /**
     * Ping the main process for a quick round-trip test.
     * Usage: await window.electronAPI.ping({ any: 'payload' })
     */
    ping: async (payload) => {
        console.log('[preload] ping ->', payload);
        const res = await ipcRenderer.invoke('ping', payload);
        console.log('[preload] ping <-', res);
        return res;
    },

    /**
     * Ask main to open a folder picker and return the selected path (or null).
     */
    selectDestinationFolder: async () => {
        console.log('[preload] selectDestinationFolder invoked');
        const res = await ipcRenderer.invoke('select-destination-folder');
        console.log('[preload] selectDestinationFolder result=', res);
        return res;
    },

    /**
     * Start a transfer operation in the main process and return the result.
     * The renderer can also subscribe to transfer progress via onTransferProgress.
     */
    transferAlbums: async (payload) => {
        console.log('[preload] transferAlbums ->', payload && { albumsCount: Array.isArray(payload.albums) ? payload.albums.length : 0, destination: payload.destination });
        const res = await ipcRenderer.invoke('transfer-albums', payload);
        console.log('[preload] transferAlbums <-', res);
        return res;
    },

    /**
     * Subscribe to transfer progress notifications from the main process.
     * Returns an unsubscribe function.
     * Usage:
     *   const off = window.electronAPI.onTransferProgress(pct => console.log(pct));
     *   off(); // to unsubscribe
     */
    onTransferProgress: (cb) => {
        console.log('[preload] onTransferProgress subscribe');
        const listener = (event, progress) => {
            try {
                cb(progress);
            } catch (err) {
                console.error('[preload] onTransferProgress callback error', err);
            }
        };
        ipcRenderer.on('transfer-progress', listener);
        return () => {
            ipcRenderer.removeListener('transfer-progress', listener);
            console.log('[preload] onTransferProgress unsubscribe');
        };
    }
});