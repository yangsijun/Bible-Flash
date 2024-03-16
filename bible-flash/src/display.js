let imgPath = window.localStorage.getItem('bg-img-path');
if (imgPath) {
  let root = document.querySelector(':root');
  root.style.setProperty('--bg-img-path', `url('${imgPath}')`);
}
let fontSize = window.localStorage.getItem('font-size');
if (fontSize) {
  let root = document.querySelector(':root');
  root.style.setProperty('--font-size', fontSize);
}
let opacityDark = window.localStorage.getItem('opacity-dark');
if (opacityDark) {
  let root = document.querySelector(':root');
  root.style.setProperty('--opacity-dark', opacityDark);
}


window.api.on('sentence-change', (event, sentence) => {
  document.getElementById('sentence-display').innerText = sentence.text;
  document.getElementById('verse-display').innerText = sentence.bookChapterVerse;
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    window.api.send('close-display-window');
  }
});

window.api.on('change-background-image', (event, imgPath) => {
  console.log(imgPath);
  let root = document.querySelector(':root');
  root.style.setProperty('--bg-img-path', `url('${imgPath}')`);
  window.localStorage.setItem('bg-img-path', imgPath);
});

window.api.on('change-font-size', (event, fontSize) => {
  let root = document.querySelector(':root');
  root.style.setProperty('--font-size', fontSize);
  window.localStorage.setItem('font-size', fontSize);
});

window.api.on('change-opacity-dark', (event, opacityDark) => {
  let root = document.querySelector(':root');
  root.style.setProperty('--opacity-dark', opacityDark);
  window.localStorage.setItem('opacity-dark', opacityDark);
});