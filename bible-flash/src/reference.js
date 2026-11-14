// Parses what the operator types into { book, chapter, verse }.
// Accepted forms (spaces optional):
//   요 3:16   요3:16   요 3 16   요3.16   요한복음 3장 16절   요 3   요 3:16-18
// A missing verse means verse 1. A range end (-18) is accepted but ignored:
// the range starts at its first verse and "다음" steps through the rest.
const REFERENCE_PATTERN =
  /^(\D+?)\s*(\d+)\s*(?:(?:장\s*|[:.]\s*|\s+)(\d+)\s*절?)?\s*장?\s*(?:[-~]\s*\d+\s*절?)?$/;

const parseReference = (input) => {
  const match = String(input).trim().match(REFERENCE_PATTERN);
  if (!match) return null;
  const [, book, chapter, verse] = match;
  return {
    book: book.replace(/\s+/g, ''),
    chapter: Number(chapter),
    verse: verse === undefined ? 1 : Number(verse),
  };
};

module.exports = { parseReference };
