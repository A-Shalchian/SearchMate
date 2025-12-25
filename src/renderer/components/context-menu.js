const preview = require('./preview');

let contextMenuTarget = null;
let contextMenuIndex = -1;
let contextMenu = null;

function init(menuElement) {
  contextMenu = menuElement;

  contextMenu.querySelectorAll('.context-menu-item').forEach((item) => {
    item.addEventListener('click', async () => {
      if (!contextMenuTarget) return;

      const action = item.dataset.action;
      const filePath = contextMenuTarget.path;

      switch (action) {
        case 'open':
          const result = await window.api.invoke('open-path', filePath);
          if (result.success) {
            window.api.send('hide-window');
          }
          break;
        case 'open-vscode':
          await window.api.invoke('open-in-vscode', filePath);
          window.api.send('hide-window');
          break;
        case 'open-terminal':
          await window.api.invoke('open-in-terminal', filePath);
          window.api.send('hide-window');
          break;
        case 'open-terminal-claude':
          await window.api.invoke('open-terminal-claude', filePath);
          window.api.send('hide-window');
          break;
        case 'show-in-explorer':
          const explorerResult = await window.api.invoke('open-in-explorer', filePath);
          if (explorerResult.success) {
            window.api.send('hide-window');
          }
          break;
        case 'copy-path':
          await navigator.clipboard.writeText(filePath);
          break;
        case 'preview':
          preview.show();
          preview.loadPreview(filePath, contextMenuTarget.name, contextMenuTarget.isDirectory);
          break;
      }

      hide();
    });
  });

  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
      hide();
    }
  });
}

function show(x, y, item) {
  contextMenuTarget = item;
  contextMenuIndex = 0;

  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.classList.add('visible');

  updateSelection();

  const rect = contextMenu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    contextMenu.style.left = `${window.innerWidth - rect.width - 10}px`;
  }
  if (rect.bottom > window.innerHeight) {
    contextMenu.style.top = `${window.innerHeight - rect.height - 10}px`;
  }
}

function hide() {
  contextMenu.classList.remove('visible');
  contextMenuTarget = null;
  contextMenuIndex = -1;
  updateSelection();
}

function isVisible() {
  return contextMenu.classList.contains('visible');
}

function updateSelection() {
  const menuItems = contextMenu.querySelectorAll('.context-menu-item');
  menuItems.forEach((item, index) => {
    item.classList.toggle('selected', index === contextMenuIndex);
  });
}

function handleKeydown(e) {
  const menuItems = contextMenu.querySelectorAll('.context-menu-item');

  switch (e.key) {
    case 'Escape':
    case 'Control':
      e.preventDefault();
      hide();
      return true;
    case 'ArrowDown':
      e.preventDefault();
      contextMenuIndex = (contextMenuIndex + 1) % menuItems.length;
      updateSelection();
      return true;
    case 'ArrowUp':
      e.preventDefault();
      contextMenuIndex = (contextMenuIndex - 1 + menuItems.length) % menuItems.length;
      updateSelection();
      return true;
    case 'Enter':
      e.preventDefault();
      if (contextMenuIndex >= 0 && menuItems[contextMenuIndex]) {
        menuItems[contextMenuIndex].click();
      }
      return true;
  }

  const keyNum = parseInt(e.key);
  if (keyNum >= 1 && keyNum <= 7) {
    e.preventDefault();
    const menuItem = contextMenu.querySelector(`[data-key="${keyNum}"]`);
    if (menuItem) {
      menuItem.click();
    }
    return true;
  }

  return false;
}

function getTarget() {
  return contextMenuTarget;
}

module.exports = {
  init,
  show,
  hide,
  isVisible,
  handleKeydown,
  getTarget,
};
