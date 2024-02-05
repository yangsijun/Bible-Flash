console.log('Running display.js');

window.api.on('sentence-change', (event, sentence) => {
  document.getElementById('sentence-display').innerText = sentence;
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    window.api.send('close-display-window');
  }
});