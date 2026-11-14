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
    return result;
  } catch (err) {
    showMessage(err.message);
    return undefined;
  }
};

// ---------------------------------------------------------------------------
// History: verses opened by search, the dropdowns or the history itself.
// Prev/next stepping is left out so a long reading does not flood the list.
// Newest first, no duplicates, kept only until the app restarts.
// ---------------------------------------------------------------------------

const HISTORY_LIMIT = 30;
const historyList = document.getElementById('history');
let history = [];

const renderHistory = () => {
  historyList.replaceChildren(...history.map((entry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${entry.name} ${entry.chapter}:${entry.verse}`;
    button.addEventListener('click', () => showAndRecord('show-verse', {
      book: entry.id, chapter: entry.chapter, verse: entry.verse,
    }));
    const item = document.createElement('li');
    item.append(button);
    return item;
  }));
  document.getElementById('history-section').hidden = history.length === 0;
  document.getElementById('history-count').textContent = `(${history.length})`;
};

const showAndRecord = async (channel, data) => {
  const shown = (await run(channel, data))?.shown;
  if (!shown) return;
  const same = (e) => e.id === shown.id && e.chapter === shown.chapter && e.verse === shown.verse;
  history = [shown, ...history.filter((e) => !same(e))].slice(0, HISTORY_LIMIT);
  renderHistory();
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
  showAndRecord('show-reference', input.value);
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
  showAndRecord('show-verse', {
    book: bookSelect.value,
    chapter: chapterSelect.value,
    verse: verseSelect.value,
  });
});

// ---------------------------------------------------------------------------
// Preview of the output screen
// ---------------------------------------------------------------------------

const preview = document.getElementById('preview');
const previewFrame = document.getElementById('preview-frame');
const statusBadge = document.getElementById('display-status');
const currentRef = document.getElementById('current-ref');
let outputSize = { width: 1920, height: 1080 };

const formatRef = (v) => `${v.name} ${v.chapter}:${v.verse}`;

// The frame is laid out at the output's real size, then scaled to the panel.
const layoutPreview = () => {
  const { width, height } = outputSize;
  preview.style.aspectRatio = `${width} / ${height}`;
  previewFrame.style.width = `${width}px`;
  previewFrame.style.height = `${height}px`;
  previewFrame.style.transform = `scale(${preview.clientWidth / width})`;
};
new ResizeObserver(layoutPreview).observe(preview);

const toPreview = (channel, data) => {
  previewFrame.contentWindow?.postMessage({ channel, data }, '*');
};

const applyDisplayState = ({ visible, width, height }) => {
  statusBadge.dataset.state = visible ? 'on' : 'off';
  statusBadge.textContent = visible ? '화면 송출 중' : '화면 꺼짐';
  preview.dataset.state = visible ? 'on' : 'off';
  if (width && height) {
    outputSize = { width, height };
    document.getElementById('preview-size').textContent = `${width}×${height}`;
    layoutPreview();
  }
};

// Everything main sends to the output window is mirrored here.
window.api.on('preview', (event, { channel, data }) => toPreview(channel, data));
window.api.on('display-state', (event, state) => applyDisplayState(state));

// Fills the frame with what is on screen right now. Runs at startup and
// again when the frame finishes loading, whichever happens last.
const syncPreview = async () => {
  const state = await window.api.invoke('get-display-state');
  applyDisplayState(state);
  if (state.sentence) toPreview('sentence-change', state.sentence);
  currentRef.textContent = state.current ? formatRef(state.current) : '표시 중인 구절 없음';
};
previewFrame.addEventListener('load', syncPreview);
syncPreview();

// Preview on/off, remembered on this computer. While hidden the frame keeps
// receiving updates but cannot measure itself, so it is re-synced (and the
// long-verse fit redone) when shown again.
const previewToggle = document.getElementById('preview-toggle');
const PREVIEW_KEY = 'preview-enabled';

const setPreviewEnabled = (enabled) => {
  previewToggle.checked = enabled;
  document.getElementById('layout').classList.toggle('no-preview', !enabled);
  if (enabled) syncPreview();
};

previewToggle.addEventListener('change', () => {
  setPreviewEnabled(previewToggle.checked);
  try {
    localStorage.setItem(PREVIEW_KEY, String(previewToggle.checked));
  } catch {
    // Not saved; the choice still applies until the app closes.
  }
});

try {
  if (localStorage.getItem(PREVIEW_KEY) === 'false') setPreviewEnabled(false);
} catch {
  // Unreadable storage: keep the default (on).
}

// Keeps the input and dropdowns in sync with what is on screen.
// A newer update cancels an older one still waiting on its dropdown reloads,
// so holding PageDown cannot leave the dropdowns on a stale chapter.
let syncId = 0;
window.api.on('current-verse', async (event, { id, name, abbr, chapter, verse }) => {
  const mySync = ++syncId;
  input.value = `${abbr} ${chapter}:${verse}`;
  currentRef.textContent = formatRef({ name, chapter, verse });
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
