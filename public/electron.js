/**
 * Main Electron process (mirrored from TuneStick).
 * Bulletproof React conventions: Robust path handling, standardized logging, JSDoc throughout.
 *
 * @module electron-main
 */
const path = require('path');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
require('dotenv').config();

const logger = {
    info: (...args) => console.log('[electron-main]', ...args),
    error: (...args) => console.error('[electron-main]', ...args),
};

/**
 * Heuristic for development mode.
 * @returns {boolean}
 */
const isDev = process.env.NODE_ENV === 'development' || process.defaultApp || /node_modules[\\/]electron[\\/]/.test(process.execPath);

/**
 * Create the main BrowserWindow and load the correct entry point.
 * @function createMainWindow
 * @returns {BrowserWindow}
 */
function createMainWindow() {
    logger.info('Creating BrowserWindow');
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    // Load the app (mirrored logic)
    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../build/index.html')}`;

    logger.info('Loading URL:', startUrl);
    mainWindow.loadURL(startUrl);

    // Open DevTools in development
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    return mainWindow;
}

/**
 * IPC Handlers
 */
ipcMain.handle('ping', async (event, payload) => {
    logger.info('ipcHandler ping received', { payload });
    const response = { pong: true, received: payload, ts: new Date().toISOString() };
    logger.info('ipcHandler ping responding', response);
    return response;
});

ipcMain.handle('select-destination-folder', async () => {
    logger.info('select-destination-folder invoked');
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Destination Folder'
    });
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        logger.info('select-destination-folder canceled');
        return null;
    }
    logger.info('select-destination-folder path=', result.filePaths[0]);
    return result.filePaths[0];
});

ipcMain.handle('transfer-albums', async (event, data) => {
    logger.info('transfer-albums invoked', { albumsCount: Array.isArray(data?.albums) ? data.albums.length : 0, destination: data?.destination });
    try {
        const totalSteps = 20;
        for (let step = 1; step <= totalSteps; step++) {
            const pct = Math.round((step / totalSteps) * 100);
            event.sender.send('transfer-progress', pct);
            await new Promise(resolve => setTimeout(resolve, 80));
        }
        logger.info('transfer-albums complete');
        return { success: true };
    } catch (err) {
        logger.error('transfer-albums error', err);
        return { success: false, message: err.message || String(err) };
    }
});

/**
 * App lifecycle handlers.
 */
process.on('uncaughtException', (err) => logger.error('Uncaught Exception:', err));
process.on('unhandledRejection', (reason) => logger.error('Unhandled Rejection:', reason));

app.on('ready', () => {
    logger.info('app ready');
    try {
        createMainWindow();
    } catch (err) {
        logger.error('Error creating main window', err);
    }
});

app.on('activate', () => {
    logger.info('app activate');
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

app.on('window-all-closed', () => {
    logger.info('window-all-closed platform=%s', process.platform);
    if (process.platform !== 'darwin') {
        logger.info('quitting app');
        app.quit();
    } else {
        logger.info('macOS - keeping app active');
    }
});

// Removed config file logic. Use environment variables instead.

/**
 * Example: Access environment variables
 * const myValue = process.env.MY_CONFIG_VAR;
 */

// If you need config values, use process.env directly:
// Example:
// const apiUrl = process.env.API_URL;
// logger.info('API_URL from env:', apiUrl);
