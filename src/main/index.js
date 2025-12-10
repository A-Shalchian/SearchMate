const { app, BrowserWindow } = require('electron');
const { initStore, getSetting } = require('./settings');
const { createWindow } = require('./window');
const { createTray } = require('./tray');
const { registerHotkey, unregisterAll } = require('./hotkey');
const { buildFileIndex } = require('./indexer');
const { setupIpcHandlers } = require('./ipc-handlers');
const { toggleWindow, getMainWindow } = require('./window');
const { IPC_CHANNELS } = require('../shared/constants');
const { initDatabase, closeDatabase } = require('./database');

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
  });
});

app.on('will-quit', () => {
  unregisterAll();
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
