const { app, BrowserWindow, screen, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const {
  loadBibleDatabase,
  getBookNumberFromShortLabel,
  getBookNumberFromLongLabel,
  getBookShortLabel,
  getBookLongLabel,
  getNumberOfChapters,
  getNumberOfVerses,
  queryVerse,
  getBookList,
} = require('./db.js');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let externalDisplay;

const findExternalDisplay = () => {
  const displays = screen.getAllDisplays();

  if (displays.length === 1) {
    externalDisplay = displays[0];
    return;
  }

  externalDisplay = displays.find((display) => {
    return display.bounds.x !== 0 || display.bounds.y !== 0;
  });
}

let mainWindow;
let displayWindow;

const createWindow = () => {
  createMainWindow();
  createDisplayWindow();
};

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 400,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'control.html'));
  // open devtools
  mainWindow.webContents.openDevTools();
}

const createDisplayWindow = () => {
  displayWindow = new BrowserWindow({
    x: externalDisplay.bounds.x,
    y: externalDisplay.bounds.y,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
    frame: false,
    fullscreen: true,
  });

  displayWindow.loadFile(path.join(__dirname, 'display.html'));
  // open devtools
  displayWindow.webContents.openDevTools();
}

const menuTemplate = require('./menuTemplate.js');
const menu = Menu.buildFromTemplate(menuTemplate);

Menu.setApplicationMenu(menu);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {  
  findExternalDisplay();
  createWindow();
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
    createWindow();
  }
});

ipcMain.on('close-display-window', (event) => {
  if (!displayWindow.isDestroyed()) {
    displayWindow.hide();
  }
});

ipcMain.on('verse-text-inputed', (event, textInput) => {
  if (displayWindow.isDestroyed()) {
    createDisplayWindow();
  }
  displayWindow.show();

  // 마 1:1 -> ['마', '1', '1']
  const [book, chapter, verse] = textInput.split((/ |\:/));
  // 마 or 마태복음 -> 40

  getBookNumberFromShortLabel(book)
    .then(bookNumber => {
      if (bookNumber !== -1) {
        queryVerse(bookNumber, chapter, verse)
          .then(sentence => displayWindow.webContents.send('sentence-change', {'text': sentence, 'bookChapterVerse': '(' + short_label + ' ' + chapter + ':' + verse + ')'}))
          .catch(err => console.log(err));
      } else {
        getBookNumberFromLongLabel(book)
          .then(bookNumber => {
            if (bookNumber === -1) {
              displayWindow.webContents.send('sentence-change', {'text': '', 'bookChapterVerse': ''});
              return;
            }
            getBookShortLabel(bookNumber)
              .then(short_label => {
                queryVerse(bookNumber, chapter, verse)
                  .then(sentence => displayWindow.webContents.send('sentence-change', {'text': sentence, 'bookChapterVerse': '(' + short_label + ' ' + chapter + ':' + verse + ')'}))
                  .catch(err => console.log(err));
              })
              .catch(err => console.log(err));
          })
          .catch(err => console.log(err));
      }
    })
    .catch(err => {
      console.log(err);
    });
});

ipcMain.on('load-book-list', () => {
  getBookList().then(bookList => {
    mainWindow.webContents.send('book-list-loaded', bookList);
  })
  .catch(err => {
    console.log(err);
  });
});

ipcMain.on('book-selected', (event, bookNumber) => {
  getNumberOfChapters(bookNumber)
    .then(numberOfChapters => {
      mainWindow.webContents.send('number-of-chapters-loaded', numberOfChapters);
    })
    .catch(err => {
      console.log(err);
    });
});

ipcMain.on('chapter-selected', (event, bookAndChapter) => {
  getNumberOfVerses(bookAndChapter.book, bookAndChapter.chapter)
    .then(numberOfVerses => {
      mainWindow.webContents.send('number-of-verses-loaded', numberOfVerses);
    })
    .catch(err => {
      console.log(err);
    });
});

app.on('open-load-database', () => {
  const bibleFilePath = dialog.showOpenDialogSync(
    mainWindow,
    {
      title: 'Load Database',
      properties: ['openFile'],
      filters: [
        { name: 'CSV File', extensions: ['csv'] }
      ]
    }
  );

  if (bibleFilePath) {
    console.log(bibleFilePath);
    loadBibleDatabase(bibleFilePath[0]);
  } else {
    console.log('No file selected');
  }
});

app.on('open-font-settings', () => {
  console.log('open-font-settings');
});

app.on('open-change-background-image', () => {
  console.log('open-change-background-image');
});