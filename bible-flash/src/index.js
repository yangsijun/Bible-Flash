const { app, BrowserWindow, screen, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const db = require('./db.js');
const { parseReference } = require('./reference.js');
const settings = require('./settings.js');
const buildMenuTemplate = require('./menuTemplate.js');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const ICON = path.join(__dirname, '../assets/icons/png/bible-flash-icon-64.png');
const WEB_PREFERENCES = {
  contextIsolation: true,
  preload: path.join(__dirname, 'preload.js'),
};

let mainWindow;
let displayWindow;
// The verse on screen: { id, name, abbr, chapter, verse, text }
let current = null;

// ---------------------------------------------------------------------------
// Output display selection
// ---------------------------------------------------------------------------

// The saved display if it is connected (matched by id, then by label because
// Windows can renumber ids after a reboot), else the first non-primary
// display, else the primary one.
const pickTargetDisplay = () => {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const saved = settings.get('display');
  if (saved) {
    const sameName = saved.label ? displays.filter((d) => d.label === saved.label) : [];
    const match = displays.find((d) => d.id === saved.id) ||
      sameName.find((d) => JSON.stringify(d.bounds) === JSON.stringify(saved.bounds)) ||
      sameName[0];
    if (match) return match;
  }
  return displays.find((d) => d.id !== primary.id) || primary;
};

const rebuildMenu = () => {
  const template = buildMenuTemplate({
    displays: screen.getAllDisplays(),
    primaryId: screen.getPrimaryDisplay().id,
    selectedId: pickTargetDisplay().id,
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  // setApplicationMenu re-attaches the menu to every window on Windows.
  if (isAlive(displayWindow)) displayWindow.setMenu(null);
};

const isAlive = (win) => win && !win.isDestroyed();

// Also mirrored to the control window's preview.
const sendToDisplay = (channel, data) => {
  if (isAlive(displayWindow)) displayWindow.webContents.send(channel, data);
  if (isAlive(mainWindow)) mainWindow.webContents.send('preview', { channel, data });
};

const currentSentence = () => current && {
  text: current.text,
  bookChapterVerse: `(${current.abbr} ${current.chapter}:${current.verse})`,
};

const sendCurrentVerse = () => {
  if (current) sendToDisplay('sentence-change', currentSentence());
};

// Whether the output window is showing, and its size for the preview.
const getDisplayState = () => {
  if (!isAlive(displayWindow)) return { visible: false };
  const [width, height] = displayWindow.getContentSize();
  return { visible: displayWindow.isVisible(), width, height };
};

const sendDisplayState = () => {
  if (isAlive(mainWindow)) mainWindow.webContents.send('display-state', getDisplayState());
};

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 620,
    minWidth: 480,
    minHeight: 480,
    webPreferences: WEB_PREFERENCES,
    icon: ICON,
  });

  mainWindow.loadFile(path.join(__dirname, 'control.html'));

  mainWindow.on('closed', () => {
    if (isAlive(displayWindow)) displayWindow.close();
    app.quit();
  });
};

// Where the output window goes. When the output display is the one the
// control window is on (e.g. a single monitor), a fullscreen window would cover
// the controls, so it becomes a normal 960x540 window instead.
const getPlacement = () => {
  const target = pickTargetDisplay();
  // getNormalBounds: a minimized window reports off-screen bounds on Windows.
  const sharesControlScreen = isAlive(mainWindow) &&
    screen.getDisplayMatching(mainWindow.getNormalBounds()).id === target.id;
  return {
    target,
    sharesControlScreen,
    key: JSON.stringify([target.id, target.bounds, sharesControlScreen]),
  };
};

let placementKey = null;

