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