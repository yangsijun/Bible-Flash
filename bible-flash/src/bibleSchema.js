// SQL that turns a source Bible database (bible_book / bible_verse /
// bible_book_abbreviation tables, e.g. Bible_NKRV.sqlite) into the indexed
// in-memory schema the app queries. The source must be attached as `src`.

const BUILD_SQL = `
  CREATE TABLE books (
    id    INTEGER PRIMARY KEY,
    code  TEXT NOT NULL UNIQUE,
    name  TEXT NOT NULL,
    abbr  TEXT NOT NULL
  );

  CREATE TABLE verses (
    book    INTEGER NOT NULL REFERENCES books(id),
    chapter INTEGER NOT NULL,
    verse   INTEGER NOT NULL,
    text    TEXT NOT NULL,
    PRIMARY KEY (book, chapter, verse)
  ) WITHOUT ROWID;

  INSERT INTO books (id, code, name, abbr)
  SELECT
    b.book_order,
    b.book_code,
    b.book_name,
    (SELECT a.abbreviation FROM src.bible_book_abbreviation a
      WHERE a.book_code = b.book_code ORDER BY a.id LIMIT 1)
  FROM src.bible_book b
  ORDER BY b.book_order;

  INSERT INTO verses (book, chapter, verse, text)
  SELECT book_order, chapter, verse, verse_text
  FROM src.bible_verse
  WHERE verse_text IS NOT NULL AND trim(verse_text) <> ''
  ORDER BY book_order, chapter, verse;
`;

const VALIDATE_SQL = `
  SELECT
    (SELECT count(*) FROM books) AS books,
    (SELECT count(*) FROM books WHERE abbr IS NULL) AS missingAbbr,
    (SELECT count(*) FROM verses) AS verses
`;

// Throws if the built database is clearly incomplete.
const assertValid = ({ books, missingAbbr, verses }) => {
  if (books !== 66 || missingAbbr !== 0 || verses < 30000) {
    throw new Error(
      `Invalid Bible database: books=${books}, missingAbbr=${missingAbbr}, verses=${verses}`
    );
  }
};

module.exports = { BUILD_SQL, VALIDATE_SQL, assertValid };
