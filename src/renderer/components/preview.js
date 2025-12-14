const { ipcRenderer } = require('electron');

let previewPanel = null;
let previewTitle = null;
let previewContent = null;
let previewClose = null;

let isVisible = false;
let currentPath = null;
let hoverTimeout = null;

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.less',
  '.html', '.htm', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
  '.py', '.rb', '.php', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go',
  '.rs', '.swift', '.kt', '.scala', '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
  '.sql', '.graphql', '.vue', '.svelte', '.astro', '.env', '.gitignore', '.editorconfig',
  '.prettierrc', '.eslintrc', '.babelrc', '.log'
]);

const IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico'
]);

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
  previewTitle.textContent = fileName;
  previewContent.innerHTML = '<div class="preview-empty">Loading...</div>';

  try {
    const data = await ipcRenderer.invoke('get-file-preview', filePath, isDirectory);

    if (currentPath !== filePath) return; // Path changed while loading

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
    previewContent.innerHTML = '<div class="preview-empty">Failed to load preview</div>';
  }
}

function renderFolderContents(contents) {
  if (!contents || contents.length === 0) {
    previewContent.innerHTML = '<div class="preview-empty">Empty folder</div>';
    return;
  }

  const folderIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>';
  const fileIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';

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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