// replacing: the previous output window, destroyed only once the new one has
// loaded so the projector never shows the desktop in between.
const createDisplayWindow = (show = false, replacing = null) => {
  const { target, sharesControlScreen, key } = getPlacement();
  placementKey = key;
  const { workArea, bounds } = target;

  displayWindow = new BrowserWindow({
    ...(sharesControlScreen
      ? {
        width: 960,
        height: 540,
        x: workArea.x + Math.round((workArea.width - 960) / 2),
        y: workArea.y + Math.round((workArea.height - 540) / 2),
      }
      : { ...bounds, frame: false }),
    title: 'Bible Flash Display',
    webPreferences: WEB_PREFERENCES,
    show: false,
    icon: ICON,
  });
  displayWindow.setMenu(null);
  displayWindow.loadFile(path.join(__dirname, 'display.html'));

  const win = displayWindow;
  // Events from a window being replaced would report the old one's state.
  const reportIfCurrent = () => {
    if (win === displayWindow) sendDisplayState();
  };
  win.on('show', reportIfCurrent);
  win.on('hide', reportIfCurrent);
  win.on('resize', reportIfCurrent);
  win.on('closed', reportIfCurrent);
  win.webContents.on('did-finish-load', () => {
    if (!sharesControlScreen) {
      // Going fullscreen after placing (not in the constructor) avoids landing
      // on the neighbouring monitor when monitors use different scaling.
      win.setBounds(bounds);
      win.setFullScreen(true);
    }
    sendCurrentVerse();
    if (show) showDisplayWindow();
    if (isAlive(replacing)) replacing.destroy();
    reportIfCurrent();
  });
};

const showDisplayWindow = () => {
  if (!isAlive(displayWindow)) {
    createDisplayWindow(true);
    return;
  }
  // Re-showing a visible window activates it on Windows and steals keys.
  if (displayWindow.isVisible()) return;
  displayWindow.show();
  // Keep keyboard input (and presenter clickers) on the control window.
  if (isAlive(mainWindow)) mainWindow.focus();
};

// Moves the output window to the current target display if that changed,
// keeping whether it was visible and what it was showing.
const refreshDisplayWindow = () => {
  rebuildMenu();
  if (isAlive(displayWindow) && getPlacement().key === placementKey) return;
  const old = isAlive(displayWindow) ? displayWindow : null;
  createDisplayWindow(old ? old.isVisible() : false, old);
};

// Windows fires several display events for one plug/unplug; act once.
let displayChangeTimer;
const onDisplaysChanged = () => {
  clearTimeout(displayChangeTimer);
  displayChangeTimer = setTimeout(refreshDisplayWindow, 500);
};

app.on('select-display', (display) => {
  settings.set('display', { id: display.id, label: display.label, bounds: display.bounds });
  refreshDisplayWindow();
});

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

// The Bible database is not bundled. On first run (or if the file is
// broken) ask for one; the app keeps running so it can be loaded later too.
const openBibleOrAsk = () => {
  let problem;
  if (!db.hasBibleFile()) {
    problem = '성경 DB 파일이 없습니다.';
  } else {
    try {
      console.log('Bible database:', db.openBibleDatabase());
      return;
    } catch (err) {
      problem = `성경 DB 파일을 읽을 수 없습니다.\n${err.message}`;
    }
  }

  mainWindow.webContents.once('did-finish-load', async () => {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Bible Flash',
      message: problem,
      detail: 'Bible_NKRV.sqlite 같은 성경 DB 파일을 선택하세요.\n' +
        `선택한 파일은 다음 위치에 복사되어 사용됩니다.\n${db.bibleFilePath()}`,
      buttons: ['파일 선택', '나중에'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) app.emit('open-load-database');
  });
};

