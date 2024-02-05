const { app, BrowserWindow, screen, Menu, ipcMain } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let externalDisplay;

const findExternalDisplay = () => {
  const displays = screen.getAllDisplays();
  console.log(displays);

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
    width: 400,
    height: 300,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'control.html'));
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

ipcMain.on('verse-change', (event, verse) => {
  console.log(verse);
  if (displayWindow.isDestroyed()) {
    createDisplayWindow();
  }
  displayWindow.show();
  displayWindow.webContents.send('verse-change', verse);
});

app.on('open-load-database', () => {
  console.log('open-load-database');
});

app.on('open-font-settings', () => {
  console.log('open-font-settings');
});

app.on('open-change-background-image', () => {
  console.log('open-change-background-image');
});