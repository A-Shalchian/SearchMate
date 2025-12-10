const { globalShortcut } = require('electron');

let currentHotkey = null;

function registerHotkey(hotkey, callback) {
  if (currentHotkey) {
    globalShortcut.unregister(currentHotkey);
  }

  const success = globalShortcut.register(hotkey, callback);

  if (success) {
    currentHotkey = hotkey;
    return true;
  }
  return false;
}

function unregisterAll() {
  globalShortcut.unregisterAll();
}

function getCurrentHotkey() {
  return currentHotkey;
}

module.exports = {
  registerHotkey,
  unregisterAll,
  getCurrentHotkey,
};
