const { contextBridge, ipcRenderer } = require('electron');

const VALID_INVOKE_CHANNELS = [
  'search-files',
  'get-index-status',
  'rebuild-index',
  'open-path',
  'open-in-explorer',
  'open-folder',
  'open-in-vscode',
  'open-in-terminal',
  'open-terminal-claude',
  'open-vscode-claude',
  'get-settings',
  'set-setting',
  'select-folder',
  'get-file-preview',
];

const VALID_SEND_CHANNELS = [
  'hide-window',
];

const VALID_RECEIVE_CHANNELS = [
  'window-shown',
  'window-hidden',
  'index-ready',
  'index-progress',
  'theme-changed',
];

contextBridge.exposeInMainWorld('api', {
  invoke: (channel, ...args) => {
    if (VALID_INVOKE_CHANNELS.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Invalid invoke channel: ${channel}`);
  },

  send: (channel, ...args) => {
    if (VALID_SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    } else {
      throw new Error(`Invalid send channel: ${channel}`);
    }
  },

  on: (channel, callback) => {
    if (VALID_RECEIVE_CHANNELS.includes(channel)) {
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
    throw new Error(`Invalid receive channel: ${channel}`);
  },

  once: (channel, callback) => {
    if (VALID_RECEIVE_CHANNELS.includes(channel)) {
      ipcRenderer.once(channel, (event, ...args) => callback(...args));
    } else {
      throw new Error(`Invalid receive channel: ${channel}`);
    }
  },
});
