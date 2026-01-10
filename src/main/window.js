const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const { WINDOW_CONFIG, IPC_CHANNELS } = require('../shared/constants');
const { getSetting } = require('./settings');

let mainWindow = null;
let isVisible = false;
let ignoreBlur = false;

function isVirtualMachine() {
  const envHints = [
    process.env.VBOX_MSI_INSTALL_PATH,
    process.env.VMWARE_ROOT,
    process.env.QEMU_AUDIO_DRV,
  ].some(Boolean);

  const username = (process.env.USERNAME || process.env.USER || '').toLowerCase();
  const vmUsernames = ['vboxuser', 'vagrant', 'packer', 'vmware'];
  const hasVmUsername = vmUsernames.some(name => username.includes(name));

  const computerName = (process.env.COMPUTERNAME || '').toLowerCase();
  const vmComputerHints = ['virtualbox', 'vmware', 'qemu', 'hyperv', 'virtual'];
  const hasVmComputerName = vmComputerHints.some(hint => computerName.includes(hint));

  const fs = require('fs');
  const vmPaths = [
    'C:\\Program Files\\Oracle\\VirtualBox Guest Additions',
    'C:\\Program Files\\VMware\\VMware Tools',
  ];
  const hasVmPaths = vmPaths.some(p => fs.existsSync(p));

  return envHints || hasVmUsername || hasVmComputerName || hasVmPaths;
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const sessionName = process.env.SESSIONNAME || '';
  const isRemoteSession = sessionName && sessionName !== 'Console';
  const hasGpuIssues = app.commandLine.hasSwitch('disable-gpu');
  const isVM = isVirtualMachine();
  const useTransparency = !isRemoteSession && !hasGpuIssues && !isVM;

  mainWindow = new BrowserWindow({
    width: WINDOW_CONFIG.width,
    height: WINDOW_CONFIG.height,
    x: Math.floor((screenWidth - WINDOW_CONFIG.width) / 2),
    y: Math.floor(screenHeight * 0.2),
    frame: false,
    transparent: useTransparency,
    backgroundColor: useTransparency ? undefined : '#1a1a2e',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.on('blur', () => {
    if (!ignoreBlur) {
      hideWindow();
    }
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
  if (!mainWindow) {
    createWindow();
  }

  ignoreBlur = true;
  const cursor = screen.getCursorScreenPoint();
  const activeDisplay = screen.getDisplayNearestPoint(cursor);
  const pos = getWindowPosition(activeDisplay);

  mainWindow.setPosition(pos.x, pos.y);
  mainWindow.setOpacity(getSetting('opacity') / 100);
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send(IPC_CHANNELS.WINDOW_SHOWN);
  isVisible = true;
  setTimeout(() => { ignoreBlur = false; }, 200);
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
