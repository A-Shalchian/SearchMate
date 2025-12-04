const { ipcRenderer } = require('electron');

const searchInput = document.getElementById('searchInput');
const resultsList = document.getElementById('resultsList');
const emptyState = document.getElementById('emptyState');
const resultCount = document.getElementById('resultCount');

let results = [];
let selectedIndex = -1;
let searchTimeout = null;

// Focus input when window is shown
ipcRenderer.on('window-shown', () => {
  searchInput.focus();
  searchInput.select();
});

// Clear on hide
ipcRenderer.on('window-hidden', () => {
  // Keep the search state for when window reopens
});

// Search input handler with debounce
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

// Keyboard navigation
searchInput.addEventListener('keydown', (e) => {
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
        if (e.ctrlKey) {
          openInExplorer(results[selectedIndex].path);
        } else {
          openPath(results[selectedIndex].path);
        }
      }
      break;
    case 'Escape':
      e.preventDefault();
      ipcRenderer.send('hide-window');
      break;
  }
});

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

  // Scroll selected item into view
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

  // Add click handlers
  resultsList.querySelectorAll('.result-item').forEach((item) => {
    const index = parseInt(item.dataset.index);

    item.addEventListener('click', (e) => {
      if (e.ctrlKey) {
        openInExplorer(results[index].path);
      } else {
        openPath(results[index].path);
      }
    });

    item.addEventListener('mouseenter', () => {
      selectedIndex = index;
      updateSelection();
    });
  });

  selectedIndex = 0;
  updateSelection();

  resultCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
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

// Initialize
showEmptyState();
