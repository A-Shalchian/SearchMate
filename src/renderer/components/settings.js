const { applyTheme, applyFontSize } = require('./theme');
const search = require('./search');

let settingsPanel = null;
let settingsBtn = null;
let settingsClose = null;
let positionGrid = null;
let fontSizeSlider = null;
let fontSizeValue = null;
let opacitySlider = null;
let opacityValue = null;
let hotkeyInput = null;
let hotkeyDisplay = null;
let themeButtons = null;
let maxResultsSlider = null;
let maxResultsValue = null;
let pathsList = null;
let addPathBtn = null;
let excludeTextarea = null;
let searchInput = null;
let showOnlyDirectoriesToggle = null;

let settingsOpen = false;
let recordingHotkey = false;
let excludeTimeout = null;

function init(elements) {
  settingsPanel = elements.settingsPanel;
  settingsBtn = elements.settingsBtn;
  settingsClose = elements.settingsClose;
  positionGrid = elements.positionGrid;
  fontSizeSlider = elements.fontSizeSlider;
  fontSizeValue = elements.fontSizeValue;
  opacitySlider = elements.opacitySlider;
  opacityValue = elements.opacityValue;
  hotkeyInput = elements.hotkeyInput;
  hotkeyDisplay = elements.hotkeyDisplay;
  themeButtons = elements.themeButtons;
  maxResultsSlider = elements.maxResultsSlider;
  maxResultsValue = elements.maxResultsValue;
  pathsList = elements.pathsList;
  addPathBtn = elements.addPathBtn;
  excludeTextarea = elements.excludeTextarea;
  searchInput = elements.searchInput;
  showOnlyDirectoriesToggle = elements.showOnlyDirectoriesToggle;

  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    open();
  });

  settingsClose.addEventListener('click', close);

  settingsPanel.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  setupPositionGrid();
  setupSliders();
  setupHotkeyInput();
  setupThemeButtons();
  setupPathsUI();
  setupExcludeTextarea();
  setupDirectoriesToggle();
  setupKeyboardShortcuts();
  setupClickOutside();

  window.api.on('theme-changed', (theme) => {
    applyTheme(theme);
  });

  load();
}

function open() {
  settingsPanel.classList.add('visible');
  settingsOpen = true;
}

function close() {
  settingsPanel.classList.remove('visible');
  settingsOpen = false;
  searchInput.focus();
}

function isOpen() {
  return settingsOpen;
}

async function load() {
  const settings = await window.api.invoke('get-settings');

  positionGrid.querySelectorAll('.position-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.position === settings.position);
  });

  fontSizeSlider.value = settings.fontSize;
  fontSizeValue.textContent = settings.fontSize;
  opacitySlider.value = settings.opacity;
  opacityValue.textContent = settings.opacity;
  maxResultsSlider.value = settings.maxResults;
  maxResultsValue.textContent = settings.maxResults;

  hotkeyDisplay.textContent = formatHotkey(settings.hotkey);

  themeButtons.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === settings.theme);
  });

  renderPaths(settings.searchPaths || []);
  excludeTextarea.value = (settings.excludePatterns || []).join('\n');
  showOnlyDirectoriesToggle.checked = settings.showOnlyDirectories || false;

  applyFontSize(settings.fontSize);
  applyTheme(settings.theme);
}

function formatHotkey(hotkey) {
  return hotkey
    .replace('Control', 'Ctrl')
    .replace('Meta', 'Cmd')
    .replace('+', ' + ');
}

function renderPaths(paths) {
  if (paths.length === 0) {
    pathsList.innerHTML = '<div class="path-item"><span>Default: User home folder</span></div>';
    return;
  }

  pathsList.innerHTML = paths.map((p, i) => `
    <div class="path-item">
      <span title="${p}">${p}</span>
      <button class="path-remove" data-index="${i}">&times;</button>
    </div>
  `).join('');

  pathsList.querySelectorAll('.path-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const index = parseInt(btn.dataset.index);
      const settings = await window.api.invoke('get-settings');
      const newPaths = settings.searchPaths.filter((_, i) => i !== index);
      await window.api.invoke('set-setting', 'searchPaths', newPaths);
      renderPaths(newPaths);
    });
  });
}

