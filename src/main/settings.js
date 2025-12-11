const { DEFAULT_SETTINGS } = require('../shared/constants');

let store = null;

async function initStore() {
  const Store = (await import('electron-store')).default;
  store = new Store({ defaults: DEFAULT_SETTINGS });
}

function getSetting(key) {
  return store ? store.get(key) : DEFAULT_SETTINGS[key];
}

function setSetting(key, value) {
  if (store) store.set(key, value);
}

function getAllSettings() {
  return {
    position: getSetting('position'),
    fontSize: getSetting('fontSize'),
    opacity: getSetting('opacity'),
    hotkey: getSetting('hotkey'),
    searchPaths: getSetting('searchPaths'),
    excludePatterns: getSetting('excludePatterns'),
    maxResults: getSetting('maxResults'),
    theme: getSetting('theme'),
    showOnlyDirectories: getSetting('showOnlyDirectories'),
  };
}

module.exports = {
  initStore,
  getSetting,
  setSetting,
  getAllSettings,
};
