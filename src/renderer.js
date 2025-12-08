const { ipcRenderer } = require('electron');

const searchInput = document.getElementById('searchInput');
const searchWrapper = document.querySelector('.search-wrapper');
const resultsList = document.getElementById('resultsList');
const emptyState = document.getElementById('emptyState');
const resultCount = document.getElementById('resultCount');
const contextMenu = document.getElementById('contextMenu');

searchWrapper.addEventListener('click', () => {
  searchInput.focus();
});

let results = [];
let selectedIndex = -1;
let searchTimeout = null;
let contextMenuTarget = null;
let contextMenuIndex = -1;

ipcRenderer.on('window-shown', () => {
  searchInput.focus();
  searchInput.select();
});

ipcRenderer.on('window-hidden', () => {
  hideContextMenu();
});

ipcRenderer.on('index-ready', (event, count) => {
  console.log(`Index ready with ${count} files`);
});

searchInput.addEventListener('input', (e) => {
  const query = e.target.value;

  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (!query.trim()) {
    showEmptyState();
    return;
  }

  showLoading();

  searchTimeout = setTimeout(async () => {
    try {
      results = await ipcRenderer.invoke('search-files', query);
      renderResults(query);
    } catch (err) {
      console.error('Search error:', err);
      showError();
    }
  }, 150);
});

searchInput.addEventListener('keydown', (e) => {
  if (contextMenu.classList.contains('visible')) {
    handleContextMenuKeys(e);
    return;
  }

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectNext();
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectPrev();
      break;
    case 'Enter':
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        openPath(results[selectedIndex].path);
      }
      break;
    case 'Control':
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        const selectedItem = resultsList.querySelector('.result-item.selected');
        if (selectedItem) {
          const rect = selectedItem.getBoundingClientRect();
          showContextMenu(rect.right - 150, rect.top, results[selectedIndex]);
        }
      }
      break;
    case 'Escape':
      e.preventDefault();
      ipcRenderer.send('hide-window');
      break;
  }
});

function handleContextMenuKeys(e) {
  const menuItems = contextMenu.querySelectorAll('.context-menu-item');

  switch (e.key) {
    case 'Escape':
    case 'Control':
      e.preventDefault();
      hideContextMenu();
      return;
    case 'ArrowDown':
      e.preventDefault();
      contextMenuIndex = (contextMenuIndex + 1) % menuItems.length;
      updateContextMenuSelection();
      return;
    case 'ArrowUp':
      e.preventDefault();
      contextMenuIndex = (contextMenuIndex - 1 + menuItems.length) % menuItems.length;
      updateContextMenuSelection();
      return;
    case 'Enter':
      e.preventDefault();
      if (contextMenuIndex >= 0 && menuItems[contextMenuIndex]) {
        menuItems[contextMenuIndex].click();
      }
      return;
  }

  const keyNum = parseInt(e.key);
  if (keyNum >= 1 && keyNum <= 6) {
    e.preventDefault();
    const menuItem = contextMenu.querySelector(`[data-key="${keyNum}"]`);
    if (menuItem) {
      menuItem.click();
    }
  }
}

function updateContextMenuSelection() {
  const menuItems = contextMenu.querySelectorAll('.context-menu-item');
  menuItems.forEach((item, index) => {
    item.classList.toggle('selected', index === contextMenuIndex);
  });
}

function selectNext() {
  if (results.length === 0) return;
  selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
  updateSelection();
}

function selectPrev() {
  if (results.length === 0) return;
  selectedIndex = Math.max(selectedIndex - 1, 0);
  updateSelection();
}

function updateSelection() {
  const items = resultsList.querySelectorAll('.result-item');
  items.forEach((item, index) => {
    item.classList.toggle('selected', index === selectedIndex);
  });

  const selectedItem = items[selectedIndex];
  if (selectedItem) {
    selectedItem.scrollIntoView({ block: 'nearest' });
  }
}

