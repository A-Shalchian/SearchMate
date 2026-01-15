const { app, BrowserWindow } = require('electron');
const { initStore, getSetting } = require('./settings');
const { createWindow } = require('./window');
const { createTray } = require('./tray');
const { registerHotkey, unregisterAll } = require('./hotkey');
const { buildFileIndex, startWatcher, stopWatcher } = require('./indexer');
const { setupIpcHandlers } = require('./ipc-handlers');
const { toggleWindow, getMainWindow } = require('./window');
const { IPC_CHANNELS } = require('../shared/constants');
const { initDatabase, closeDatabase } = require('./database');
const { initUpdater, checkForUpdates } = require('./updater');
const logger = require('./logger');

app.whenReady().then(async () => {
  await initStore();

  initDatabase();

  setupIpcHandlers();

  const mainWindow = createWindow();
  createTray();

  registerHotkey(getSetting('hotkey'), toggleWindow);

  buildFileIndex((count) => {
    const win = getMainWindow();
    if (win) {
      win.webContents.send(IPC_CHANNELS.INDEX_READY, count);
    }
    startWatcher();
  });

  initUpdater();

  if (app.isPackaged) {
    setTimeout(() => {
      checkForUpdates().catch(err => {
        logger.error('Initial update check failed:', err.message);
      });
    }, 5000);
  }
});

app.on('will-quit', () => {
  unregisterAll();
  stopWatcher();
  closeDatabase();
});

app.on('window-all-closed', (e) => {
  e.preventDefault?.();
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
