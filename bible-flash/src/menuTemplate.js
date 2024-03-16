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
        label: 'Change Background Image',
        click: () => app.emit('change-background-image'),
      },
      {
        label: 'Font Size',
        submenu: [
          {
            label: '32pt',
            click: () => app.emit('change-font-size', '32pt'),
          },
          {
            label: '40pt',
            click: () => app.emit('change-font-size', '40pt'),
          },
          {
            label: '48pt',
            click: () => app.emit('change-font-size', '48pt'),
          },
          {
            label: '60pt',
            click: () => app.emit('change-font-size', '60pt'),
          },
        ],
      },
      {
        label: 'Opacity Dark',
        submenu: [
          {
            label: '0.3',
            click: () => app.emit('change-opacity-dark', '0.3'),
          },
          {
            label: '0.4',
            click: () => app.emit('change-opacity-dark', '0.4'),
          },
          {
            label: '0.5',
            click: () => app.emit('change-opacity-dark', '0.5'),
          },
          {
            label: '0.6',
            click: () => app.emit('change-opacity-dark', '0.6'),
          },
          {
            label: '0.7',
            click: () => app.emit('change-opacity-dark', '0.7'),
          },
          {
            label: '0.8',
            click: () => app.emit('change-opacity-dark', '0.8'),
          },
        ],
      },
      {
        role: 'toggleDevTools',
      }
    ],
  }
];

module.exports = template;