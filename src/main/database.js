const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const logger = require('./logger');

let db = null;

function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'searchmate.db');
}

function initDatabase() {
  const dbPath = getDbPath();
  logger.log('Database path:', dbPath);

  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_lower TEXT NOT NULL,
      path TEXT UNIQUE NOT NULL,
      is_directory INTEGER NOT NULL
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_name_lower ON files(name_lower)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_path ON files(path)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  logger.log('Database initialized');
  return db;
}

function insertFile(file) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO files (name, name_lower, path, is_directory)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(file.name, file.name.toLowerCase(), file.path, file.isDirectory ? 1 : 0);
}

function insertFiles(files) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO files (name, name_lower, path, is_directory)
    VALUES (?, ?, ?, ?)
  `);

  const insertMany = db.transaction((files) => {
    for (const file of files) {
      stmt.run(file.name, file.name.toLowerCase(), file.path, file.isDirectory ? 1 : 0);
    }
  });

  insertMany(files);
}

function searchFiles(searchTerms, limit = 100) {
  let query = `SELECT name, path, is_directory FROM files WHERE 1=1`;
  const params = [];

  for (const term of searchTerms) {
    query += ` AND name_lower LIKE ?`;
    params.push(`%${term}%`);
  }

  query += ` LIMIT ?`;
  params.push(limit);

  const stmt = db.prepare(query);
  const rows = stmt.all(...params);

  return rows.map(row => ({
    name: row.name,
    path: row.path,
    isDirectory: row.is_directory === 1
  }));
}

function getAllFiles() {
  const stmt = db.prepare(`SELECT name, path, is_directory FROM files`);
  const rows = stmt.all();

  return rows.map(row => ({
    name: row.name,
    nameLower: row.name.toLowerCase(),
    path: row.path,
    isDirectory: row.is_directory === 1
  }));
}

function getFileCount() {
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM files`);
  const row = stmt.get();
  return row.count;
}

function deleteFile(filePath) {
  const stmt = db.prepare(`DELETE FROM files WHERE path = ?`);
  stmt.run(filePath);
}

function deleteFilesByPathPrefix(pathPrefix) {
  const stmt = db.prepare(`DELETE FROM files WHERE path LIKE ?`);
  stmt.run(pathPrefix + '%');
}

function clearAllFiles() {
  db.exec(`DELETE FROM files`);
}

function setMetadata(key, value) {
  const stmt = db.prepare(`INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)`);
  stmt.run(key, JSON.stringify(value));
}

function getMetadata(key) {
  const stmt = db.prepare(`SELECT value FROM metadata WHERE key = ?`);
  const row = stmt.get(key);
  return row ? JSON.parse(row.value) : null;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

function getDatabase() {
  return db;
}

module.exports = {
  initDatabase,
  insertFile,
  insertFiles,
  searchFiles,
  getAllFiles,
  getFileCount,
  deleteFile,
  deleteFilesByPathPrefix,
  clearAllFiles,
  setMetadata,
  getMetadata,
  closeDatabase,
  getDatabase,
};