app.on('ready', () => {
  rebuildMenu();
  createMainWindow();
  createDisplayWindow();
  openBibleOrAsk();

  screen.on('display-added', onDisplaysChanged);
  screen.on('display-removed', onDisplaysChanged);
  screen.on('display-metrics-changed', (event, display, changedMetrics) => {
    // Moving or resizing the taskbar only changes workArea.
    if (changedMetrics.some((metric) => metric !== 'workArea')) onDisplaysChanged();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
    createDisplayWindow();
  }
});

// ---------------------------------------------------------------------------
// Verse display
// ---------------------------------------------------------------------------

// book: { id, name, abbr }. Returns the shown verse, or null if it does not
// exist, in which case the screen keeps showing the previous verse.
const showVerse = (book, chapter, verse) => {
  const text = db.queryVerse(book.id, chapter, verse);
  if (text === undefined) return null;

  current = { ...book, chapter, verse, text };
  sendCurrentVerse();
  showDisplayWindow();
  const shown = { id: book.id, name: book.name, abbr: book.abbr, chapter, verse };
  mainWindow.webContents.send('current-verse', shown);
  return shown;
};

const fail = (message) => ({ ok: false, message });

ipcMain.handle('show-reference', (event, input) => {
  const ref = parseReference(input);
  if (!ref) return fail('형식을 확인하세요. 예: 요 3:16, 요한복음 3장 16절');

  const book = db.findBook(ref.book);
  if (!book) return fail(`'${ref.book}'에 해당하는 성경을 찾을 수 없습니다.`);

  const shown = showVerse(book, ref.chapter, ref.verse);
  if (!shown) return fail(`${book.name} ${ref.chapter}:${ref.verse} 구절이 없습니다.`);
  return { ok: true, shown };
});

ipcMain.handle('show-verse', (event, { book, chapter, verse }) => {
  const found = db.getBook(Number(book));
  const shown = found && showVerse(found, Number(chapter), Number(verse));
  if (!shown) return fail('구절을 찾을 수 없습니다.');
  return { ok: true, shown };
});

// direction: 1 = next verse, -1 = previous verse (crosses chapters and books).
ipcMain.handle('navigate', (event, direction) => {
  if (!current) return fail('먼저 구절을 표시하세요.');

  const next = db.getAdjacentVerse(current.id, current.chapter, current.verse, direction);
  if (!next) return fail(direction > 0 ? '성경의 마지막 구절입니다.' : '성경의 첫 구절입니다.');

  showVerse(db.getBook(next.book), next.chapter, next.verse);
  return { ok: true };
});

ipcMain.handle('get-display-state', () => ({
  ...getDisplayState(),
  sentence: currentSentence(),
  current: current && { name: current.name, chapter: current.chapter, verse: current.verse },
}));

ipcMain.handle('get-book-list', () => db.getBookList());

ipcMain.handle('get-chapter-count', (event, book) => db.getNumberOfChapters(Number(book)));

ipcMain.handle('get-verse-count', (event, { book, chapter }) =>
  db.getNumberOfVerses(Number(book), Number(chapter)));

ipcMain.on('close-display-window', () => {
  if (isAlive(displayWindow)) {
    displayWindow.hide();
  }
});

// ---------------------------------------------------------------------------
// Menu actions
// ---------------------------------------------------------------------------

app.on('open-load-database', () => {
  const bibleFilePath = dialog.showOpenDialogSync(
    mainWindow,
    {
      title: 'Load Database',
      properties: ['openFile'],
      filters: [
        { name: 'Bible SQLite (e.g. Bible_NKRV.sqlite)', extensions: ['sqlite', 'db'] }
      ]
    }
  );

  if (!bibleFilePath) {
    console.log('No file selected');
    return;
  }

  try {
    console.log('Bible database:', db.importBibleDatabase(bibleFilePath[0]));
    // Clear the projector too: it would otherwise keep showing text from the
    // previous database while navigation has been reset.
    current = null;
    sendToDisplay('sentence-change', { text: '', bookChapterVerse: '' });
    if (isAlive(displayWindow)) displayWindow.hide();
    // Reload so the book list is rebuilt from the new database.
    mainWindow.webContents.reload();
  } catch (err) {
    dialog.showErrorBox('Load Database', err.saveFailed
      ? err.message
      : `선택한 파일을 성경 DB로 읽을 수 없습니다.\n\n${err.message}`);
  }
});

app.on('change-background-image', () => {
  const backgroundImagePath = dialog.showOpenDialogSync(
    mainWindow,
    {
      title: 'Change Background Image',
      properties: ['openFile'],
      filters: [
        { name: 'Image File', extensions: ['jpg', 'png'] }
      ]
    }
  );

  if (backgroundImagePath) {
    console.log(backgroundImagePath);

    let bgImgPath = backgroundImagePath[0];
    bgImgPath = backgroundImagePath[0].replaceAll(/\\/g, '/');
    
    console.log(bgImgPath);

    sendToDisplay('change-background-image', bgImgPath);
  } else {
    console.log('No file selected');
  }
});

app.on('change-font-size', (fontSize) => {
  sendToDisplay('change-font-size', fontSize);
});

app.on('change-opacity-dark', (opacityDark) => {
  sendToDisplay('change-opacity-dark', opacityDark);
});