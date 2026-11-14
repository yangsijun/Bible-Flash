const fs = require('fs');
const { app } = require('electron');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { BUILD_SQL, VALIDATE_SQL, assertValid } = require('./bibleSchema');

// The Bible database is a separate, replaceable file, not part of the app:
// the source database (e.g. Bible_NKRV.sqlite) kept as-is in userData
// (%APPDATA%\bible-flash\bible.sqlite on Windows). It is copied there by
// Setting > Load Database, or can be replaced by hand while the app is closed.
const bibleFilePath = () => path.join(app.getPath('userData'), 'bible.sqlite');

let bibleDB = null;

const getDB = () => {
  if (!bibleDB) throw new Error('성경 DB가 열려 있지 않습니다. Setting > Load Database로 불러오세요.');
  return bibleDB;
};

// Reads a source file into an indexed in-memory copy (about 25 ms). The file
// is detached afterwards, so it is never held open or locked.
const loadIntoMemory = (file) => {
  const db = new DatabaseSync(':memory:');
  try {
    db.prepare('ATTACH DATABASE ? AS src').run(file);
    db.exec(`BEGIN; ${BUILD_SQL} COMMIT;`);
    db.exec('DETACH DATABASE src');
    assertValid(db.prepare(VALIDATE_SQL).get());
    return db;
  } catch (err) {
    db.close();
    throw err;
  }
};

const switchTo = (db) => {
  if (bibleDB?.isOpen) bibleDB.close();
  bibleDB = db;
};

const hasBibleFile = () => fs.existsSync(bibleFilePath());

// Returns the file path. Throws if the file is missing or not a Bible database.
const openBibleDatabase = () => {
  const file = bibleFilePath();
  switchTo(loadIntoMemory(file));
  return file;
};

// Antivirus or the search indexer can hold a freshly written file for a moment
// on Windows, so a failed replace is retried a few times before giving up.
const renameWithRetry = (from, to) => {
  for (let attempt = 1; ; attempt++) {
    try {
      fs.renameSync(from, to);
      return;
    } catch (err) {
      if (attempt >= 5 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) throw err;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
};

// Checks the chosen file first, then copies it into place unchanged, so a bad
// file never replaces a working one. Errors while saving (not while checking)
// carry `saveFailed` so the UI does not blame the chosen file.
const importBibleDatabase = (sourcePath) => {
  const db = loadIntoMemory(sourcePath);
  const target = bibleFilePath();
  const tmp = `${target}.tmp`;
  try {
    fs.copyFileSync(sourcePath, tmp);
    // Windows copies the read-only attribute, which would block the next replace.
    fs.chmodSync(tmp, 0o666);
    // The copy must work on its own: a WAL-mode source can keep data in a
    // -wal sidecar that the copy does not include.
    loadIntoMemory(tmp).close();
    if (fs.existsSync(target)) fs.chmodSync(target, 0o666);
    renameWithRetry(tmp, target);
  } catch (err) {
    db.close();
    fs.rmSync(tmp, { force: true });
    throw Object.assign(new Error(`DB 파일을 저장하지 못했습니다.\n${err.message}`), { saveFailed: true });
  }
  switchTo(db);
  return target;
};

// Accepts the abbreviation (마), the full name (마태복음), or a prefix of the
// full name that matches exactly one book (마태). Returns undefined otherwise.
const findBook = (label) => {
  const db = getDB();
  const exact = db.prepare('SELECT id, name, abbr FROM books WHERE abbr = ? OR name = ?')
    .get(label, label);
  if (exact) return { ...exact };

  const prefix = db.prepare("SELECT id, name, abbr FROM books WHERE name LIKE ? || '%' ESCAPE '\\'")
    .all(label.replace(/[\\%_]/g, '\\$&'));
  return prefix.length === 1 ? { ...prefix[0] } : undefined;
};

const getBook = (id) => {
  const row = getDB().prepare('SELECT id, name, abbr FROM books WHERE id = ?').get(id);
  return row && { ...row };
};

const getBookList = () => getDB()
  .prepare('SELECT id, name, abbr FROM books ORDER BY id')
  .all()
  .map((row) => ({ idx: row.id, long_label: row.name, short_label: row.abbr }));

const getNumberOfChapters = (book) => getDB()
  .prepare('SELECT MAX(chapter) AS n FROM verses WHERE book = ?')
  .get(book).n;

const getNumberOfVerses = (book, chapter) => getDB()
  .prepare('SELECT MAX(verse) AS n FROM verses WHERE book = ? AND chapter = ?')
  .get(book, chapter).n;

// Returns the verse text, or undefined if the verse does not exist.
const queryVerse = (book, chapter, verse) => getDB()
  .prepare('SELECT text FROM verses WHERE book = ? AND chapter = ? AND verse = ?')
  .get(book, chapter, verse)?.text;

// The verse right after (direction 1) or before (-1) the given one, crossing
// chapter and book boundaries. Undefined at Genesis 1:1 / Revelation 22:21.
const getAdjacentVerse = (book, chapter, verse, direction) => {
  const sql = direction > 0
    ? `SELECT book, chapter, verse FROM verses WHERE (book, chapter, verse) > (?, ?, ?)
       ORDER BY book, chapter, verse LIMIT 1`
    : `SELECT book, chapter, verse FROM verses WHERE (book, chapter, verse) < (?, ?, ?)
       ORDER BY book DESC, chapter DESC, verse DESC LIMIT 1`;
  const row = getDB().prepare(sql).get(book, chapter, verse);
  return row && { ...row };
};

module.exports = {
  bibleFilePath,
  hasBibleFile,
  openBibleDatabase,
  importBibleDatabase,
  findBook,
  getBook,
  getBookList,
  getNumberOfChapters,
  getNumberOfVerses,
  queryVerse,
  getAdjacentVerse,
};
