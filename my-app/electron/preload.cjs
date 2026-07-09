const { contextBridge, ipcRenderer } = require('electron');

// We use contextBridge to expose a secure API to the React frontend
// This allows your React app to communicate with the Electron backend
contextBridge.exposeInMainWorld('electronAPI', {
  // Example function: send a message from React to Electron
  // sendMessage: (message) => ipcRenderer.send('message-from-react', message),
});
