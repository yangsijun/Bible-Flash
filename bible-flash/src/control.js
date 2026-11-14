const form = document.getElementById('reference-form');
const input = document.getElementById('verse-text-input');
const suggestionList = document.getElementById('suggestions');
const message = document.getElementById('message');
const bookSelect = document.getElementById('book-select');
const chapterSelect = document.getElementById('chapter-select');
const verseSelect = document.getElementById('verse-select');

let books = [];
let suggestions = [];
let activeIndex = -1;

const showMessage = (text = '') => {
  message.textContent = text;
};

// Calls the main process and shows its error message, if any.
const run = async (channel, data) => {
  try {
    const result = await window.api.invoke(channel, data);
    showMessage(result?.ok === false ? result.message : '');
  } catch (err) {
    showMessage(err.message);
  }
};

// ---------------------------------------------------------------------------
// Book name autocomplete
// ---------------------------------------------------------------------------

const renderSuggestions = () => {
  suggestionList.replaceChildren(...suggestions.map((book, i) => {
    const item = document.createElement('li');
    item.role = 'option';
    item.textContent = `${book.long_label} (${book.short_label})`;
    item.setAttribute('aria-selected', String(i === activeIndex));
    // mousedown (not click) so the input keeps focus.
    item.addEventListener('mousedown', (event) => {
      event.preventDefault();
      acceptSuggestion(i);
    });
    return item;
  }));
  suggestionList.hidden = suggestions.length === 0;
  input.setAttribute('aria-expanded', String(suggestions.length > 0));
};

const closeSuggestions = () => {
  suggestions = [];
  activeIndex = -1;
  renderSuggestions();
};

const acceptSuggestion = (i) => {
  input.value = `${suggestions[i].long_label} `;
  closeSuggestions();
  input.focus();
};

input.addEventListener('input', () => {
  // Only the book part is completed; stop once a chapter number is typed.
  const query = input.value.trim();
  suggestions = /\d/.test(query) ? [] : searchBooks(books, query);
  activeIndex = suggestions.length ? 0 : -1;
  renderSuggestions();
});

input.addEventListener('keydown', (event) => {
  // Ignore keys that only confirm a Korean IME composition.
  if (event.isComposing || event.keyCode === 229 || suggestions.length === 0) return;

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    const step = event.key === 'ArrowDown' ? 1 : -1;
    activeIndex = (activeIndex + step + suggestions.length) % suggestions.length;
    renderSuggestions();
  } else if (event.key === 'Enter' || event.key === 'Tab') {
    acceptSuggestion(activeIndex);
  } else if (event.key === 'Escape') {
    // Close the list without also hiding the display window.
    closeSuggestions();
    event.stopPropagation();
  } else {
    return;
  }
  event.preventDefault();
});

input.addEventListener('blur', closeSuggestions);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  closeSuggestions();
  run('show-reference', input.value);
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

document.getElementById('prev-btn').addEventListener('click', () => run('navigate', -1));
document.getElementById('next-btn').addEventListener('click', () => run('navigate', 1));

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    window.api.send('close-display-window');
    return;
  }

  // Presenter clickers send PageUp/PageDown, so those work everywhere.
  // Arrow keys are left alone while typing or inside a dropdown.
  const typing = ['INPUT', 'SELECT'].includes(document.activeElement.tagName);
  if (event.key === 'PageDown' || (!typing && event.key === 'ArrowRight')) {
    event.preventDefault();
    run('navigate', 1);
  } else if (event.key === 'PageUp' || (!typing && event.key === 'ArrowLeft')) {
    event.preventDefault();
    run('navigate', -1);
  }
});

// ---------------------------------------------------------------------------
// Book / chapter / verse dropdowns
// ---------------------------------------------------------------------------

const fillSelect = (select, count) => {
  select.replaceChildren(new Option(' - ', ''));
  for (let i = 1; i <= count; i++) {
    select.appendChild(new Option(String(i), String(i)));
  }
};

const loadChapters = async (book) => {
  fillSelect(chapterSelect, book ? await window.api.invoke('get-chapter-count', book) : 0);
  fillSelect(verseSelect, 0);
};

const loadVerses = async (book, chapter) => {
  fillSelect(verseSelect, chapter
    ? await window.api.invoke('get-verse-count', { book, chapter })
    : 0);
};

bookSelect.addEventListener('change', () => loadChapters(bookSelect.value));
chapterSelect.addEventListener('change', () => loadVerses(bookSelect.value, chapterSelect.value));
verseSelect.addEventListener('change', () => {
  if (!verseSelect.value) return;
  run('show-verse', {
    book: bookSelect.value,
    chapter: chapterSelect.value,
    verse: verseSelect.value,
  });
});

// Keeps the input and dropdowns in sync with what is on screen.
// A newer update cancels an older one still waiting on its dropdown reloads,
// so holding PageDown cannot leave the dropdowns on a stale chapter.
let syncId = 0;
window.api.on('current-verse', async (event, { id, abbr, chapter, verse }) => {
  const mySync = ++syncId;
  input.value = `${abbr} ${chapter}:${verse}`;
  if (bookSelect.value !== String(id)) {
    bookSelect.value = String(id);
    await loadChapters(id);
    if (mySync !== syncId) return;
  }
  if (chapterSelect.value !== String(chapter)) {
    chapterSelect.value = String(chapter);
    await loadVerses(id, chapter);
    if (mySync !== syncId) return;
  }
  verseSelect.value = String(verse);
});

(async () => {
  try {
    books = await window.api.invoke('get-book-list');
    bookSelect.replaceChildren(
      new Option(' - ', ''),
      ...books.map((book) => new Option(book.long_label, String(book.idx)))
    );
    fillSelect(chapterSelect, 0);
    fillSelect(verseSelect, 0);
  } catch (err) {
    showMessage(err.message);
  }
})();
