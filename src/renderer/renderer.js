const search = require('./components/search');
const settings = require('./components/settings');
const contextMenu = require('./components/context-menu');

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
  };

  contextMenu.init(elements.contextMenu);
  search.init(elements);
  settings.init(elements);
});
