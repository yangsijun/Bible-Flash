document.getElementById('submit-button').addEventListener('click', () => {
  const verse = document.getElementById('verse-input').value;
  window.api.send('verse-change', verse);
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    window.api.send('close-display-window');
  }
});