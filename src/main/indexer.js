const fs = require('fs');
const path = require('path');
const { SKIP_DIRS, SKIP_EXTENSIONS, INDEX_CONFIG } = require('../shared/constants');
const { getSetting } = require('./settings');
const { getMatchScore } = require('./search');

let fileIndex = [];
let isIndexing = false;
let indexReady = false;

async function buildFileIndex(onComplete) {
  if (isIndexing) return;
  isIndexing = true;
  fileIndex = [];

  const customPaths = getSetting('searchPaths');
  const searchPaths = customPaths && customPaths.length > 0
    ? customPaths
    : [process.env.USERPROFILE || process.env.HOME];

  console.log('Starting file indexing...');
  const startTime = Date.now();

  for (const basePath of searchPaths) {
    await indexDirectory(basePath, 0, INDEX_CONFIG.maxDepth);
  }

  isIndexing = false;
  indexReady = true;
  console.log(`Indexing complete: ${fileIndex.length} files in ${Date.now() - startTime}ms`);

  if (onComplete) {
    onComplete(fileIndex.length);
  }
}

async function indexDirectory(dirPath, depth, maxDepth) {
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

      fileIndex.push({
        name: entry.name,
        nameLower: entry.name.toLowerCase(),
        path: fullPath,
        isDirectory: isDir,
      });

      if (isDir && depth < maxDepth) {
        await indexDirectory(fullPath, depth + 1, maxDepth);
      }
    }
  } catch (err) {}
}

async function searchDirectoryLive(dirPath, searchTerms, results, maxResults, depth, maxDepth) {
  if (depth > maxDepth || results.length >= maxResults) return;

  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (results.length >= maxResults) break;

      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const score = getMatchScore(entry.name, searchTerms);

      if (score > 0) {
        results.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          score,
        });
      }

      if (entry.isDirectory() && depth < maxDepth) {
        await searchDirectoryLive(fullPath, searchTerms, results, maxResults, depth + 1, maxDepth);
      }
    }
  } catch (err) {}
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

module.exports = {
  buildFileIndex,
  searchDirectoryLive,
  getFileIndex,
  getIndexStatus,
  isIndexReady,
  resetIndex,
};
