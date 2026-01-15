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
let launchOnStartupToggle = null;
let recentSearchesList = null;
let clearRecentBtn = null;
let rebuildIndexBtn = null;
let indexStatus = null;
let updateVersion = null;
let updateStatusText = null;
let checkUpdateBtn = null;
let installUpdateBtn = null;
let updateProgress = null;
let updateProgressFill = null;
let updateProgressText = null;

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
  launchOnStartupToggle = elements.launchOnStartupToggle;
  recentSearchesList = elements.recentSearchesList;
  clearRecentBtn = elements.clearRecentBtn;
  rebuildIndexBtn = elements.rebuildIndexBtn;
  indexStatus = elements.indexStatus;
  updateVersion = elements.updateVersion;
  updateStatusText = elements.updateStatusText;
  checkUpdateBtn = elements.checkUpdateBtn;
  installUpdateBtn = elements.installUpdateBtn;
  updateProgress = elements.updateProgress;
  updateProgressFill = elements.updateProgressFill;
  updateProgressText = elements.updateProgressText;

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
  setupLaunchOnStartup();
  setupRecentSearches();
  setupRebuildButton();
  setupUpdateUI();
  setupKeyboardShortcuts();
  setupClickOutside();

  window.api.on('theme-changed', (theme) => {
    applyTheme(theme);
  });

  load();
}

async function open() {
  settingsPanel.classList.add('visible');
  settingsOpen = true;

  // Refresh recent searches when opening settings
  const searches = await window.api.invoke('get-recent-searches');
  renderRecentSearches(searches);
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
  launchOnStartupToggle.checked = settings.launchOnStartup || false;
  renderRecentSearches(settings.recentSearches || []);

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

function setupLaunchOnStartup() {
  launchOnStartupToggle.addEventListener('change', async () => {
    await window.api.invoke('set-setting', 'launchOnStartup', launchOnStartupToggle.checked);
  });
}

function setupRecentSearches() {
  clearRecentBtn.addEventListener('click', async () => {
    await window.api.invoke('clear-recent-searches');
    renderRecentSearches([]);
  });
}

function renderRecentSearches(searches) {
  if (!searches || searches.length === 0) {
    recentSearchesList.innerHTML = '<span class="no-recent">No recent searches</span>';
    return;
  }

  recentSearchesList.innerHTML = searches.map(query => `
    <div class="recent-search-item" title="${query}">
      <span class="recent-search-text">${query}</span>
    </div>
  `).join('');

  // Click to search again
  recentSearchesList.querySelectorAll('.recent-search-item').forEach((item, index) => {
    item.addEventListener('click', () => {
      const query = searches[index];
      const searchInputEl = document.getElementById('searchInput');
      if (searchInputEl) {
        searchInputEl.value = query;
        searchInputEl.dispatchEvent(new Event('input'));
        close();
      }
    });
  });
}

function setupRebuildButton() {
  rebuildIndexBtn.addEventListener('click', async () => {
    rebuildIndexBtn.disabled = true;
    indexStatus.textContent = 'Starting...';

    try {
      await window.api.invoke('rebuild-index');
    } catch (err) {
      indexStatus.textContent = 'Error';
    }

    rebuildIndexBtn.disabled = false;
  });

  window.api.on('index-progress', (progress) => {
    if (progress.status === 'starting') {
      indexStatus.textContent = 'Starting...';
    } else if (progress.status === 'indexing') {
      indexStatus.textContent = `${progress.filesProcessed.toLocaleString()} files`;
    } else if (progress.status === 'complete') {
      indexStatus.textContent = `Done: ${progress.filesProcessed.toLocaleString()} files`;
    }
  });
}

function setupUpdateUI() {
  loadAppVersion();

  checkUpdateBtn.addEventListener('click', async () => {
    checkUpdateBtn.disabled = true;
    updateStatusText.textContent = 'Checking...';
    updateStatusText.className = 'update-status-text';

    try {
      const result = await window.api.invoke('check-for-updates');
      if (!result.success) {
        updateStatusText.textContent = result.error || 'Check failed';
        updateStatusText.className = 'update-status-text error';
        checkUpdateBtn.disabled = false;
      }
    } catch (err) {
      updateStatusText.textContent = 'Failed to check';
      updateStatusText.className = 'update-status-text error';
      checkUpdateBtn.disabled = false;
    }
  });

  installUpdateBtn.addEventListener('click', async () => {
    installUpdateBtn.disabled = true;
    installUpdateBtn.textContent = 'Restarting...';
    await window.api.invoke('install-update');
  });

  window.api.on('update-available', (data) => {
    updateStatusText.textContent = `Update available: v${data.version}`;
    updateStatusText.className = 'update-status-text success';
    checkUpdateBtn.textContent = 'Download Update';
    checkUpdateBtn.disabled = false;
    checkUpdateBtn.onclick = startDownload;
  });

  window.api.on('update-not-available', () => {
    updateStatusText.textContent = 'You have the latest version';
    updateStatusText.className = 'update-status-text success';
    checkUpdateBtn.disabled = false;
  });

  window.api.on('update-progress', (data) => {
    updateProgress.classList.add('visible');
    updateProgressFill.style.width = `${data.percent}%`;
    updateProgressText.textContent = `${data.percent}%`;
    checkUpdateBtn.disabled = true;
  });

  window.api.on('update-downloaded', (data) => {
    updateProgress.classList.remove('visible');
    updateStatusText.textContent = `v${data.version} ready to install`;
    updateStatusText.className = 'update-status-text success';
    checkUpdateBtn.style.display = 'none';
    installUpdateBtn.classList.add('visible');
  });

  window.api.on('update-error', (data) => {
    updateStatusText.textContent = data.error || 'Update error';
    updateStatusText.className = 'update-status-text error';
    updateProgress.classList.remove('visible');
    checkUpdateBtn.disabled = false;
    checkUpdateBtn.textContent = 'Check for Updates';
    checkUpdateBtn.onclick = null;
  });
}

async function loadAppVersion() {
  const version = await window.api.invoke('get-app-version');
  updateVersion.textContent = `Version ${version}`;

  const state = await window.api.invoke('get-update-state');
  if (state.updateDownloaded) {
    updateStatusText.textContent = `v${state.updateInfo?.version} ready to install`;
    updateStatusText.className = 'update-status-text success';
    checkUpdateBtn.style.display = 'none';
    installUpdateBtn.classList.add('visible');
  } else if (state.updateAvailable) {
    updateStatusText.textContent = `Update available: v${state.updateInfo?.version}`;
    updateStatusText.className = 'update-status-text success';
    checkUpdateBtn.textContent = 'Download Update';
    checkUpdateBtn.onclick = startDownload;
  }
}

async function startDownload() {
  checkUpdateBtn.disabled = true;
  updateStatusText.textContent = 'Downloading...';
  await window.api.invoke('download-update');
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
