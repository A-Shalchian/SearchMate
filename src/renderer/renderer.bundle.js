(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/renderer/components/preview.js
  var require_preview = __commonJS({
    "src/renderer/components/preview.js"(exports, module) {
      var previewPanel = null;
      var previewTitle = null;
      var previewContent = null;
      var previewClose = null;
      var isVisible = false;
      var currentPath = null;
      var hoverTimeout = null;
      function init(elements) {
        previewPanel = elements.previewPanel;
        previewTitle = elements.previewTitle;
        previewContent = elements.previewContent;
        previewClose = elements.previewClose;
        previewClose.addEventListener("click", hide);
        previewPanel.addEventListener("click", (e) => {
          e.stopPropagation();
        });
        document.addEventListener("click", (e) => {
          if (isVisible && !previewPanel.contains(e.target) && !e.target.closest(".context-menu")) {
            hide();
          }
        });
      }
      function show() {
        previewPanel.classList.add("visible");
        isVisible = true;
      }
      function hide() {
        previewPanel.classList.remove("visible");
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
          const data = await window.api.invoke("get-file-preview", filePath, isDirectory);
          if (currentPath !== filePath) return;
          if (data.type === "text") {
            previewContent.innerHTML = `<pre class="preview-text">${escapeHtml(data.content)}</pre>`;
          } else if (data.type === "image") {
            previewContent.innerHTML = `<img class="preview-image" src="file://${filePath}" alt="${fileName}">`;
          } else if (data.type === "folder") {
            renderFolderContents(data.contents);
          } else if (data.type === "meta") {
            renderMetadata(data.meta);
          } else if (data.type === "error") {
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
        const html = contents.map((item) => `
    <li class="preview-folder-item ${item.isDirectory ? "folder" : "file"}">
      ${item.isDirectory ? folderIcon : fileIcon}
      <span>${escapeHtml(item.name)}</span>
    </li>
  `).join("");
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
        <span class="preview-meta-value">${meta.extension || "Unknown"}</span>
      </div>
    </div>
  `;
        previewContent.innerHTML = html;
      }
      function formatSize(bytes) {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
      }
      function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
      }
      function schedulePreview(filePath, fileName, isDirectory, delay = 1e3) {
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
        clearHoverTimeout
      };
    }
  });

  // src/renderer/components/context-menu.js
  var require_context_menu = __commonJS({
    "src/renderer/components/context-menu.js"(exports, module) {
      var preview2 = require_preview();
      var contextMenuTarget = null;
      var contextMenuIndex = -1;
      var contextMenu2 = null;
      function init(menuElement) {
        contextMenu2 = menuElement;
        contextMenu2.querySelectorAll(".context-menu-item").forEach((item) => {
          item.addEventListener("click", async () => {
            if (!contextMenuTarget) return;
            const action = item.dataset.action;
            const filePath = contextMenuTarget.path;
            switch (action) {
              case "open":
                const result = await window.api.invoke("open-path", filePath);
                if (result.success) {
                  window.api.send("hide-window");
                }
                break;
              case "open-vscode":
                await window.api.invoke("open-in-vscode", filePath);
                window.api.send("hide-window");
                break;
              case "open-terminal":
                await window.api.invoke("open-in-terminal", filePath);
                window.api.send("hide-window");
                break;
              case "open-terminal-claude":
                await window.api.invoke("open-terminal-claude", filePath);
                window.api.send("hide-window");
                break;
              case "show-in-explorer":
                const explorerResult = await window.api.invoke("open-in-explorer", filePath);
                if (explorerResult.success) {
                  window.api.send("hide-window");
                }
                break;
              case "copy-path":
                await navigator.clipboard.writeText(filePath);
                break;
              case "preview":
                preview2.show();
                preview2.loadPreview(filePath, contextMenuTarget.name, contextMenuTarget.isDirectory);
                break;
            }
            hide();
          });
        });
        document.addEventListener("click", (e) => {
          if (!contextMenu2.contains(e.target)) {
            hide();
          }
        });
      }
      function show(x, y, item) {
        contextMenuTarget = item;
        contextMenuIndex = 0;
        contextMenu2.style.left = `${x}px`;
        contextMenu2.style.top = `${y}px`;
        contextMenu2.classList.add("visible");
        updateSelection();
        const rect = contextMenu2.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
          contextMenu2.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
          contextMenu2.style.top = `${window.innerHeight - rect.height - 10}px`;
        }
      }
      function hide() {
        contextMenu2.classList.remove("visible");
        contextMenuTarget = null;
        contextMenuIndex = -1;
        updateSelection();
      }
      function isVisible() {
        return contextMenu2.classList.contains("visible");
      }
      function updateSelection() {
        const menuItems = contextMenu2.querySelectorAll(".context-menu-item");
        menuItems.forEach((item, index) => {
          item.classList.toggle("selected", index === contextMenuIndex);
        });
      }
      function handleKeydown(e) {
        const menuItems = contextMenu2.querySelectorAll(".context-menu-item");
        switch (e.key) {
          case "Escape":
          case "Control":
            e.preventDefault();
            hide();
            return true;
          case "ArrowDown":
            e.preventDefault();
            contextMenuIndex = (contextMenuIndex + 1) % menuItems.length;
            updateSelection();
            return true;
          case "ArrowUp":
            e.preventDefault();
            contextMenuIndex = (contextMenuIndex - 1 + menuItems.length) % menuItems.length;
            updateSelection();
            return true;
          case "Enter":
            e.preventDefault();
            if (contextMenuIndex >= 0 && menuItems[contextMenuIndex]) {
              menuItems[contextMenuIndex].click();
            }
            return true;
        }
        const keyNum = parseInt(e.key);
        if (keyNum >= 1 && keyNum <= 7) {
          e.preventDefault();
          const menuItem = contextMenu2.querySelector(`[data-key="${keyNum}"]`);
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
        getTarget
      };
    }
  });

  // src/renderer/components/theme.js
  var require_theme = __commonJS({
    "src/renderer/components/theme.js"(exports, module) {
      function applyTheme(theme) {
        document.documentElement.removeAttribute("data-theme");
        if (theme === "light") {
          document.documentElement.setAttribute("data-theme", "light");
        } else if (theme === "dark") {
          document.documentElement.setAttribute("data-theme", "dark");
        }
      }
      function applyFontSize(size) {
        document.documentElement.style.setProperty("--base-font-size", `${size}px`);
        document.querySelectorAll(".result-name").forEach((el) => {
          el.style.fontSize = `${size}px`;
        });
        document.querySelectorAll(".result-path").forEach((el) => {
          el.style.fontSize = `${size - 2}px`;
        });
      }
      module.exports = {
        applyTheme,
        applyFontSize
      };
    }
  });

  // src/renderer/components/search.js
  var require_search = __commonJS({
    "src/renderer/components/search.js"(exports, module) {
      var contextMenu2 = require_context_menu();
      var preview2 = require_preview();
      var { applyFontSize } = require_theme();
      var searchInput = null;
      var resultsList = null;
      var emptyState = null;
      var resultCount = null;
      var results = [];
      var selectedIndex = -1;
      var searchTimeout = null;
      function init(elements) {
        searchInput = elements.searchInput;
        resultsList = elements.resultsList;
        emptyState = elements.emptyState;
        resultCount = elements.resultCount;
        elements.searchWrapper.addEventListener("click", () => {
          searchInput.focus();
        });
        searchInput.addEventListener("input", handleInput);
        document.addEventListener("keydown", handleKeydown);
        window.api.on("window-shown", () => {
          searchInput.focus();
          searchInput.select();
        });
        window.api.on("window-hidden", () => {
          contextMenu2.hide();
        });
        window.api.on("index-ready", (count) => {
          console.log(`Index ready with ${count} files`);
        });
        showEmptyState();
      }
      function handleInput(e) {
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
            results = await window.api.invoke("search-files", query);
            renderResults(query);
          } catch (err) {
            console.error("Search error:", err);
            showError();
          }
        }, 150);
      }
      function handleKeydown(e) {
        if (contextMenu2.isVisible()) {
          contextMenu2.handleKeydown(e);
          return;
        }
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            selectNext();
            updatePreviewIfVisible();
            break;
          case "ArrowUp":
            e.preventDefault();
            selectPrev();
            updatePreviewIfVisible();
            break;
          case "Enter":
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < results.length) {
              openPath(results[selectedIndex].path);
            }
            break;
          case "Control":
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < results.length) {
              const selectedItem = resultsList.querySelector(".result-item.selected");
              if (selectedItem) {
                const rect = selectedItem.getBoundingClientRect();
                contextMenu2.show(rect.right - 150, rect.top, results[selectedIndex]);
              }
            }
            break;
          case "Escape":
            e.preventDefault();
            if (preview2.isPreviewVisible()) {
              preview2.hide();
            } else {
              window.api.send("hide-window");
            }
            break;
        }
      }
      function updatePreviewIfVisible() {
        if (preview2.isPreviewVisible() && selectedIndex >= 0 && selectedIndex < results.length) {
          const item = results[selectedIndex];
          preview2.loadPreview(item.path, item.name, item.isDirectory);
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
        const items = resultsList.querySelectorAll(".result-item");
        items.forEach((item, index) => {
          item.classList.toggle("selected", index === selectedIndex);
        });
        const selectedItem = items[selectedIndex];
        if (selectedItem) {
          selectedItem.scrollIntoView({ block: "nearest" });
        }
      }
      function renderResults(query) {
        if (results.length === 0) {
          emptyState.innerHTML = "<p>No results found</p>";
          emptyState.classList.remove("hidden");
          resultsList.classList.add("hidden");
          resultCount.textContent = "No results";
          return;
        }
        emptyState.classList.add("hidden");
        resultsList.classList.remove("hidden");
        const searchTerms = query.toLowerCase().split(/\s+/);
        resultsList.innerHTML = results.map((result, index) => {
          const iconClass = result.isDirectory ? "folder" : "file";
          const iconSvg = result.isDirectory ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
          const highlightedName = highlightText(result.name, searchTerms);
          return `
      <li class="result-item ${index === selectedIndex ? "selected" : ""}" data-index="${index}">
        <div class="result-icon ${iconClass}">${iconSvg}</div>
        <div class="result-info">
          <div class="result-name">${highlightedName}</div>
          <div class="result-path">${escapeHtml(result.path)}</div>
        </div>
      </li>
    `;
        }).join("");
        resultsList.querySelectorAll(".result-item").forEach((item) => {
          const index = parseInt(item.dataset.index);
          item.addEventListener("click", (e) => {
            if (e.ctrlKey) {
              openInExplorer(results[index].path);
            } else {
              openPath(results[index].path);
            }
          });
          item.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            contextMenu2.show(e.clientX, e.clientY, results[index]);
          });
          item.addEventListener("mouseenter", () => {
            selectedIndex = index;
            updateSelection();
          });
        });
        selectedIndex = 0;
        updateSelection();
        resultCount.textContent = `${results.length} result${results.length !== 1 ? "s" : ""}`;
        window.api.invoke("get-settings").then((settings2) => {
          applyFontSize(settings2.fontSize);
        });
      }
      function highlightText(text, searchTerms) {
        let result = escapeHtml(text);
        searchTerms.forEach((term) => {
          if (term) {
            const regex = new RegExp(`(${escapeRegex(term)})`, "gi");
            result = result.replace(regex, '<span class="highlight">$1</span>');
          }
        });
        return result;
      }
      function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
      }
      function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      function showEmptyState() {
        results = [];
        selectedIndex = -1;
        emptyState.innerHTML = "<p>Start typing to search...</p>";
        emptyState.classList.remove("hidden");
        resultsList.classList.add("hidden");
        resultCount.textContent = "Ready";
      }
      function showLoading() {
        emptyState.innerHTML = '<div class="loading"><div class="spinner"></div>Searching...</div>';
        emptyState.classList.remove("hidden");
        resultsList.classList.add("hidden");
        resultCount.textContent = "Searching...";
      }
      function showError() {
        emptyState.innerHTML = "<p>Error searching files</p>";
        emptyState.classList.remove("hidden");
        resultsList.classList.add("hidden");
        resultCount.textContent = "Error";
      }
      async function openPath(filePath) {
        const result = await window.api.invoke("open-path", filePath);
        if (result.success) {
          window.api.send("hide-window");
        }
      }
      async function openInExplorer(filePath) {
        const result = await window.api.invoke("open-in-explorer", filePath);
        if (result.success) {
          window.api.send("hide-window");
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
            results = await window.api.invoke("search-files", query);
            renderResults(query);
          } catch (err) {
            console.error("Search error:", err);
          }
        })();
      }
      module.exports = {
        init,
        showEmptyState,
        getResults,
        getSelectedIndex,
        refreshSearch
      };
    }
  });

  // src/renderer/components/settings.js
  var require_settings = __commonJS({
    "src/renderer/components/settings.js"(exports, module) {
      var { applyTheme, applyFontSize } = require_theme();
      var search2 = require_search();
      var settingsPanel = null;
      var settingsBtn = null;
      var settingsClose = null;
      var positionGrid = null;
      var fontSizeSlider = null;
      var fontSizeValue = null;
      var opacitySlider = null;
      var opacityValue = null;
      var hotkeyInput = null;
      var hotkeyDisplay = null;
      var themeButtons = null;
      var maxResultsSlider = null;
      var maxResultsValue = null;
      var pathsList = null;
      var addPathBtn = null;
      var excludeTextarea = null;
      var searchInput = null;
      var showOnlyDirectoriesToggle = null;
      var settingsOpen = false;
      var recordingHotkey = false;
      var excludeTimeout = null;
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
        settingsBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          open();
        });
        settingsClose.addEventListener("click", close);
        settingsPanel.addEventListener("click", (e) => {
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
        window.api.on("theme-changed", (theme) => {
          applyTheme(theme);
        });
        load();
      }
      function open() {
        settingsPanel.classList.add("visible");
        settingsOpen = true;
      }
      function close() {
        settingsPanel.classList.remove("visible");
        settingsOpen = false;
        searchInput.focus();
      }
      function isOpen() {
        return settingsOpen;
      }
      async function load() {
        const settings2 = await window.api.invoke("get-settings");
        positionGrid.querySelectorAll(".position-btn").forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.position === settings2.position);
        });
        fontSizeSlider.value = settings2.fontSize;
        fontSizeValue.textContent = settings2.fontSize;
        opacitySlider.value = settings2.opacity;
        opacityValue.textContent = settings2.opacity;
        maxResultsSlider.value = settings2.maxResults;
        maxResultsValue.textContent = settings2.maxResults;
        hotkeyDisplay.textContent = formatHotkey(settings2.hotkey);
        themeButtons.querySelectorAll(".theme-btn").forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.theme === settings2.theme);
        });
        renderPaths(settings2.searchPaths || []);
        excludeTextarea.value = (settings2.excludePatterns || []).join("\n");
        showOnlyDirectoriesToggle.checked = settings2.showOnlyDirectories || false;
        applyFontSize(settings2.fontSize);
        applyTheme(settings2.theme);
      }
      function formatHotkey(hotkey) {
        return hotkey.replace("Control", "Ctrl").replace("Meta", "Cmd").replace("+", " + ");
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
  `).join("");
        pathsList.querySelectorAll(".path-remove").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const index = parseInt(btn.dataset.index);
            const settings2 = await window.api.invoke("get-settings");
            const newPaths = settings2.searchPaths.filter((_, i) => i !== index);
            await window.api.invoke("set-setting", "searchPaths", newPaths);
            renderPaths(newPaths);
          });
        });
      }
      function setupPositionGrid() {
        positionGrid.querySelectorAll(".position-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const position = btn.dataset.position;
            await window.api.invoke("set-setting", "position", position);
            positionGrid.querySelectorAll(".position-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
          });
        });
      }
      function setupSliders() {
        fontSizeSlider.addEventListener("input", async (e) => {
          const size = parseInt(e.target.value);
          fontSizeValue.textContent = size;
          applyFontSize(size);
          await window.api.invoke("set-setting", "fontSize", size);
        });
        opacitySlider.addEventListener("input", async (e) => {
          const opacity = parseInt(e.target.value);
          opacityValue.textContent = opacity;
          await window.api.invoke("set-setting", "opacity", opacity);
        });
        maxResultsSlider.addEventListener("input", async (e) => {
          const maxResults = parseInt(e.target.value);
          maxResultsValue.textContent = maxResults;
          await window.api.invoke("set-setting", "maxResults", maxResults);
          search2.refreshSearch();
        });
      }
      function setupHotkeyInput() {
        hotkeyInput.addEventListener("click", () => {
          recordingHotkey = true;
          hotkeyInput.classList.add("recording");
          hotkeyDisplay.textContent = "Press keys...";
        });
        hotkeyInput.addEventListener("keydown", async (e) => {
          if (!recordingHotkey) return;
          e.preventDefault();
          const parts = [];
          if (e.ctrlKey) parts.push("Control");
          if (e.altKey) parts.push("Alt");
          if (e.shiftKey) parts.push("Shift");
          if (e.metaKey) parts.push("Meta");
          const key = e.key;
          if (!["Control", "Alt", "Shift", "Meta"].includes(key)) {
            parts.push(key.length === 1 ? key.toUpperCase() : key);
            if (parts.length >= 2) {
              const hotkey = parts.join("+");
              const result = await window.api.invoke("set-setting", "hotkey", hotkey);
              if (result.success) {
                hotkeyDisplay.textContent = formatHotkey(hotkey);
              } else {
                hotkeyDisplay.textContent = "Failed - try another";
                setTimeout(() => load(), 2e3);
              }
              recordingHotkey = false;
              hotkeyInput.classList.remove("recording");
            }
          }
        });
        hotkeyInput.addEventListener("blur", () => {
          if (recordingHotkey) {
            recordingHotkey = false;
            hotkeyInput.classList.remove("recording");
            load();
          }
        });
      }
      function setupThemeButtons() {
        themeButtons.querySelectorAll(".theme-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const theme = btn.dataset.theme;
            await window.api.invoke("set-setting", "theme", theme);
            themeButtons.querySelectorAll(".theme-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            applyTheme(theme);
          });
        });
      }
      function setupPathsUI() {
        addPathBtn.addEventListener("click", async () => {
          const result = await window.api.invoke("select-folder");
          if (result) {
            const settings2 = await window.api.invoke("get-settings");
            const newPaths = [...settings2.searchPaths || [], result];
            await window.api.invoke("set-setting", "searchPaths", newPaths);
            renderPaths(newPaths);
          }
        });
      }
      function setupExcludeTextarea() {
        excludeTextarea.addEventListener("input", () => {
          if (excludeTimeout) clearTimeout(excludeTimeout);
          excludeTimeout = setTimeout(async () => {
            const patterns = excludeTextarea.value.split("\n").map((p) => p.trim()).filter((p) => p.length > 0);
            await window.api.invoke("set-setting", "excludePatterns", patterns);
          }, 500);
        });
      }
      function setupDirectoriesToggle() {
        showOnlyDirectoriesToggle.addEventListener("change", async () => {
          await window.api.invoke("set-setting", "showOnlyDirectories", showOnlyDirectoriesToggle.checked);
          search2.refreshSearch();
        });
      }
      function setupKeyboardShortcuts() {
        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape" && settingsOpen) {
            e.preventDefault();
            e.stopPropagation();
            close();
          }
        });
      }
      function setupClickOutside() {
        document.addEventListener("click", (e) => {
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
        load
      };
    }
  });

  // src/renderer/renderer.js
  var search = require_search();
  var settings = require_settings();
  var contextMenu = require_context_menu();
  var preview = require_preview();
  document.addEventListener("DOMContentLoaded", () => {
    const elements = {
      searchInput: document.getElementById("searchInput"),
      searchWrapper: document.querySelector(".search-wrapper"),
      resultsList: document.getElementById("resultsList"),
      emptyState: document.getElementById("emptyState"),
      resultCount: document.getElementById("resultCount"),
      contextMenu: document.getElementById("contextMenu"),
      settingsPanel: document.getElementById("settingsPanel"),
      settingsBtn: document.getElementById("settingsBtn"),
      settingsClose: document.getElementById("settingsClose"),
      positionGrid: document.getElementById("positionGrid"),
      fontSizeSlider: document.getElementById("fontSizeSlider"),
      fontSizeValue: document.getElementById("fontSizeValue"),
      opacitySlider: document.getElementById("opacitySlider"),
      opacityValue: document.getElementById("opacityValue"),
      hotkeyInput: document.getElementById("hotkeyInput"),
      hotkeyDisplay: document.getElementById("hotkeyDisplay"),
      themeButtons: document.getElementById("themeButtons"),
      maxResultsSlider: document.getElementById("maxResultsSlider"),
      maxResultsValue: document.getElementById("maxResultsValue"),
      pathsList: document.getElementById("pathsList"),
      addPathBtn: document.getElementById("addPathBtn"),
      excludeTextarea: document.getElementById("excludeTextarea"),
      showOnlyDirectoriesToggle: document.getElementById("showOnlyDirectoriesToggle"),
      previewPanel: document.getElementById("previewPanel"),
      previewTitle: document.getElementById("previewTitle"),
      previewContent: document.getElementById("previewContent"),
      previewClose: document.getElementById("previewClose")
    };
    contextMenu.init(elements.contextMenu);
    preview.init(elements);
    search.init(elements);
    settings.init(elements);
  });
})();
