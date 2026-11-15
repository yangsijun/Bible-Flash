module.exports = {
  packagerConfig: {
    asar: true,
    // No extension: Forge picks app-icon.ico on Windows and app-icon.icns on macOS.
    icon: 'assets/icons/app-icon',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        setupIcon: 'assets/icons/app-icon.ico',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
  ],
};
