const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { IPC_CHANNELS, INDEX_CONFIG } = require('../shared/constants');
const { getSetting, setSetting, getAllSettings } = require('./settings');
const { getFileIndex, getIndexStatus, buildFileIndex, searchDirectoryLive, isIndexReady, resetIndex, startWatcher } = require('./indexer');
const { searchIndex, parseSearchQuery, createTermPatterns } = require('./search');
const { openPath, openInExplorer, openFolder, openInVscode, openInTerminal, openTerminalClaude, openVscodeClaude } = require('./file-actions');
const { hideWindow, getMainWindow, updateWindowPosition, updateWindowOpacity } = require('./window');
const { registerHotkey } = require('./hotkey');

function createProgressCallback() {
  const mainWindow = getMainWindow();
  if (!mainWindow) return null;
  return (progress) => {
    mainWindow.webContents.send(IPC_CHANNELS.INDEX_PROGRESS, progress);
  };
}

function setupIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.SEARCH_FILES, async (event, query) => {
    try {
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
        const termPatterns = createTermPatterns(searchTerms);

        for (const basePath of searchPaths) {
          if (results.length >= maxResults * 2) break;
          await searchDirectoryLive(basePath, termPatterns, results, maxResults * 2, 0, INDEX_CONFIG.liveSearchMaxDepth);
        }
      }

      if (showOnlyDirectories) {
        results = results.filter(item => item.isDirectory);
      }

      return results.slice(0, maxResults);
    } catch (err) {
      logger.error('Search error:', err.message);
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_INDEX_STATUS, () => {
    try {
      return getIndexStatus();
    } catch (err) {
      logger.error('Get index status error:', err.message);
      return { ready: false, count: 0, indexing: false };
    }
  });

  ipcMain.handle(IPC_CHANNELS.REBUILD_INDEX, async () => {
    try {
      resetIndex();
      const onProgress = createProgressCallback();
      await buildFileIndex(null, true, onProgress);
      return getIndexStatus();
    } catch (err) {
      logger.error('Rebuild index error:', err.message);
      return { ready: false, count: 0, indexing: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_PATH, async (event, filePath) => {
    try {
      return await openPath(filePath);
    } catch (err) {
      logger.error('Open path error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_IN_EXPLORER, async (event, filePath) => {
    try {
      return await openInExplorer(filePath);
    } catch (err) {
      logger.error('Open in explorer error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_FOLDER, async (event, filePath) => {
    try {
      return await openFolder(filePath);
    } catch (err) {
      logger.error('Open folder error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_IN_VSCODE, async (event, filePath) => {
    try {
      return await openInVscode(filePath);
    } catch (err) {
      logger.error('Open in VS Code error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_IN_TERMINAL, async (event, filePath) => {
    try {
      return await openInTerminal(filePath);
    } catch (err) {
      logger.error('Open in terminal error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_TERMINAL_CLAUDE, async (event, filePath) => {
    try {
      return await openTerminalClaude(filePath);
    } catch (err) {
      logger.error('Open terminal claude error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_VSCODE_CLAUDE, async (event, filePath) => {
    try {
      return await openVscodeClaude(filePath);
    } catch (err) {
      logger.error('Open VS Code claude error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    try {
      return getAllSettings();
    } catch (err) {
      logger.error('Get settings error:', err.message);
      return {};
    }
  });

  ipcMain.handle(IPC_CHANNELS.SET_SETTING, (event, key, value) => {
    try {
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
          const onProgress = createProgressCallback();
          buildFileIndex(() => {
            startWatcher();
          }, false, onProgress);
        }
      }

      return { success: true };
    } catch (err) {
      logger.error('Set setting error:', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SELECT_FOLDER, async () => {
    try {
      const mainWindow = getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    } catch (err) {
      logger.error('Select folder error:', err.message);
      return null;
    }
  });

  ipcMain.on(IPC_CHANNELS.HIDE_WINDOW, () => {
    try {
      hideWindow();
    } catch (err) {
      logger.error('Hide window error:', err.message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_FILE_PREVIEW, async (event, filePath, isDirectory) => {
    try {
      if (isDirectory) {
        const entries = await fs.promises.readdir(filePath, { withFileTypes: true });
        const contents = entries.slice(0, 20).map(entry => ({
          name: entry.name,
          isDirectory: entry.isDirectory()
        }));
        return { type: 'folder', contents };
      }

      const ext = path.extname(filePath).toLowerCase();
      const textExtensions = new Set([
        '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.less',
        '.html', '.htm', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
        '.py', '.rb', '.php', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go',
        '.rs', '.swift', '.kt', '.scala', '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
        '.sql', '.graphql', '.vue', '.svelte', '.astro', '.env', '.gitignore', '.editorconfig',
        '.prettierrc', '.eslintrc', '.babelrc', '.log'
      ]);

      const imageExtensions = new Set([
        '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico'
      ]);

      if (textExtensions.has(ext)) {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const lines = content.split('\n').slice(0, 50).join('\n');
        const truncated = lines.length < content.length ? lines + '\n...' : lines;
        return { type: 'text', content: truncated };
      }

      if (imageExtensions.has(ext)) {
        return { type: 'image' };
      }

      const stats = await fs.promises.stat(filePath);
      return {
        type: 'meta',
        meta: {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          extension: ext || 'Unknown'
        }
      };
    } catch (err) {
      logger.error('File preview error:', err.message);
      return { type: 'error', message: 'Cannot preview this file' };
    }
  });
}

module.exports = {
  setupIpcHandlers,
};
