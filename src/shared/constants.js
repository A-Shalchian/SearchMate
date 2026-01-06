const DEFAULT_SETTINGS = {
  position: 'center',
  fontSize: 14,
  opacity: 95,
  hotkey: 'Control+Space',
  searchPaths: [],
  excludePatterns: ['node_modules', '.git', 'dist', 'build', '__pycache__', '.cache', 'AppData', '$Recycle.Bin', 'Windows'],
  maxResults: 100,
  theme: 'system',
  showOnlyDirectories: false,
  recentSearches: [],
  launchOnStartup: false,
};

const RECENT_SEARCHES_MAX = 20;

const WINDOW_CONFIG = {
  width: 700,
  height: 500,
  padding: 20,
};

const SKIP_DIRS = new Set([
  'node_modules', '$Recycle.Bin', 'System Volume Information',
  'Windows', 'ProgramData', 'AppData', 'Recovery',
  '.git', '.svn', '.hg', 'cache', 'Cache', '.cache',
  'tmp', 'temp', 'Temp', '.tmp', '__pycache__',
  // Windows junction points (legacy symlinks) - can't be watched
  'Application Data', 'Local Settings', 'Cookies', 'NetHood',
  'PrintHood', 'Recent', 'SendTo', 'Start Menu', 'Templates',
  'My Documents', 'My Pictures', 'My Music', 'My Videos',
]);

const SKIP_EXTENSIONS = new Set([
  '.dll', '.exe', '.sys', '.msi', '.cab', '.log',
  '.tmp', '.temp', '.bak', '.swp',
]);

const INDEX_CONFIG = {
  maxDepth: 8,
  liveSearchMaxDepth: 5,
};

const IPC_CHANNELS = {
  SEARCH_FILES: 'search-files',
  GET_INDEX_STATUS: 'get-index-status',
  REBUILD_INDEX: 'rebuild-index',
  INDEX_READY: 'index-ready',
  INDEX_PROGRESS: 'index-progress',

  // File operations
  OPEN_PATH: 'open-path',
  OPEN_IN_EXPLORER: 'open-in-explorer',
  OPEN_FOLDER: 'open-folder',
  OPEN_IN_VSCODE: 'open-in-vscode',
  OPEN_IN_TERMINAL: 'open-in-terminal',
  OPEN_TERMINAL_CLAUDE: 'open-terminal-claude',
  OPEN_VSCODE_CLAUDE: 'open-vscode-claude',

  GET_SETTINGS: 'get-settings',
  SET_SETTING: 'set-setting',
  SELECT_FOLDER: 'select-folder',
  GET_FILE_PREVIEW: 'get-file-preview',

  ADD_RECENT_SEARCH: 'add-recent-search',
  GET_RECENT_SEARCHES: 'get-recent-searches',
  CLEAR_RECENT_SEARCHES: 'clear-recent-searches',

  HIDE_WINDOW: 'hide-window',
  WINDOW_SHOWN: 'window-shown',
  WINDOW_HIDDEN: 'window-hidden',
  THEME_CHANGED: 'theme-changed',
};

module.exports = {
  DEFAULT_SETTINGS,
  RECENT_SEARCHES_MAX,
  WINDOW_CONFIG,
  SKIP_DIRS,
  SKIP_EXTENSIONS,
  INDEX_CONFIG,
  IPC_CHANNELS,
};
