const log = require('electron-log');
const { app } = require('electron');

log.transports.file.level = 'info';
log.transports.console.level = app.isPackaged ? 'error' : 'debug';
log.transports.file.maxSize = 5 * 1024 * 1024;
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';

log.info('='.repeat(50));
log.info(`SearchMate starting - v${app.getVersion()}`);
log.info(`Platform: ${process.platform}, Arch: ${process.arch}`);
log.info(`Electron: ${process.versions.electron}, Node: ${process.versions.node}`);
log.info(`App Path: ${app.isPackaged ? app.getPath('exe') : 'Development'}`);
log.info(`Log Path: ${log.transports.file.getFile().path}`);
log.info('='.repeat(50));

const logger = {
  log: (...args) => log.info(...args),
  info: (...args) => log.info(...args),
  error: (...args) => log.error(...args),
  warn: (...args) => log.warn(...args),
  debug: (...args) => log.debug(...args),
  getLogPath: () => log.transports.file.getFile().path
};

module.exports = logger;
