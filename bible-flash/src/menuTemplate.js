const { app } = require('electron');

const template = [
  {
    label: 'Setting',
    submenu: [
      {
        label: 'Load Database',
        click: () => app.emit('open-load-database'),
      },
    ],
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Font Settings',
        click: () => app.emit('open-font-settings'),
      },
      {
        label: 'Change Background Image',
        click: () => app.emit('open-change-background-image'),
      },
      {
        role: 'toggleDevTools',
      }
    ],
  }
];

module.exports = template;