function renderResults(query) {
  if (results.length === 0) {
    emptyState.innerHTML = '<p>No results found</p>';
    emptyState.classList.remove('hidden');
    resultsList.classList.add('hidden');
    resultCount.textContent = 'No results';
    return;
  }

  emptyState.classList.add('hidden');
  resultsList.classList.remove('hidden');

  const searchTerms = query.toLowerCase().split(/\s+/);

  resultsList.innerHTML = results.map((result, index) => {
    const iconClass = result.isDirectory ? 'folder' : 'file';
    const iconSvg = result.isDirectory
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';

    const highlightedName = highlightText(result.name, searchTerms);

    return `
      <li class="result-item ${index === selectedIndex ? 'selected' : ''}" data-index="${index}">
        <div class="result-icon ${iconClass}">${iconSvg}</div>
        <div class="result-info">
          <div class="result-name">${highlightedName}</div>
          <div class="result-path">${escapeHtml(result.path)}</div>
        </div>
      </li>
    `;
  }).join('');

  resultsList.querySelectorAll('.result-item').forEach((item) => {
    const index = parseInt(item.dataset.index);

    item.addEventListener('click', (e) => {
      if (e.ctrlKey) {
        openInExplorer(results[index].path);
      } else {
        openPath(results[index].path);
      }
    });

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, results[index]);
    });

    item.addEventListener('mouseenter', () => {
      selectedIndex = index;
      updateSelection();
    });
  });

  selectedIndex = 0;
  updateSelection();

  resultCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;

  ipcRenderer.invoke('get-settings').then(settings => {
    applyFontSize(settings.fontSize);
  });
}

function highlightText(text, searchTerms) {
  let result = escapeHtml(text);

  searchTerms.forEach(term => {
    if (term) {
      const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
      result = result.replace(regex, '<span class="highlight">$1</span>');
    }
  });

  return result;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function showEmptyState() {
  results = [];
  selectedIndex = -1;
  emptyState.innerHTML = '<p>Start typing to search...</p>';
  emptyState.classList.remove('hidden');
  resultsList.classList.add('hidden');
  resultCount.textContent = 'Ready';
}

function showLoading() {
  emptyState.innerHTML = '<div class="loading"><div class="spinner"></div>Searching...</div>';
  emptyState.classList.remove('hidden');
  resultsList.classList.add('hidden');
  resultCount.textContent = 'Searching...';
}

function showError() {
  emptyState.innerHTML = '<p>Error searching files</p>';
  emptyState.classList.remove('hidden');
  resultsList.classList.add('hidden');
  resultCount.textContent = 'Error';
}

function showContextMenu(x, y, item) {
  contextMenuTarget = item;
  contextMenuIndex = 0;

  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.classList.add('visible');

  updateContextMenuSelection();

  const rect = contextMenu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    contextMenu.style.left = `${window.innerWidth - rect.width - 10}px`;
  }
  if (rect.bottom > window.innerHeight) {
    contextMenu.style.top = `${window.innerHeight - rect.height - 10}px`;
  }
}

function hideContextMenu() {
  contextMenu.classList.remove('visible');
  contextMenuTarget = null;
  contextMenuIndex = -1;
  updateContextMenuSelection();
}

document.addEventListener('click', (e) => {
  if (!contextMenu.contains(e.target)) {
    hideContextMenu();
  }
});

contextMenu.querySelectorAll('.context-menu-item').forEach((item) => {
  item.addEventListener('click', async () => {
    if (!contextMenuTarget) return;

    const action = item.dataset.action;
    const filePath = contextMenuTarget.path;

    switch (action) {
      case 'open':
        await openPath(filePath);
        break;
      case 'open-vscode':
        await ipcRenderer.invoke('open-in-vscode', filePath);
        ipcRenderer.send('hide-window');
        break;
      case 'open-terminal':
        await ipcRenderer.invoke('open-in-terminal', filePath);
        ipcRenderer.send('hide-window');
        break;
      case 'open-terminal-claude':
        await ipcRenderer.invoke('open-terminal-claude', filePath);
        ipcRenderer.send('hide-window');
        break;
      case 'show-in-explorer':
        await openInExplorer(filePath);
        break;
      case 'copy-path':
        await navigator.clipboard.writeText(filePath);
        break;
    }

    hideContextMenu();
  });
});

async function openPath(filePath) {
  const result = await ipcRenderer.invoke('open-path', filePath);
  if (result.success) {
    ipcRenderer.send('hide-window');
  }
}

async function openInExplorer(filePath) {
  const result = await ipcRenderer.invoke('open-in-explorer', filePath);
  if (result.success) {
    ipcRenderer.send('hide-window');
  }
}

