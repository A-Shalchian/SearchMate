const { app, BrowserWindow, globalShortcut, ipcMain, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let isVisible = false;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const windowWidth = 700;
  const windowHeight = 500;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: Math.floor((screenWidth - windowWidth) / 2),
    y: Math.floor(screenHeight * 0.2),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('blur', () => {
    hideWindow();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function toggleWindow() {
  if (!mainWindow) {
    createWindow();
    showWindow();
    return;
  }

  if (isVisible) {
    hideWindow();
  } else {
    showWindow();
  }
}

function showWindow() {
  if (mainWindow) {
    // Reposition to active monitor
    const cursor = screen.getCursorScreenPoint();
    const activeDisplay = screen.getDisplayNearestPoint(cursor);
    const { x, y, width, height } = activeDisplay.workArea;

    const windowWidth = 700;
    const windowHeight = 500;

    mainWindow.setPosition(
      Math.floor(x + (width - windowWidth) / 2),
      Math.floor(y + height * 0.2)
    );

    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('window-shown');
    isVisible = true;
  }
}

function hideWindow() {
  if (mainWindow) {
    mainWindow.hide();
    mainWindow.webContents.send('window-hidden');
    isVisible = false;
  }
}

app.whenReady().then(() => {
  createWindow();

  // Register global shortcut Ctrl+Space
  const ret = globalShortcut.register('Control+Space', () => {
    toggleWindow();
  });

  if (!ret) {
    console.error('Failed to register global shortcut');
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('search-files', async (event, query) => {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const results = [];
  const searchPaths = [
    process.env.USERPROFILE || process.env.HOME,
    'C:\\',
  ];

  const maxResults = 100;
  const searchTerm = query.toLowerCase();

  for (const basePath of searchPaths) {
    if (results.length >= maxResults) break;
    await searchDirectory(basePath, searchTerm, results, maxResults, 0, 4);
  }

  return results.slice(0, maxResults);
});

async function searchDirectory(dirPath, searchTerm, results, maxResults, depth, maxDepth) {
  if (depth > maxDepth || results.length >= maxResults) return;

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (results.length >= maxResults) break;

      // Skip hidden and system directories
      if (entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === '$Recycle.Bin' ||
          entry.name === 'System Volume Information' ||
          entry.name === 'Windows' ||
          entry.name === 'Program Files' ||
          entry.name === 'Program Files (x86)' ||
          entry.name === 'ProgramData') {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);

      if (entry.name.toLowerCase().includes(searchTerm)) {
        results.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
        });
      }

      if (entry.isDirectory() && depth < maxDepth) {
        await searchDirectory(fullPath, searchTerm, results, maxResults, depth + 1, maxDepth);
      }
    }
  } catch (err) {
    // Ignore permission errors
  }
}

ipcMain.handle('open-path', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-in-explorer', async (event, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.on('hide-window', () => {
  hideWindow();
});
