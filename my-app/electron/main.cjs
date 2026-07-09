const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      // Set to true if you are running into CORS issues in the desktop app
      // webSecurity: false,
    },
  });

  // Check if we are in development mode by looking at the arguments
  const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    // In development, load the Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // Open the DevTools automatically in dev mode
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built HTML file
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();
  
  // ==========================================
  // TELEMETRY: App Opened
  // ==========================================
  console.log('[Telemetry] App has been opened!');
  // Here you could send a request to your backend (e.g. Supabase)
  // to track that the user opened the app.
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  // ==========================================
  // TELEMETRY: App Closed
  // ==========================================
  console.log('[Telemetry] App is closing!');
  // Here you could send a request to your backend to track the app closing.
});
