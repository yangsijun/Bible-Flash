document.getElementById('submit-button').addEventListener('click', () => {
  const verse = document.getElementById('verse-input').value;
  window.api.send('verse-change', verse);
});