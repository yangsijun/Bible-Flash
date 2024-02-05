console.log('Running display.js');

window.api.on('sentence-change', (event, sentence) => {
  document.getElementById('sentence-display').innerText = sentence;
});