function setupPositionGrid() {
  positionGrid.querySelectorAll('.position-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const position = btn.dataset.position;
      await window.api.invoke('set-setting', 'position', position);

      positionGrid.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function setupSliders() {
  fontSizeSlider.addEventListener('input', async (e) => {
    const size = parseInt(e.target.value);
    fontSizeValue.textContent = size;
    applyFontSize(size);
    await window.api.invoke('set-setting', 'fontSize', size);
  });

  opacitySlider.addEventListener('input', async (e) => {
    const opacity = parseInt(e.target.value);
    opacityValue.textContent = opacity;
    await window.api.invoke('set-setting', 'opacity', opacity);
  });

  maxResultsSlider.addEventListener('input', async (e) => {
    const maxResults = parseInt(e.target.value);
    maxResultsValue.textContent = maxResults;
    await window.api.invoke('set-setting', 'maxResults', maxResults);
    search.refreshSearch();
  });
}

function setupHotkeyInput() {
  hotkeyInput.addEventListener('click', () => {
    recordingHotkey = true;
    hotkeyInput.classList.add('recording');
    hotkeyDisplay.textContent = 'Press keys...';
  });

  hotkeyInput.addEventListener('keydown', async (e) => {
    if (!recordingHotkey) return;
    e.preventDefault();

    const parts = [];
    if (e.ctrlKey) parts.push('Control');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Meta');

    const key = e.key;
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      parts.push(key.length === 1 ? key.toUpperCase() : key);

      if (parts.length >= 2) {
        const hotkey = parts.join('+');
        const result = await window.api.invoke('set-setting', 'hotkey', hotkey);

        if (result.success) {
          hotkeyDisplay.textContent = formatHotkey(hotkey);
        } else {
          hotkeyDisplay.textContent = 'Failed - try another';
          setTimeout(() => load(), 2000);
        }

        recordingHotkey = false;
        hotkeyInput.classList.remove('recording');
      }
    }
  });

  hotkeyInput.addEventListener('blur', () => {
    if (recordingHotkey) {
      recordingHotkey = false;
      hotkeyInput.classList.remove('recording');
      load();
    }
  });
}

function setupThemeButtons() {
  themeButtons.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const theme = btn.dataset.theme;
      await window.api.invoke('set-setting', 'theme', theme);

      themeButtons.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyTheme(theme);
    });
  });
}

function setupPathsUI() {
  addPathBtn.addEventListener('click', async () => {
    const result = await window.api.invoke('select-folder');
    if (result) {
      const settings = await window.api.invoke('get-settings');
      const newPaths = [...(settings.searchPaths || []), result];
      await window.api.invoke('set-setting', 'searchPaths', newPaths);
      renderPaths(newPaths);
    }
  });
}

function setupExcludeTextarea() {
  excludeTextarea.addEventListener('input', () => {
    if (excludeTimeout) clearTimeout(excludeTimeout);
    excludeTimeout = setTimeout(async () => {
      const patterns = excludeTextarea.value
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);
      await window.api.invoke('set-setting', 'excludePatterns', patterns);
    }, 500);
  });
}

function setupDirectoriesToggle() {
  showOnlyDirectoriesToggle.addEventListener('change', async () => {
    await window.api.invoke('set-setting', 'showOnlyDirectories', showOnlyDirectoriesToggle.checked);
    search.refreshSearch();
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsOpen) {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  });
}

function setupClickOutside() {
  document.addEventListener('click', (e) => {
    if (settingsOpen && !settingsPanel.contains(e.target) && e.target !== settingsBtn) {
      close();
    }
  });
}

module.exports = {
  init,
  open,
  close,
  isOpen,
  load,
};
