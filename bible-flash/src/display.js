// The control window embeds this page as a live preview (display.html?preview).
// A frame gets no preload API, so there the control window forwards the same
// messages with postMessage instead.
const isPreview = new URLSearchParams(location.search).has('preview');
const previewHandlers = {};
const onMain = (channel, handler) => {
  if (isPreview) previewHandlers[channel] = handler;
  else window.api.on(channel, handler);
};
if (isPreview) {
  window.addEventListener('message', ({ data }) => previewHandlers[data?.channel]?.(null, data.data));
}

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


const sentenceEl = document.getElementById('sentence-display');
const verseEl = document.getElementById('verse-display');
if (isPreview) {
  sentenceEl.innerText = '';
  verseEl.innerText = '';
}

// A few verses (e.g. Jer 32:3, 287 chars) do not fit the screen at the
// chosen font size. Only those get a smaller verse text, never below half
// the chosen size; the reference line below always keeps the chosen size.
const EDGE_PX = 16;
const fitsScreen = () =>
  sentenceEl.getBoundingClientRect().top >= EDGE_PX &&
  verseEl.getBoundingClientRect().bottom <= window.innerHeight - EDGE_PX;

const fitSentence = () => {
  sentenceEl.style.fontSize = '';
  if (fitsScreen()) return;
  const base = parseFloat(getComputedStyle(sentenceEl).fontSize);
  let lo = Math.ceil(base / 2);
  let hi = Math.floor(base) - 1;
  // Largest whole-pixel size that fits; stays at the floor if none does.
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    sentenceEl.style.fontSize = `${mid}px`;
    if (fitsScreen()) lo = mid;
    else hi = mid - 1;
  }
  sentenceEl.style.fontSize = `${lo}px`;
};

window.addEventListener('resize', fitSentence);
document.fonts.ready.then(fitSentence);

onMain('sentence-change', (event, sentence) => {
  sentenceEl.innerText = sentence.text;
  verseEl.innerText = sentence.bookChapterVerse;
  fitSentence();
});

window.addEventListener('keydown', (event) => {
  if (isPreview) return;
  if (event.key === 'Escape') {
    window.api.send('close-display-window');
  } else if (['PageDown', 'ArrowRight'].includes(event.key)) {
    window.api.invoke('navigate', 1);
  } else if (['PageUp', 'ArrowLeft'].includes(event.key)) {
    window.api.invoke('navigate', -1);
  }
});

onMain('change-background-image', (event, imgPath) => {
  console.log(imgPath);
  let root = document.querySelector(':root');
  root.style.setProperty('--bg-img-path', `url('${imgPath}')`);
  window.localStorage.setItem('bg-img-path', imgPath);
});

onMain('change-font-size', (event, fontSize) => {
  let root = document.querySelector(':root');
  root.style.setProperty('--font-size', fontSize);
  window.localStorage.setItem('font-size', fontSize);
  fitSentence();
});

onMain('change-opacity-dark', (event, opacityDark) => {
  let root = document.querySelector(':root');
  root.style.setProperty('--opacity-dark', opacityDark);
  window.localStorage.setItem('opacity-dark', opacityDark);
});