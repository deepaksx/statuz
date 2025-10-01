const { app, BrowserWindow } = require('electron');

console.log('Starting Electron test...');

app.whenReady().then(() => {
  console.log('Electron is ready!');

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    backgroundColor: '#ffffff'
  });

  console.log('Window created!');

  win.loadURL('https://google.com').then(() => {
    console.log('Google loaded!');
  }).catch((err) => {
    console.error('Failed to load:', err);
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

console.log('Script finished, waiting for app ready...');
