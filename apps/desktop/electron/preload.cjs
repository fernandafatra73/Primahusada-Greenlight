const { contextBridge, ipcRenderer } = require('electron');

// Jembatan minimal renderer -> main, dipakai halaman Bernyanyi untuk membuka
// panel pemasangan Bluetooth bawaan Windows (renderer sendiri tidak boleh
// akses Node/Electron langsung karena contextIsolation aktif).
contextBridge.exposeInMainWorld('electronDesktop', {
  openBluetoothSettings: () => ipcRenderer.invoke('open-bluetooth-settings'),
});
