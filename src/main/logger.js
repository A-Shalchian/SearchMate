const isDev = !require('electron').app.isPackaged;

const logger = {
  log: (...args) => {
    if (isDev) console.log(...args);
  },
  error: (...args) => {
    console.error(...args);
  },
  warn: (...args) => {
    if (isDev) console.warn(...args);
  }
};

module.exports = logger;
