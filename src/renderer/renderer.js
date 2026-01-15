const search = require('./components/search');
const settings = require('./components/settings');
const contextMenu = require('./components/context-menu');
const preview = require('./components/preview');

document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    searchInput: document.getElementById('searchInput'),
    searchWrapper: document.querySelector('.search-wrapper'),
    resultsList: document.getElementById('resultsList'),
    emptyState: document.getElementById('emptyState'),
    resultCount: document.getElementById('resultCount'),
    contextMenu: document.getElementById('contextMenu'),
    settingsPanel: document.getElementById('settingsPanel'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsClose: document.getElementById('settingsClose'),
    positionGrid: document.getElementById('positionGrid'),
    fontSizeSlider: document.getElementById('fontSizeSlider'),
    fontSizeValue: document.getElementById('fontSizeValue'),
    opacitySlider: document.getElementById('opacitySlider'),
    opacityValue: document.getElementById('opacityValue'),
    hotkeyInput: document.getElementById('hotkeyInput'),
    hotkeyDisplay: document.getElementById('hotkeyDisplay'),
    themeButtons: document.getElementById('themeButtons'),
    maxResultsSlider: document.getElementById('maxResultsSlider'),
    maxResultsValue: document.getElementById('maxResultsValue'),
    pathsList: document.getElementById('pathsList'),
    addPathBtn: document.getElementById('addPathBtn'),
    excludeTextarea: document.getElementById('excludeTextarea'),
    showOnlyDirectoriesToggle: document.getElementById('showOnlyDirectoriesToggle'),
    launchOnStartupToggle: document.getElementById('launchOnStartupToggle'),
    recentSearchesList: document.getElementById('recentSearchesList'),
    clearRecentBtn: document.getElementById('clearRecentBtn'),
    rebuildIndexBtn: document.getElementById('rebuildIndexBtn'),
    indexStatus: document.getElementById('indexStatus'),
    updateVersion: document.getElementById('updateVersion'),
    updateStatusText: document.getElementById('updateStatusText'),
    checkUpdateBtn: document.getElementById('checkUpdateBtn'),
    installUpdateBtn: document.getElementById('installUpdateBtn'),
    updateProgress: document.getElementById('updateProgress'),
    updateProgressFill: document.getElementById('updateProgressFill'),
    updateProgressText: document.getElementById('updateProgressText'),
    previewPanel: document.getElementById('previewPanel'),
    previewTitle: document.getElementById('previewTitle'),
    previewContent: document.getElementById('previewContent'),
    previewClose: document.getElementById('previewClose'),
  };

  contextMenu.init(elements.contextMenu);
  preview.init(elements);
  search.init(elements);
  settings.init(elements);
});
