const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { SKIP_DIRS, SKIP_EXTENSIONS, INDEX_CONFIG } = require('../shared/constants');
const { getSetting } = require('./settings');
const { getMatchScore, createTermPatterns } = require('./search');
const db = require('./database');
const logger = require('./logger');

let fileIndex = [];
let isIndexing = false;
let indexReady = false;
let watcher = null;

function loadIndexFromDatabase() {
  const count = db.getFileCount();
  if (count > 0) {
    logger.log(`Loading ${count} files from database...`);
    fileIndex = db.getAllFiles();
    indexReady = true;
    logger.log(`Loaded ${fileIndex.length} files from database`);
    return true;
  }
  return false;
}

async function buildFileIndex(onComplete, forceRebuild = false) {
  if (isIndexing) return;

  if (!forceRebuild && loadIndexFromDatabase()) {
    if (onComplete) {
      onComplete(fileIndex.length);
    }
    backgroundRefresh(onComplete);
    return;
  }

  await fullIndex(onComplete);
}

async function fullIndex(onComplete) {
  isIndexing = true;
  fileIndex = [];

  const customPaths = getSetting('searchPaths');
  const searchPaths = customPaths && customPaths.length > 0
    ? customPaths
    : [process.env.USERPROFILE || process.env.HOME];

  logger.log('Starting full file indexing...');
  const startTime = Date.now();

  db.clearAllFiles();

  let batch = [];
  const BATCH_SIZE = 1000;

  for (const basePath of searchPaths) {
    await indexDirectory(basePath, 0, INDEX_CONFIG.maxDepth, batch, BATCH_SIZE);
  }

  if (batch.length > 0) {
    db.insertFiles(batch);
    fileIndex.push(...batch);
  }

  db.setMetadata('lastIndexed', Date.now());
  db.setMetadata('searchPaths', searchPaths);

  isIndexing = false;
  indexReady = true;
  logger.log(`Indexing complete: ${fileIndex.length} files in ${Date.now() - startTime}ms`);

  if (onComplete) {
    onComplete(fileIndex.length);
  }
}

async function backgroundRefresh(onComplete) {
  const lastIndexed = db.getMetadata('lastIndexed');
  const hoursSinceIndex = lastIndexed ? (Date.now() - lastIndexed) / (1000 * 60 * 60) : Infinity;

  if (hoursSinceIndex < 1) {
    logger.log('Index is fresh, skipping background refresh');
    return;
  }

  logger.log('Starting background refresh...');
  setTimeout(async () => {
    await fullIndex(onComplete);
  }, 5000);
}

async function indexDirectory(dirPath, depth, maxDepth, batch, batchSize) {
  if (depth > maxDepth) return;

  const excludePatterns = getSetting('excludePatterns') || [];
  const skipSet = new Set([...SKIP_DIRS, ...excludePatterns]);

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.') || skipSet.has(entry.name)) {
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (SKIP_EXTENSIONS.has(ext)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const isDir = entry.isDirectory();

      const file = {
        name: entry.name,
        nameLower: entry.name.toLowerCase(),
        path: fullPath,
        isDirectory: isDir,
      };

      batch.push(file);

      if (batch.length >= batchSize) {
        db.insertFiles(batch);
        fileIndex.push(...batch);
        batch.length = 0;
      }

      if (isDir && depth < maxDepth) {
        await indexDirectory(fullPath, depth + 1, maxDepth, batch, batchSize);
      }
    }
  } catch (err) {
    if (err.code !== 'EACCES' && err.code !== 'EPERM' && err.code !== 'EBUSY') {
      logger.error(`Index error in ${dirPath}:`, err.message);
    }
  }
}

async function searchDirectoryLive(dirPath, termPatterns, results, maxResults, depth, maxDepth) {
  if (depth > maxDepth || results.length >= maxResults) return;

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (results.length >= maxResults) break;

      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const score = getMatchScore(entry.name, termPatterns);

      if (score > 0) {
        results.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          score,
        });
      }

      if (entry.isDirectory() && depth < maxDepth) {
        await searchDirectoryLive(fullPath, termPatterns, results, maxResults, depth + 1, maxDepth);
      }
    }
  } catch (err) {
    if (err.code !== 'EACCES' && err.code !== 'EPERM' && err.code !== 'EBUSY') {
      logger.error(`Search error in ${dirPath}:`, err.message);
    }
  }
}

function getFileIndex() {
  return fileIndex;
}

function getIndexStatus() {
  return { ready: indexReady, count: fileIndex.length, indexing: isIndexing };
}

function isIndexReady() {
  return indexReady;
}

function resetIndex() {
  indexReady = false;
}

function rebuildIndex(onComplete) {
  return buildFileIndex(onComplete, true);
}

function shouldIgnore(filePath) {
  const excludePatterns = getSetting('excludePatterns') || [];
  const skipSet = new Set([...SKIP_DIRS, ...excludePatterns]);

  const parts = filePath.split(path.sep);
  for (const part of parts) {
    if (part.startsWith('.') || skipSet.has(part)) {
      return true;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  if (SKIP_EXTENSIONS.has(ext)) {
    return true;
  }

  return false;
}

function startWatcher() {
  if (watcher) {
    watcher.close();
  }

  const customPaths = getSetting('searchPaths');
  const watchPaths = customPaths && customPaths.length > 0
    ? customPaths
    : [process.env.USERPROFILE || process.env.HOME];

  const excludePatterns = getSetting('excludePatterns') || [];
  const ignored = [...SKIP_DIRS, ...excludePatterns].map(p => `**/${p}/**`);

  logger.log('Starting file watcher on:', watchPaths);

  watcher = chokidar.watch(watchPaths, {
    ignored: [/(^|[\/\\])\../, ...ignored],
    persistent: true,
    ignoreInitial: true,
    depth: INDEX_CONFIG.maxDepth,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  });

  watcher
    .on('add', (filePath) => {
      if (shouldIgnore(filePath)) return;

      const file = {
        name: path.basename(filePath),
        nameLower: path.basename(filePath).toLowerCase(),
        path: filePath,
        isDirectory: false,
      };

      db.insertFile(file);
      fileIndex.push(file);
      logger.log('File added:', filePath);
    })
    .on('addDir', (dirPath) => {
      if (shouldIgnore(dirPath)) return;

      const file = {
        name: path.basename(dirPath),
        nameLower: path.basename(dirPath).toLowerCase(),
        path: dirPath,
        isDirectory: true,
      };

      db.insertFile(file);
      fileIndex.push(file);
      logger.log('Directory added:', dirPath);
    })
    .on('unlink', (filePath) => {
      db.deleteFile(filePath);
      fileIndex = fileIndex.filter(f => f.path !== filePath);
      logger.log('File removed:', filePath);
    })
    .on('unlinkDir', (dirPath) => {
      db.deleteFilesByPathPrefix(dirPath);
      fileIndex = fileIndex.filter(f => !f.path.startsWith(dirPath));
      logger.log('Directory removed:', dirPath);
    })
    .on('error', (error) => {
      logger.error('Watcher error:', error);
    });
}

function stopWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
    logger.log('File watcher stopped');
  }
}

module.exports = {
  buildFileIndex,
  searchDirectoryLive,
  getFileIndex,
  getIndexStatus,
  isIndexReady,
  resetIndex,
  rebuildIndex,
  loadIndexFromDatabase,
  startWatcher,
  stopWatcher,
};
