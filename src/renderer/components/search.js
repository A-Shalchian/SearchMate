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

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico'];
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'];
const DOC_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'];
const CODE_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.css', '.html', '.json', '.xml', '.yml', '.yaml', '.md', '.sh', '.bat', '.ps1'];
const ARCHIVE_EXTENSIONS = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'];
const EXEC_EXTENSIONS = ['.exe', '.msi', '.app', '.dmg', '.deb', '.rpm', '.cmd', '.bat', '.sh'];

function getFileType(filename, isDirectory) {
  if (isDirectory) return 'folder';
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (DOC_EXTENSIONS.includes(ext)) return 'document';
  if (CODE_EXTENSIONS.includes(ext)) return 'code';
  if (ARCHIVE_EXTENSIONS.includes(ext)) return 'archive';
  if (EXEC_EXTENSIONS.includes(ext)) return 'command';
  return 'file';
}

function getFileIcon(fileType) {
  const icons = {
    folder: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4C2.89 4 2 4.89 2 6V18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V8C22 6.89 21.11 6 20 6H12L10 4Z"/></svg>',
    image: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5" fill="white"/><path d="M21 15L16 10L5 21H18C19.66 21 21 19.66 21 18V15Z" fill="white" fill-opacity="0.5"/></svg>',
    video: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 4L20 8H17L15 4H13L15 8H12L10 4H8L10 8H7L5 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V4H18ZM10 14.5V10.5L14 12.5L10 14.5Z"/></svg>',
    audio: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3V13.55C11.41 13.21 10.73 13 10 13C7.79 13 6 14.79 6 17C6 19.21 7.79 21 10 21C12.21 21 14 19.21 14 17V7H18V3H12Z"/></svg>',
    document: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM13 9V3.5L18.5 9H13ZM16 18H8V16H16V18ZM16 14H8V12H16V14Z"/></svg>',
    code: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    archive: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 6h-3v3h-2v-3H10v-2h3V7h2v3h3v2z"/></svg>',
    command: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 8L11 12L7 16" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="13" y1="16" x2="17" y2="16" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>',
    file: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM13 9V3.5L18.5 9H13Z"/></svg>'
  };
  return icons[fileType] || icons.file;
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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
    const fileType = getFileType(result.name, result.isDirectory);
    const iconSvg = getFileIcon(fileType);
    const highlightedName = highlightText(result.name, searchTerms);

    return `
      <li class="result-item ${index === selectedIndex ? 'selected' : ''}" data-index="${index}">
        <div class="result-icon ${fileType}">${iconSvg}</div>
        <div class="result-info">
          <div class="result-name">${highlightedName}</div>
          <div class="result-path">${escapeHtml(result.path)}</div>
        </div>
        <div class="result-type">${capitalizeFirst(fileType)}</div>
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
