/**
 * Preload script exposing a small secure API to the renderer.
 * - Uses contextBridge + ipcRenderer.invoke for request/response.
 * - Exposes a subscription helper for 'transfer-progress' events.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

    /**
     * Read config file from main process
     */
    readConfig: async () => {
        console.log('[preload] readConfig invoked');
        const res = await ipcRenderer.invoke('read-config');
        console.log('[preload] readConfig result=', res);
        return res;
    },
});