const { autoUpdater } = require('electron-updater');
const logger = require('./logger');
const { getMainWindow } = require('./window');
const { IPC_CHANNELS } = require('../shared/constants');

let updateAvailable = false;
let updateDownloaded = false;
let updateInfo = null;

function sendUpdateEvent(channel, data) {
  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send(channel, data);
  }
}

function initUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    sendUpdateEvent(IPC_CHANNELS.UPDATE_STATUS, { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    updateAvailable = true;
    updateInfo = info;
    sendUpdateEvent(IPC_CHANNELS.UPDATE_AVAILABLE, {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    updateAvailable = false;
    sendUpdateEvent(IPC_CHANNELS.UPDATE_NOT_AVAILABLE, {
      currentVersion: info.version,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateEvent(IPC_CHANNELS.UPDATE_PROGRESS, {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateDownloaded = true;
    sendUpdateEvent(IPC_CHANNELS.UPDATE_DOWNLOADED, {
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    logger.error('Auto-updater error:', err.message);
    sendUpdateEvent(IPC_CHANNELS.UPDATE_ERROR, {
      error: err.message,
    });
  });
}

async function checkForUpdates() {
  try {
    return await autoUpdater.checkForUpdates();
  } catch (err) {
    logger.error('Check for updates error:', err.message);
    throw err;
  }
}

async function downloadUpdate() {
  try {
    return await autoUpdater.downloadUpdate();
  } catch (err) {
    logger.error('Download update error:', err.message);
    throw err;
  }
}

function installUpdate() {
  autoUpdater.quitAndInstall(false, true);
}

function getUpdateState() {
  return {
    updateAvailable,
    updateDownloaded,
    updateInfo,
  };
}

module.exports = {
  initUpdater,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  getUpdateState,
};
