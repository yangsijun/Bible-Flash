console.log('Running display.js');

window.api.on('verse-change', (event, verse) => {
  console.log(verse);
  console.log(document.getElementById('verse-display').innerText);
  document.getElementById('verse-display').innerText = verse;
});