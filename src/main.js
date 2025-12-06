const { app, BrowserWindow, globalShortcut, ipcMain, screen, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');

let mainWindow = null;
let tray = null;
let isVisible = false;

let fileIndex = [];
let isIndexing = false;
let indexReady = false;

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

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');

  let trayIcon;
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else {
    trayIcon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANYSURBVFiF7ZdLiFVlGMd/5869OjOOzoyOo5lm5qRmGWVR0kUqCKKFRBAUBC2iRdCiaNGiTYsWtWjRpkUELdq0KAgKIqJFiyIoCIqi0kkznbHxMu+5nW8x5xzP3Lnn3hm7EP3hcDjf9/+/3/u/fd8R/mMT/7YAgEj8KSKPA4eAEmAAN/6JHxkZXlZxCbAbuAM4AhwG9ovI8L+FABEpAvcDjwJbgQqQAy4Xka+nTUA8BNwNPAzcBjSA08ChMPqYiJSny0AU/SHgUeA6YC0wAJwWkR9F5NfpAojIJuAJYBvQDxTCn38VkR9EZPwaBDwN3AdsAqpAHBHZJyJnZwIg/utEZCvwGHALkAImgEsistcHMpUFHgoDLIq+f9FXHYF4Ug0sE5FDIpKfScRzQBKw+xCRHBCLSLHdR8MaACNAHngVeB14BfhypgFExI4qBGwH5gHTgcNACfi0k6Z2AHJADOgFpoCL0acfA+8Bb0VK2c4AbA4IFwIVYAhoBqz7oIgcbi8gxgcQ2wdICRgBfgfKQNTPPwV8BLwTiLYs0IiBRVHAi9RxYAQoBQWqfuaHwLsicqJdAOFGE9UH0Y0BXwNjQLnN2feBd0TkeDsBSJwP2AjkgH8pUgDGgc9F5DgRz7DdpXYdEJFqWKWnHu5FMvh0TxF7cXHrLfxv0O7Q6MHMHxwFCu2KYTcBGvWYLg0V4FXEY28CrwEvh+d1aIBYawDnCKfdjJuAJOMsXQFqwB/AmWDBOKYzaJXhwx++B1YB80VkXKdjbRdA4C1gIfBxCKATIkl/v+FPi2D1OPwcUAiLhC+G4wPXBBCdRvlokHWxdhwYCCKt1DEh5oDzwF5gD3AIRFI+SMgr2Y5ASoE9wJvAW8CuwEF8ETQQO12bA6Qd3gocAO5sJ+B64DYR+VpEftcqGGkdEqwBTgBfAS8F9ULXHCCR6bQH2AU8GdzaCSA2/RXgJWBXcHvHBCwHfiLYBzwMPBSuXBM6LBNdwPUJ2Ol/l9oFMA88Czxj+X9XKJJdAC8A94bfFYF28W0Sk83PAzuBl60+aKkLWoIIOF4DLgHPAzv8S1N5+h8BYvIPWAM8F/kIe4FBIBMGXgN2BpFTwNWZADgFPA3cBwxZLnBtoY/guvnb//+AfwC8cBywdS6YSAAAAABJRU5ErkJggg=='
    );
  }

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open SearchMate',
      click: () => showWindow()
    },
    {
      label: 'Rebuild Index',
      click: () => {
        indexReady = false;
        buildFileIndex();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('SearchMate - Ctrl+Space to search');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    toggleWindow();
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  const ret = globalShortcut.register('Control+Space', () => {
    toggleWindow();
  });

  if (!ret) {
    console.error('Failed to register global shortcut');
  }

  buildFileIndex();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
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

const SKIP_DIRS = new Set([
  'node_modules', '$Recycle.Bin', 'System Volume Information',
  'Windows', 'ProgramData', 'AppData', 'Recovery',
  '.git', '.svn', '.hg', 'cache', 'Cache', '.cache',
  'tmp', 'temp', 'Temp', '.tmp', '__pycache__',
]);

const SKIP_EXTENSIONS = new Set([
  '.dll', '.exe', '.sys', '.msi', '.cab', '.log',
  '.tmp', '.temp', '.bak', '.swp',
]);

async function buildFileIndex() {
  if (isIndexing) return;
  isIndexing = true;
  fileIndex = [];

  const searchPaths = [
    process.env.USERPROFILE || process.env.HOME,
  ];

  console.log('Starting file indexing...');
  const startTime = Date.now();

  for (const basePath of searchPaths) {
    await indexDirectory(basePath, 0, 8);
  }

  isIndexing = false;
  indexReady = true;
  console.log(`Indexing complete: ${fileIndex.length} files in ${Date.now() - startTime}ms`);

  if (mainWindow) {
    mainWindow.webContents.send('index-ready', fileIndex.length);
  }
}

async function indexDirectory(dirPath, depth, maxDepth) {
  if (depth > maxDepth) return;

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) {
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (SKIP_EXTENSIONS.has(ext)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const isDir = entry.isDirectory();

      fileIndex.push({
        name: entry.name,
        nameLower: entry.name.toLowerCase(),
        path: fullPath,
        isDirectory: isDir,
      });

      if (isDir && depth < maxDepth) {
        await indexDirectory(fullPath, depth + 1, maxDepth);
      }
    }
  } catch (err) {}
}

function getMatchScore(name, searchTerms) {
  const nameLower = name.toLowerCase();
  let score = 0;

  for (const term of searchTerms) {
    if (!term) continue;

    if (nameLower === term) {
      score += 1000;
    }
    else if (nameLower.startsWith(term)) {
      score += 500 + (term.length * 10);
    }
    else if (new RegExp(`[\\s_\\-.]${term}`, 'i').test(name)) {
      score += 300 + (term.length * 5);
    }
    else if (nameLower.includes(term)) {
      score += 100 + (term.length * 2);
    }
    else if (fuzzyMatch(nameLower, term)) {
      score += 50;
    }
    else {
      return 0;
    }
  }

  score += Math.max(0, 50 - name.length);

  return score;
}

function fuzzyMatch(str, pattern) {
  let patternIdx = 0;
  for (let i = 0; i < str.length && patternIdx < pattern.length; i++) {
    if (str[i] === pattern[patternIdx]) {
      patternIdx++;
    }
  }
  return patternIdx === pattern.length;
}

ipcMain.handle('search-files', async (event, query) => {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
  const maxResults = 100;

  if (indexReady && fileIndex.length > 0) {
    const scored = [];

    for (const item of fileIndex) {
      const score = getMatchScore(item.name, searchTerms);
      if (score > 0) {
        scored.push({ ...item, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, maxResults).map(({ name, path, isDirectory }) => ({
      name, path, isDirectory
    }));
  }

  const results = [];
  const searchPaths = [process.env.USERPROFILE || process.env.HOME];

  for (const basePath of searchPaths) {
    if (results.length >= maxResults) break;
    await searchDirectoryLive(basePath, searchTerms, results, maxResults, 0, 5);
  }

  return results.slice(0, maxResults);
});

async function searchDirectoryLive(dirPath, searchTerms, results, maxResults, depth, maxDepth) {
  if (depth > maxDepth || results.length >= maxResults) return;

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (results.length >= maxResults) break;

      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const score = getMatchScore(entry.name, searchTerms);

      if (score > 0) {
        results.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          score,
        });
      }

      if (entry.isDirectory() && depth < maxDepth) {
        await searchDirectoryLive(fullPath, searchTerms, results, maxResults, depth + 1, maxDepth);
      }
    }
  } catch (err) {}
}

