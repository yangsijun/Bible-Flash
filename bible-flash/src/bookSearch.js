// Book-name suggestions for the reference input. Loaded as a plain <script> in
// control.html and via require() in tests, so it must not use imports.

const CHOSEONG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

// '마' -> 'ㅁ'. Non-syllables are returned unchanged.
const toChoseong = (ch) => {
  const offset = ch.charCodeAt(0) - 0xac00;
  return offset >= 0 && offset < 11172 ? CHOSEONG[Math.floor(offset / 588)] : ch;
};

// Prefix match where a lone consonant in the query matches any syllable that
// starts with it, so 'ㅁㅌ', '마ㅌ' and '마태' all match '마태복음'. This also
// covers the half-typed syllable the Korean IME shows while composing.
const startsWithLoose = (text, query) => query.length <= text.length &&
  [...query].every((q, i) => q === text[i] || (CHOSEONG.includes(q) && toChoseong(text[i]) === q));

// books: [{ idx, long_label, short_label }]. Best matches first:
// exact abbreviation, then name prefix, abbreviation prefix, then choseong.
const searchBooks = (books, rawQuery, limit = 8) => {
  const query = rawQuery.replace(/\s+/g, '');
  if (!query) return [];

  const rank = (book) => {
    if (book.short_label === query) return 0;
    if (book.long_label.startsWith(query)) return 1;
    if (book.short_label.startsWith(query)) return 2;
    if (startsWithLoose(book.long_label, query)) return 3;
    if (startsWithLoose(book.short_label, query)) return 4;
    return -1;
  };

  return books
    .map((book) => [rank(book), book])
    .filter(([r]) => r >= 0)
    .sort((a, b) => a[0] - b[0] || a[1].idx - b[1].idx)
    .slice(0, limit)
    .map(([, book]) => book);
};

if (typeof module !== 'undefined') module.exports = { searchBooks };
