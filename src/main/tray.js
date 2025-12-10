const { app, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { showWindow, toggleWindow } = require('./window');
const { buildFileIndex, resetIndex } = require('./indexer');

let tray = null;

function createTray() {
  const iconPath = path.join(__dirname, '..', 'icon.png');

  let trayIcon;
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else {
    trayIcon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANYSURBVFiF7ZdLiFVlGMd/5869OjOOzoyOo5lm5qRmGWVR0kUqCKKFRBAUBC2iRdCiaNGiTYsWtWjRpkUELdq0KAgKIqJFiyIoCIqi0kkznbHxMu+5nW8x5xzP3Lnn3hm7EP3hcDjf9/+/3/u/fd8R/mMT/7YAgEj8KSKPA4eAEmAAN/6JHxkZXlZxCbAbuAM4AhwG9ovI8L+FABEpAvcDjwJbgQqQAy4Xka+nTUA8BNwNPAzcBjSA08ChMPqYiJSmy0AU/SHgUeA6YC0wAJwWkR9F5NfpAojIJuAJYBvQDxTCn38VkR9EZPwaBDwN3AdsAqpAHBHZJyJnZwIg/utEZCvwGHALkAImgEsistcHMpUFHgoDLIq+f9FXHYF4Ug0sE5FDIpKfScRzQBKw+xCRHBCLSLHdR8MaACNAHngVeB14BfhypgFExI4qBGwH5gHTgcNACfi0k6Z2AHJADOgFpoCL0acfA+8Bb0VK2c4AbA4IFwIVYAhoBqz7oIgcbi8gxgcQ2wdICRgBfgfKQNTPPwV8BLwTiLYs0IiBRVHAi9RxYAQoBQWqfuaHwLsicqJdAOFGE9UH0Y0BXwNjQLnN2feBd0TkeDsBSJwP2AjkgH8pUgDGgc9F5DgRz7DdpXYdEJFqWKWnHu5FMvh0TxF7cXHrLfxv0O7Q6MHMHxwFCu2KYTcBGvWYLg0V4FXEY28CrwEvh+d1aIBYawDnCKfdjJuAJOMsXQFqwB/AmWDBOKYzaJXhwx++B1YB80VkXKdjbRdA4C1gIfBxCKATIkl/v+FPi2D1OPwcUAiLhC+G4wPXBBCdRvlokHWxdhwYCCKt1DEh5oDzwF5gD3AIRFI+SMgr2Y5ASoE9wJvAW8CuwEF8ETQQO12bA6Qd3gocAO5sJ+B64DYR+VpEftcqGGkdEqwBTgBfAS8F9ULXHCCR6bQH2AU8GdzaCSA2/RXgJWBXcHvHBCwHfiLYBzwMPBSuXBM6LBNdwPUJ2Ol/l9oFMA88Czxj+X9XKJJdAC8A94bfFYF28W0Sk83PAzuBl60+aKkLWoIIOF4DLgHPAzv8S1N5+h8BYvIPWAM8F/kIe4FBIBMGXgN2BpFTwNWZADgFPA3cBwxZLnBtoY/guvnb//+AfwC8cBywdS6YSAAAAABJRU5ErkJggg=='
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
        resetIndex();
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

  return tray;
}

function getTray() {
  return tray;
}

module.exports = {
  createTray,
  getTray,
};
