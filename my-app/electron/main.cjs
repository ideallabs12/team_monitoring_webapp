const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../public/allhands_logo_cropped.png'),
    autoHideMenuBar: true,
    show: false, // Don't show immediately to prevent visual flashing
    backgroundColor: '#ffffff', // Set a background color
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      // Set to true if you are running into CORS issues in the desktop app
      // webSecurity: false,
    },
  });

  // Check if we are in development mode by looking at the arguments
  const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    // In development, load the Vite dev server with explicit IP
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    // In production, load the built HTML file
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Optimize perceived performance by waiting for the renderer to be ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools only after showing, and only in Dev mode
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Hardware acceleration is generally good, but sometimes causes lag on older Windows machines. 
// We leave it enabled by default, but you can uncomment this if users report UI lag/glitches.
// app.disableHardwareAcceleration();

app.on('ready', () => {
  createWindow();
  
  // ==========================================
  // TELEMETRY: App Opened
  // ==========================================
  console.log('[Telemetry] App has been opened!');
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
});
