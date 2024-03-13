window.api.on('sentence-change', (event, sentence) => {
  document.getElementById('sentence-display').innerText = sentence.text;
  document.getElementById('verse-display').innerText = sentence.bookChapterVerse;
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    window.api.send('close-display-window');
  }
});