const settingsPanel = document.getElementById('settingsPanel');
const settingsBtn = document.getElementById('settingsBtn');
const settingsClose = document.getElementById('settingsClose');
const positionGrid = document.getElementById('positionGrid');
const fontSizeSlider = document.getElementById('fontSizeSlider');
const fontSizeValue = document.getElementById('fontSizeValue');
const opacitySlider = document.getElementById('opacitySlider');
const opacityValue = document.getElementById('opacityValue');
const hotkeyInput = document.getElementById('hotkeyInput');
const hotkeyDisplay = document.getElementById('hotkeyDisplay');
const themeButtons = document.getElementById('themeButtons');
const maxResultsSlider = document.getElementById('maxResultsSlider');
const maxResultsValue = document.getElementById('maxResultsValue');
const pathsList = document.getElementById('pathsList');
const addPathBtn = document.getElementById('addPathBtn');
const excludeTextarea = document.getElementById('excludeTextarea');

let settingsOpen = false;
let recordingHotkey = false;

function openSettings() {
  settingsPanel.classList.add('visible');
  settingsOpen = true;
}

function closeSettings() {
  settingsPanel.classList.remove('visible');
  settingsOpen = false;
  searchInput.focus();
}

settingsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  openSettings();
});

settingsClose.addEventListener('click', closeSettings);

async function loadSettings() {
  const settings = await ipcRenderer.invoke('get-settings');

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

  document.documentElement.style.setProperty('--base-font-size', `${settings.fontSize}px`);
  applyFontSize(settings.fontSize);
  applyTheme(settings.theme);
}

function formatHotkey(hotkey) {
  return hotkey
    .replace('Control', 'Ctrl')
    .replace('Meta', 'Cmd')
    .replace('+', ' + ');
}

function applyTheme(theme) {
  document.documentElement.removeAttribute('data-theme');
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
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
      const settings = await ipcRenderer.invoke('get-settings');
      const newPaths = settings.searchPaths.filter((_, i) => i !== index);
      await ipcRenderer.invoke('set-setting', 'searchPaths', newPaths);
      renderPaths(newPaths);
    });
  });
}

function applyFontSize(size) {
  document.querySelector('.result-name')?.style.setProperty('font-size', `${size}px`);
  document.querySelectorAll('.result-name').forEach(el => {
    el.style.fontSize = `${size}px`;
  });
  document.querySelectorAll('.result-path').forEach(el => {
    el.style.fontSize = `${size - 2}px`;
  });
}

positionGrid.querySelectorAll('.position-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const position = btn.dataset.position;
    await ipcRenderer.invoke('set-setting', 'position', position);

    positionGrid.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

fontSizeSlider.addEventListener('input', async (e) => {
  const size = parseInt(e.target.value);
  fontSizeValue.textContent = size;
  applyFontSize(size);
  await ipcRenderer.invoke('set-setting', 'fontSize', size);
});

opacitySlider.addEventListener('input', async (e) => {
  const opacity = parseInt(e.target.value);
  opacityValue.textContent = opacity;
  await ipcRenderer.invoke('set-setting', 'opacity', opacity);
});

maxResultsSlider.addEventListener('input', async (e) => {
  const maxResults = parseInt(e.target.value);
  maxResultsValue.textContent = maxResults;
  await ipcRenderer.invoke('set-setting', 'maxResults', maxResults);
});

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
      const result = await ipcRenderer.invoke('set-setting', 'hotkey', hotkey);

      if (result.success) {
        hotkeyDisplay.textContent = formatHotkey(hotkey);
      } else {
        hotkeyDisplay.textContent = 'Failed - try another';
        setTimeout(() => loadSettings(), 2000);
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
    loadSettings(); // Reset display
  }
});

themeButtons.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const theme = btn.dataset.theme;
    await ipcRenderer.invoke('set-setting', 'theme', theme);

    themeButtons.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyTheme(theme);
  });
});

addPathBtn.addEventListener('click', async () => {
  const result = await ipcRenderer.invoke('select-folder');
  if (result) {
    const settings = await ipcRenderer.invoke('get-settings');
    const newPaths = [...(settings.searchPaths || []), result];
    await ipcRenderer.invoke('set-setting', 'searchPaths', newPaths);
    renderPaths(newPaths);
  }
});

let excludeTimeout = null;
excludeTextarea.addEventListener('input', () => {
  if (excludeTimeout) clearTimeout(excludeTimeout);
  excludeTimeout = setTimeout(async () => {
    const patterns = excludeTextarea.value
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    await ipcRenderer.invoke('set-setting', 'excludePatterns', patterns);
  }, 500);
});

ipcRenderer.on('theme-changed', (event, theme) => {
  applyTheme(theme);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && settingsOpen) {
    e.preventDefault();
    e.stopPropagation();
    closeSettings();
  }
});

settingsPanel.addEventListener('click', (e) => {
  e.stopPropagation();
});

loadSettings();
showEmptyState();