ipcMain.handle('get-index-status', () => {
  return { ready: indexReady, count: fileIndex.length, indexing: isIndexing };
});

ipcMain.handle('rebuild-index', async () => {
  indexReady = false;
  await buildFileIndex();
  return { ready: indexReady, count: fileIndex.length };
});

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

ipcMain.handle('open-folder', async (event, filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    const folderPath = stats.isDirectory() ? filePath : path.dirname(filePath);
    await shell.openPath(folderPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-in-vscode', async (event, filePath) => {
  try {
    exec(`code "${filePath}"`, { shell: true }, (error) => {
      if (error) {
        // Fallback to full path
        const vscodePath = path.join(process.env.LOCALAPPDATA, 'Programs', 'Microsoft VS Code', 'Code.exe');
        exec(`"${vscodePath}" "${filePath}"`, { shell: true });
      }
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-in-terminal', async (event, filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    const folderPath = stats.isDirectory() ? filePath : path.dirname(filePath);

    exec(`start wt -d "${folderPath}"`, { shell: true }, (error) => {
      if (error) {
        exec(`start cmd /k "cd /d "${folderPath}""`, { shell: true });
      }
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-terminal-claude', async (event, filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    const folderPath = stats.isDirectory() ? filePath : path.dirname(filePath);

    exec(`start wt -d "${folderPath}" cmd /k "claude"`, { shell: true }, (error) => {
      if (error) {
        exec(`start cmd /k "cd /d "${folderPath}" && claude"`, { shell: true });
      }
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-vscode-claude', async (event, filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    const folderPath = stats.isDirectory() ? filePath : path.dirname(filePath);

    // Open VS Code with the folder
    exec(`code "${folderPath}"`, { shell: true });

    // Wait for VS Code to open, then open terminal and type claude
    setTimeout(() => {
      exec(`code -r --command workbench.action.terminal.new`, { shell: true });

      // Wait for terminal to open, then send keystrokes
      setTimeout(() => {
        const psCommand = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('claude{ENTER}')"`;
        exec(psCommand, { shell: true });
      }, 800);
    }, 2000);

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.on('hide-window', () => {
  hideWindow();
});
