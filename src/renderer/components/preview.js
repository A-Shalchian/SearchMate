const { escapeHtml } = require('./utils');

let previewPanel = null;
let previewTitle = null;
let previewContent = null;
let previewClose = null;

let isVisible = false;
let currentPath = null;
let hoverTimeout = null;
let loadId = 0;

function init(elements) {
  previewPanel = elements.previewPanel;
  previewTitle = elements.previewTitle;
  previewContent = elements.previewContent;
  previewClose = elements.previewClose;

  previewClose.addEventListener('click', hide);

  previewPanel.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.addEventListener('click', (e) => {
    if (isVisible && !previewPanel.contains(e.target) && !e.target.closest('.context-menu')) {
      hide();
    }
  });
}

function show() {
  previewPanel.classList.add('visible');
  isVisible = true;
}

function hide() {
  previewPanel.classList.remove('visible');
  isVisible = false;
  currentPath = null;
}

function toggle() {
  if (isVisible) {
    hide();
  } else {
    show();
  }
}

function isPreviewVisible() {
  return isVisible;
}

async function loadPreview(filePath, fileName, isDirectory) {
  if (!isVisible) return;
  if (currentPath === filePath) return;

  currentPath = filePath;
  loadId++;
  const thisLoadId = loadId;

  previewTitle.textContent = fileName;
  previewContent.innerHTML = '<div class="preview-empty">Loading...</div>';

  try {
    const data = await window.api.invoke('get-file-preview', filePath, isDirectory);

    if (thisLoadId !== loadId) return;

    if (data.type === 'text') {
      previewContent.innerHTML = `<pre class="preview-text">${escapeHtml(data.content)}</pre>`;
    } else if (data.type === 'image') {
      previewContent.innerHTML = `<img class="preview-image" src="file://${filePath}" alt="${fileName}">`;
    } else if (data.type === 'folder') {
      renderFolderContents(data.contents);
    } else if (data.type === 'meta') {
      renderMetadata(data.meta);
    } else if (data.type === 'error') {
      previewContent.innerHTML = `<div class="preview-empty">${data.message}</div>`;
    }
  } catch (err) {
    if (thisLoadId !== loadId) return;
    previewContent.innerHTML = '<div class="preview-empty">Failed to load preview</div>';
  }
}

function renderFolderContents(contents) {
  if (!contents || contents.length === 0) {
    previewContent.innerHTML = '<div class="preview-empty">Empty folder</div>';
    return;
  }

  const folderIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4C2.89 4 2 4.89 2 6V18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V8C22 6.89 21.11 6 20 6H12L10 4Z"/></svg>';
  const fileIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM13 9V3.5L18.5 9H13Z"/></svg>';

  const html = contents.map(item => `
    <li class="preview-folder-item ${item.isDirectory ? 'folder' : 'file'}">
      ${item.isDirectory ? folderIcon : fileIcon}
      <span>${escapeHtml(item.name)}</span>
    </li>
  `).join('');

  previewContent.innerHTML = `<ul class="preview-folder-list">${html}</ul>`;
}

function renderMetadata(meta) {
  const html = `
    <div class="preview-meta">
      <div class="preview-meta-item">
        <span class="preview-meta-label">Size</span>
        <span class="preview-meta-value">${formatSize(meta.size)}</span>
      </div>
      <div class="preview-meta-item">
        <span class="preview-meta-label">Created</span>
        <span class="preview-meta-value">${formatDate(meta.created)}</span>
      </div>
      <div class="preview-meta-item">
        <span class="preview-meta-label">Modified</span>
        <span class="preview-meta-value">${formatDate(meta.modified)}</span>
      </div>
      <div class="preview-meta-item">
        <span class="preview-meta-label">Type</span>
        <span class="preview-meta-value">${meta.extension || 'Unknown'}</span>
      </div>
    </div>
  `;
  previewContent.innerHTML = html;
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function schedulePreview(filePath, fileName, isDirectory, delay = 1000) {
  clearHoverTimeout();
  hoverTimeout = setTimeout(() => {
    if (!isVisible) {
      show();
    }
    loadPreview(filePath, fileName, isDirectory);
  }, delay);
}

function clearHoverTimeout() {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
    hoverTimeout = null;
  }
}

module.exports = {
  init,
  show,
  hide,
  toggle,
  isPreviewVisible,
  loadPreview,
  schedulePreview,
  clearHoverTimeout,
};
