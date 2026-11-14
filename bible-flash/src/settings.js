// Small JSON settings store in userData (main process only).
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');
let cache = null;

const load = () => {
  if (!cache) {
    try {
      cache = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    } catch {
      cache = {};
    }
  }
  return cache;
};

const get = (key) => load()[key];

const set = (key, value) => {
  load()[key] = value;
  fs.writeFileSync(settingsPath(), JSON.stringify(cache, null, 2));
};

module.exports = { get, set };
