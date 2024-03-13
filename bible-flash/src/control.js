document.getElementById('submit-button').addEventListener('click', () => {
  const verse = document.getElementById('verse-text-input').value;
  window.api.send('verse-text-inputed', verse);
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    window.api.send('close-display-window');
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const verse = document.getElementById('verse-text-input').value;
    window.api.send('verse-text-inputed', verse);
  }
});

window.api.send('load-book-list');

window.api.on('book-list-loaded', (event, bookList) => {
  const bookListElement = document.getElementById('book-select');
  const option = document.createElement('option');
  option.value = -1;
  option.innerText = ' - ';
  bookListElement.appendChild(option);
  bookList.forEach(book => {
    const option = document.createElement('option');
    option.value = book.idx;
    option.innerText = book.long_label;
    bookListElement.appendChild(option);
  });

  bookListElement.addEventListener('change', () => {
    const bookNumber = document.getElementById('book-select').value;
    window.api.send('book-selected', bookNumber);
  });
});

window.api.on('number-of-chapters-loaded', (event, numberOfChapters) => {
  const chapterSelect = document.getElementById('chapter-select');
  chapterSelect.innerHTML = '';
  const option = document.createElement('option');
  option.value = -1;
  option.innerText = ' - ';
  chapterSelect.appendChild(option);
  for (let i = 1; i <= numberOfChapters; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.innerText = i;
    chapterSelect.appendChild(option);
  }

  chapterSelect.addEventListener('change', () => {
    const book = document.getElementById('book-select').value;
    const chapter = document.getElementById('chapter-select').value;
    window.api.send(
      'chapter-selected',
      {
        'book': book,
        'chapter': chapter
      }
    );
  });
});

window.api.on('number-of-verses-loaded', (event, numberOfVerses) => {
  const verseSelect = document.getElementById('verse-select');
  verseSelect.innerHTML = '';
  const option = document.createElement('option');
  option.value = -1;
  option.innerText = ' - ';
  verseSelect.appendChild(option);
  for (let i = 1; i <= numberOfVerses; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.innerText = i;
    verseSelect.appendChild(option);
  }

  verseSelect.addEventListener('change', () => {
    const book = document.getElementById('book-select').value;
    const chapter = document.getElementById('chapter-select').value;
    const verse = verseSelect.value;
    const bookName = document.getElementById('book-select').options[document.getElementById('book-select').selectedIndex].text;

    document.getElementById('verse-text-input').value = `${bookName} ${chapter}:${verse}`;
  });
});