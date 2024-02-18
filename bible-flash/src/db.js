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
    bibleDB.run('DROP TABLE IF EXISTS books');
    bibleDB.run(`
      CREATE TABLE IF NOT EXISTS books (
        idx INTEGER PRIMARY KEY,
        short_label TEXT NOT NULL,
        long_label TEXT NOT NULL
      )
    `);
    bibleDB.run(`
      INSERT INTO books (idx, short_label, long_label)
      VALUES
        (1, '창', '창세기'),
        (2, '출', '출애굽기'),
        (3, '레', '레위기'),
        (4, '민', '민수기'),
        (5, '신', '신명기'),
        (6, '여', '여호수아'),
        (7, '삿', '사사기'),
        (8, '룻', '룻기'),
        (9, '삼상', '사무엘상'),
        (10, '삼하', '사무엘하'),
        (11, '왕상', '열왕기상'),
        (12, '왕하', '열왕기하'),
        (13, '대상', '역대상'),
        (14, '대하', '역대하'),
        (15, '스', '에스라'),
        (16, '느', '느헤미야'),
        (17, '에', '에스더'),
        (18, '욥', '욥기'),
        (19, '시', '시편'),
        (20, '잠', '잠언'),
        (21, '전', '전도서'),
        (22, '아', '아가'),
        (23, '사', '이사야'),
        (24, '렘', '예레미야'),
        (25, '애', '애가'),
        (26, '겔', '에스겔'),
        (27, '단', '다니엘'),
        (28, '호', '호세아'),
        (29, '욜', '요엘'),
        (30, '암', '아모스'),
        (31, '옵', '오바댜'),
        (32, '욘', '요나'),
        (33, '미', '미가'),
        (34, '나', '나훔'),
        (35, '합', '하박국'),
        (36, '습', '스바냐'),
        (37, '학', '학개'),
        (38, '슥', '스가랴'),
        (39, '말', '말라기'),
        (40, '마', '마태복음'),
        (41, '막', '마가복음'),
        (42, '눈', '누가복음'),
        (43, '요', '요한복음'),
        (44, '행', '사도행전'),
        (45, '롬', '로마서'),
        (46, '고전', '고린도전서'),
        (47, '고후', '고린도후서'),
        (48, '갈', '갈라디아서'),
        (49, '엡', '에베소서'),
        (50, '빌', '빌립보서'),
        (51, '골', '골로새서'),
        (52, '살전', '데살로니가전서'),
        (53, '살후', '데살로니가후서'),
        (54, '딤전', '디모데전서'),
        (55, '딤후', '디모데후서'),
        (56, '딛', '디도서'),
        (57, '몬', '빌레몬서'),
        (58, '히', '히브리서'),
        (59, '약', '야고보서'),
        (60, '벧전', '베드로전서'),
        (61, '벧후', '베드로후서'),
        (62, '요일', '요한일서'),
        (63, '요이', '요한이서'),
        (64, '요삼', '요한삼서'),
        (65, '유', '유다서'),
        (66, '계', '요한계시록')
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

const getBookNumberFromShortLabel = (shortLabel) => {
  return new Promise((resolve, reject) => {
    const bibleDbPath = path.join(app.getPath('userData'), 'bible.db');
    const bibleDB = new sqlite3.Database(bibleDbPath, (err) => {
      if (err) {
        console.error(err.message);
      }
    });

    bibleDB.serialize(() => {
      bibleDB.all(
        `SELECT idx FROM books WHERE short_label = ?`,
        [shortLabel],
        (err, rows) => {
          if (err) {
            reject(err);
          } else if (rows.length === 0) {
            console.log('no book found');
            resolve(-1);
          } else {
            console.log(rows[0]);
            resolve(rows[0].idx);
          }

          bibleDB.close((err) => {
            if (err) {
              console.error(err.message);
            }
          });
        }
      );
    });
  });
}

const getBookNumberFromLongLabel = (longLabel) => {
  return new Promise((resolve, reject) => {
    const bibleDbPath = path.join(app.getPath('userData'), 'bible.db');
    const bibleDB = new sqlite3.Database(bibleDbPath, (err) => {
      if (err) {
        console.error(err.message);
      }
    });

    bibleDB.serialize(() => {
      bibleDB.all(
        `SELECT idx FROM books WHERE long_label = ?`,
        [longLabel],
        (err, rows) => {
          if (err) {
            reject(err);
          } else if (rows.length === 0) {
            console.log('no book found');
            resolve(-1);
          } else {
            resolve(rows[0].idx);
          }

          bibleDB.close((err) => {
            if (err) {
              console.error(err.message);
            }
          });
        }
      );
    });
  });
}

const getBookShortLabel = (book) => {
  return new Promise((resolve, reject) => {
    const bibleDbPath = path.join(app.getPath('userData'), 'bible.db');
    const bibleDB = new sqlite3.Database(bibleDbPath, (err) => {
      if (err) {
        console.error(err.message);
      }
    });

    bibleDB.serialize(() => {
      bibleDB.each(
        `SELECT short_label FROM books WHERE idx = ?`,
        [book],
        (err, row) => {
          if (err) {
            reject(err);
          }
          resolve(row.short_label);
        }
      );
    });

    bibleDB.close((err) => {
      if (err) {
        console.error(err.message);
      }
    });
  });
}

const getBookLongLabel = (book) => {
  return new Promise((resolve, reject) => {
    const bibleDbPath = path.join(app.getPath('userData'), 'bible.db');
    const bibleDB = new sqlite3.Database(bibleDbPath, (err) => {
      if (err) {
        console.error(err.message);
      }
    });

    bibleDB.serialize(() => {
      bibleDB.each(
        `SELECT long_label FROM books WHERE idx = ?`,
        [book],
        (err, row) => {
          if (err) {
            reject(err);
          }
          resolve(row.long_label);
        }
      );
    });

    bibleDB.close((err) => {
      if (err) {
        console.error(err.message);
      }
    });
  });
}

const getNumberOfChapters = (book) => {
  return new Promise((resolve, reject) => {
    const bibleDbPath = path.join(app.getPath('userData'), 'bible.db');
    const bibleDB = new sqlite3.Database(bibleDbPath, (err) => {
      if (err) {
        console.error(err.message);
      }
    });

    bibleDB.serialize(() => {
      bibleDB.each(
        `SELECT MAX(chapter) AS max_chapter FROM bible WHERE book = ?`,
        [book],
        (err, row) => {
          if (err) {
            reject(err);
          }
          resolve(row.max_chapter);
        }
      );
    });

    bibleDB.close((err) => {
      if (err) {
        console.error(err.message);
      }
    });
  });
}

const getNumberOfVerses = (book, chapter) => {
  return new Promise((resolve, reject) => {
    const bibleDbPath = path.join(app.getPath('userData'), 'bible.db');
    const bibleDB = new sqlite3.Database(bibleDbPath, (err) => {
      if (err) {
        console.error(err.message);
      }
    });

    bibleDB.serialize(() => {
      bibleDB.each(
        `SELECT MAX(verse) AS max_verse FROM bible WHERE book = ? AND chapter = ?`,
        [book, chapter],
        (err, row) => {
          if (err) {
            reject(err);
          }
          resolve(row.max_verse);
        }
      );
    });

    bibleDB.close((err) => {
      if (err) {
        console.error(err.message);
      }
    });
  });
}

const queryVerse = (book, chapter, verse) => {
  console.log(book, chapter, verse);
  return new Promise((resolve, reject) => {
    const bibleDbPath = path.join(app.getPath('userData'), 'bible.db');
    const bibleDB = new sqlite3.Database(bibleDbPath, (err) => {
      if (err) {
        console.error(err.message);
      }
    });

    bibleDB.serialize(() => {
      bibleDB.each(
        `SELECT sentence FROM bible WHERE book = ? AND chapter = ? AND verse = ?`,
        [book, chapter, verse],
        (err, row) => {
          if (err) {
            reject(err);
          }
          resolve(row.sentence);
        }
      );
    });

    bibleDB.close((err) => {
      if (err) {
        console.error(err.message);
      }
    });
  });
};

module.exports = {
  createSettingDatabase,
  loadBibleDatabase,
  getBookNumberFromShortLabel,
  getBookNumberFromLongLabel,
  getBookShortLabel,
  getBookLongLabel,
  getNumberOfChapters,
  getNumberOfVerses,
  queryVerse
};