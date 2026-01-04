const contextMenu = require('./context-menu');
const preview = require('./preview');
const { applyFontSize } = require('./theme');
const { escapeHtml, escapeRegex } = require('./utils');

let searchInput = null;
let resultsList = null;
let emptyState = null;
let resultCount = null;

let results = [];
let selectedIndex = -1;
let searchTimeout = null;
let currentQuery = '';

function init(elements) {
  searchInput = elements.searchInput;
  resultsList = elements.resultsList;
  emptyState = elements.emptyState;
  resultCount = elements.resultCount;

  elements.searchWrapper.addEventListener('click', () => {
    searchInput.focus();
  });

  searchInput.addEventListener('input', handleInput);
  document.addEventListener('keydown', handleKeydown);

  window.api.on('window-shown', () => {
    searchInput.focus();
    searchInput.select();
  });

  window.api.on('window-hidden', () => {
    contextMenu.hide();
  });

  window.api.on('index-ready', (count) => {
    console.log(`Index ready with ${count} files`);
  });

  window.api.on('index-progress', (progress) => {
    if (progress.status === 'starting') {
      showIndexing(0);
    } else if (progress.status === 'indexing') {
      showIndexing(progress.filesProcessed, progress.currentPath);
    } else if (progress.status === 'complete') {
      showIndexComplete(progress.filesProcessed);
    }
  });

  showEmptyState();
}

function handleInput(e) {
  const query = e.target.value;
  currentQuery = query;
  contextMenu.setSearchQuery(query);

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
      results = await window.api.invoke('search-files', query);
      renderResults(query);
    } catch (err) {
      console.error('Search error:', err);
      showError();
    }
  }, 150);
}

function handleKeydown(e) {
  if (contextMenu.isVisible()) {
    contextMenu.handleKeydown(e);
    return;
  }

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectNext();
      updatePreviewIfVisible();
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectPrev();
      updatePreviewIfVisible();
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
          contextMenu.show(rect.right - 150, rect.top, results[selectedIndex]);
        }
      }
      break;
    case 'Escape':
      e.preventDefault();
      if (preview.isPreviewVisible()) {
        preview.hide();
      } else {
        window.api.send('hide-window');
      }
      break;
  }
}

function updatePreviewIfVisible() {
  if (preview.isPreviewVisible() && selectedIndex >= 0 && selectedIndex < results.length) {
    const item = results[selectedIndex];
    preview.loadPreview(item.path, item.name, item.isDirectory);
  }
}

function selectNext() {
  if (results.length === 0) return;
  if (selectedIndex < results.length - 1) {
    selectedIndex++;
    updateSelection();
  }
}

function selectPrev() {
  if (results.length === 0) return;
  if (selectedIndex > 0) {
    selectedIndex--;
    updateSelection();
  }
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
      contextMenu.show(e.clientX, e.clientY, results[index]);
    });

    item.addEventListener('mouseenter', () => {
      selectedIndex = index;
      updateSelection();
    });
  });

  selectedIndex = 0;
  updateSelection();

  resultCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;

  window.api.invoke('get-settings').then(settings => {
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

function showIndexing(filesProcessed, currentPath = '') {
  const fileCountText = filesProcessed.toLocaleString();
  const pathText = currentPath ? truncatePath(currentPath) : '';
  const message = pathText
    ? `Indexing... ${fileCountText} files<br><span class="index-path">${escapeHtml(pathText)}</span>`
    : `Indexing... ${fileCountText} files`;

  emptyState.innerHTML = `<div class="loading"><div class="spinner"></div>${message}</div>`;
  emptyState.classList.remove('hidden');
  resultsList.classList.add('hidden');
  resultCount.textContent = `Indexing... ${fileCountText}`;
}

function showIndexComplete(totalFiles) {
  const fileCountText = totalFiles.toLocaleString();
  resultCount.textContent = `Indexed ${fileCountText} files`;
  // Return to empty state after a moment
  setTimeout(() => {
    if (!searchInput.value.trim()) {
      showEmptyState();
    }
  }, 2000);
}

function truncatePath(filePath) {
  const maxLength = 50;
  if (filePath.length <= maxLength) return filePath;
  return '...' + filePath.slice(-maxLength + 3);
}

async function openPath(filePath) {
  const result = await window.api.invoke('open-path', filePath);
  if (result.success) {
    // Save to recent searches when a file is opened
    if (currentQuery && currentQuery.trim().length >= 2) {
      window.api.invoke('add-recent-search', currentQuery.trim());
    }
    window.api.send('hide-window');
  }
}

async function openInExplorer(filePath) {
  const result = await window.api.invoke('open-in-explorer', filePath);
  if (result.success) {
    window.api.send('hide-window');
  }
}

function getResults() {
  return results;
}

function getSelectedIndex() {
  return selectedIndex;
}

function refreshSearch() {
  const query = searchInput.value;
  if (!query.trim()) return;

  (async () => {
    try {
      results = await window.api.invoke('search-files', query);
      renderResults(query);
    } catch (err) {
      console.error('Search error:', err);
    }
  })();
}

module.exports = {
  init,
  showEmptyState,
  getResults,
  getSelectedIndex,
  refreshSearch,
};
