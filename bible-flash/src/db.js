const fs = require('fs');
const csv = require('csv-parser');
const { app } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const createSettingDatabase = () => {
  const settingDB = new sqlite3.Database(path.join(app.getPath('userData'), 'setting.db'), (err) => {
    if (err) {
      console.error(err.message);
    }
  });

  settingDB.serialize(() => {
    settingDB.run('CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, font TEXT, background TEXT)');
  });

  settingDB.close((err) => {
    if (err) {
      console.error(err.message);
    }
  });
};

const loadBibleDatabase = (csvPath) => {
  const bibleDbPath = path.join(app.getPath('userData'), 'bible.db');
  const bibleDB = new sqlite3.Database(bibleDbPath, (err) => {
    if (err) {
      console.error(err.message);
    }
  });

  bibleDB.serialize(() => {
    bibleDB.run('DROP TABLE IF EXISTS bible');
    bibleDB.run(`
      CREATE TABLE IF NOT EXISTS bible (
        book INTEGER NOT NULL,
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        sentence TEXT NOT NULL
      )
    `);
  });

  const stmt = bibleDB.prepare(`
    INSERT INTO bible (book, chapter, verse, sentence)
    VALUES (?, ?, ?, ?)
  `);
  
  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (row) => {
      // console.log(row);
      stmt.run([row.book, row.chapter, row.verse, row.sentence]);
    })
    .on('end', () => {
      stmt.finalize();

      console.log('CSV file successfully processed');

      bibleDB.close((err) => {
        if (err) {
          console.error(err.message);
        }
      });
    });
}

module.exports = {
  createSettingDatabase,
  loadBibleDatabase
};