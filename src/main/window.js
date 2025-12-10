const { BrowserWindow, screen } = require('electron');
const path = require('path');
const { WINDOW_CONFIG, IPC_CHANNELS } = require('../shared/constants');
const { getSetting } = require('./settings');

let mainWindow = null;
let isVisible = false;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: WINDOW_CONFIG.width,
    height: WINDOW_CONFIG.height,
    x: Math.floor((screenWidth - WINDOW_CONFIG.width) / 2),
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

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.on('blur', () => {
    hideWindow();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function getWindowPosition(display) {
  const { x, y, width, height } = display.workArea;
  const position = getSetting('position');
  const padding = WINDOW_CONFIG.padding;
  const windowWidth = WINDOW_CONFIG.width;
  const windowHeight = WINDOW_CONFIG.height;

  switch (position) {
    case 'top':
      return { x: Math.floor(x + (width - windowWidth) / 2), y: y + padding };
    case 'top-left':
      return { x: x + padding, y: y + padding };
    case 'top-right':
      return { x: x + width - windowWidth - padding, y: y + padding };
    case 'bottom':
      return { x: Math.floor(x + (width - windowWidth) / 2), y: y + height - windowHeight - padding };
    case 'bottom-left':
      return { x: x + padding, y: y + height - windowHeight - padding };
    case 'bottom-right':
      return { x: x + width - windowWidth - padding, y: y + height - windowHeight - padding };
    case 'center':
    default:
      return { x: Math.floor(x + (width - windowWidth) / 2), y: Math.floor(y + height * 0.2) };
  }
}

function showWindow() {
  if (mainWindow) {
    const cursor = screen.getCursorScreenPoint();
    const activeDisplay = screen.getDisplayNearestPoint(cursor);
    const pos = getWindowPosition(activeDisplay);

    mainWindow.setPosition(pos.x, pos.y);
    mainWindow.setOpacity(getSetting('opacity') / 100);
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send(IPC_CHANNELS.WINDOW_SHOWN);
    isVisible = true;
  }
}

function hideWindow() {
  if (mainWindow) {
    mainWindow.hide();
    mainWindow.webContents.send(IPC_CHANNELS.WINDOW_HIDDEN);
    isVisible = false;
  }
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

function getMainWindow() {
  return mainWindow;
}

function isWindowVisible() {
  return isVisible;
}

function updateWindowPosition() {
  if (mainWindow) {
    const cursor = screen.getCursorScreenPoint();
    const activeDisplay = screen.getDisplayNearestPoint(cursor);
    const pos = getWindowPosition(activeDisplay);
    mainWindow.setBounds({
      x: pos.x,
      y: pos.y,
      width: WINDOW_CONFIG.width,
      height: WINDOW_CONFIG.height
    });
  }
}

function updateWindowOpacity(opacity) {
  if (mainWindow) {
    mainWindow.setOpacity(opacity / 100);
  }
}

module.exports = {
  createWindow,
  showWindow,
  hideWindow,
  toggleWindow,
  getMainWindow,
  isWindowVisible,
  updateWindowPosition,
  updateWindowOpacity,
};
