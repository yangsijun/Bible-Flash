console.log('Running display.js');

window.api.on('verse-change', (event, verse) => {
  document.getElementById('verse-display').innerText = verse;
});