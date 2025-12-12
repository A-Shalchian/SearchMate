const { ipcMain, dialog } = require('electron');
const { IPC_CHANNELS, INDEX_CONFIG } = require('../shared/constants');
const { getSetting, setSetting, getAllSettings } = require('./settings');
const { getFileIndex, getIndexStatus, buildFileIndex, searchDirectoryLive, isIndexReady, resetIndex, startWatcher } = require('./indexer');
const { searchIndex, parseSearchQuery } = require('./search');
const { openPath, openInExplorer, openFolder, openInVscode, openInTerminal, openTerminalClaude, openVscodeClaude } = require('./file-actions');
const { hideWindow, getMainWindow, updateWindowPosition, updateWindowOpacity } = require('./window');
const { registerHotkey } = require('./hotkey');

function setupIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.SEARCH_FILES, async (event, query) => {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const maxResults = getSetting('maxResults') || 100;
    const showOnlyDirectories = getSetting('showOnlyDirectories') || false;
    const fileIndex = getFileIndex();

    let results;
    if (isIndexReady() && fileIndex.length > 0) {
      results = searchIndex(fileIndex, query, maxResults * 2);
    } else {
      results = [];
      const searchPaths = [process.env.USERPROFILE || process.env.HOME];
      const searchTerms = parseSearchQuery(query);

      for (const basePath of searchPaths) {
        if (results.length >= maxResults * 2) break;
        await searchDirectoryLive(basePath, searchTerms, results, maxResults * 2, 0, INDEX_CONFIG.liveSearchMaxDepth);
      }
    }

    if (showOnlyDirectories) {
      results = results.filter(item => item.isDirectory);
    }

    return results.slice(0, maxResults);
  });

  ipcMain.handle(IPC_CHANNELS.GET_INDEX_STATUS, () => {
    return getIndexStatus();
  });

  ipcMain.handle(IPC_CHANNELS.REBUILD_INDEX, async () => {
    resetIndex();
    await buildFileIndex();
    return getIndexStatus();
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_PATH, async (event, filePath) => {
    return openPath(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_IN_EXPLORER, async (event, filePath) => {
    return openInExplorer(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_FOLDER, async (event, filePath) => {
    return openFolder(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_IN_VSCODE, async (event, filePath) => {
    return openInVscode(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_IN_TERMINAL, async (event, filePath) => {
    return openInTerminal(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_TERMINAL_CLAUDE, async (event, filePath) => {
    return openTerminalClaude(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_VSCODE_CLAUDE, async (event, filePath) => {
    return openVscodeClaude(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return getAllSettings();
  });

  ipcMain.handle(IPC_CHANNELS.SET_SETTING, (event, key, value) => {
    const mainWindow = getMainWindow();

    if (key === 'hotkey') {
      const success = registerHotkey(value, () => {
        const { toggleWindow } = require('./window');
        toggleWindow();
      });
      if (!success) {
        return { success: false, error: 'Failed to register hotkey. It may be in use by another application.' };
      }
    }

    setSetting(key, value);

    if (mainWindow) {
      if (key === 'opacity') {
        updateWindowOpacity(value);
      }

      if (key === 'position') {
        updateWindowPosition();
      }

      if (key === 'theme') {
        mainWindow.webContents.send(IPC_CHANNELS.THEME_CHANGED, value);
      }

      if (key === 'searchPaths' || key === 'excludePatterns') {
        buildFileIndex(() => {
          startWatcher();
        });
      }
    }

    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.SELECT_FOLDER, async () => {
    const mainWindow = getMainWindow();
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.on(IPC_CHANNELS.HIDE_WINDOW, () => {
    hideWindow();
  });
}

module.exports = {
  setupIpcHandlers,
};
