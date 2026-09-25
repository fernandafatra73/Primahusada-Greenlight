const { app, BrowserWindow, dialog, session, ipcMain, shell } = require('electron');
const { existsSync, copyFileSync, mkdirSync, appendFileSync, readFileSync } = require('node:fs');
const { join, dirname } = require('node:path');
const { pathToFileURL } = require('node:url');

// Port khusus aplikasi desktop ini (beda dari port dev server 3001) supaya tidak
// bentrok kalau kebetulan dev server web/api masih jalan di komputer yang sama.
const PORT = 38271;
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

// Banyak PC klinik pakai kartu grafis lawas/driver bermasalah — matikan akselerasi
// GPU supaya rendering selalu stabil (software rendering) daripada layar putih/hitam.
app.disableHardwareAcceleration();

function logError(context, err) {
  try {
    const logPath = join(app.getPath('userData'), 'error.log');
    const message = err instanceof Error ? (err.stack || err.message) : String(err);
    appendFileSync(logPath, `[${new Date().toISOString()}] ${context}: ${message}\n`);
  } catch {
    // tidak ada tempat lain untuk melapor — abaikan.
  }
}

function getServerDir() {
  // Saat sudah di-package: resources/server (di luar app.asar, sejajar dengannya).
  // Saat dev (npm run start di apps/desktop tanpa build): resources/server relatif ke folder ini.
  return app.isPackaged
    ? join(process.resourcesPath, 'server')
    : join(__dirname, '..', 'resources', 'server');
}

function ensureUserDatabase(serverDir) {
  const userDataDir = app.getPath('userData');
  mkdirSync(userDataDir, { recursive: true });
  const dbPath = join(userDataDir, 'labprima.db');
  if (!existsSync(dbPath)) {
    const templatePath = join(serverDir, 'template.db');
    copyFileSync(templatePath, dbPath);
  }
  return dbPath;
}

function loadGeminiApiKey(serverDir) {
  // Supaya admin klinik bisa mengatur/mengganti API key Gemini tanpa build ulang,
  // taruh file kuncigemini.txt (isinya cuma API key) sebaris di folder yang sama
  // dengan aplikasi-ph-2026.exe. PORTABLE_EXECUTABLE_DIR disediakan electron-builder
  // khusus untuk kasus portable-exe ini (app.getPath('exe') mengarah ke folder
  // ekstraksi sementara, bukan lokasi asli exe-nya).
  const candidates = [
    process.env.PORTABLE_EXECUTABLE_DIR ? join(process.env.PORTABLE_EXECUTABLE_DIR, 'kuncigemini.txt') : null,
    join(dirname(app.getPath('exe')), 'kuncigemini.txt'),
    join(serverDir, 'kuncigemini.txt'),
  ].filter((p) => p !== null);

  for (const path of candidates) {
    if (existsSync(path)) {
      const key = readFileSync(path, 'utf8').trim();
      if (key) return key;
    }
  }
  return '';
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return true;
    } catch {
      // server belum siap, coba lagi
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

async function startServer() {
  const serverDir = getServerDir();
  const dbPath = ensureUserDatabase(serverDir);

  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.PORT = String(PORT);
  process.env.HOST = HOST;
  process.env.CORS_ORIGIN = BASE_URL;
  process.env.MIGRATIONS_DIR = join(serverDir, 'migrations');
  process.env.GEMINI_API_KEY = loadGeminiApiKey(serverDir);

  // Database user dibuat sekali dari template.db lalu tidak pernah disentuh lagi — kalau versi
  // baru menambah migrasi Prisma, database lama itu harus diupgrade dulu di sini, atau query akan
  // gagal karena kolom/tabel belum ada (lihat src/migrate.ts).
  const migrateEntry = join(serverDir, 'build', 'migrate.js');
  await import(pathToFileURL(migrateEntry).href);

  const entry = join(serverDir, 'build', 'index.js');
  await import(pathToFileURL(entry).href);
}

/** Izin yang dibutuhkan fitur absensi: kamera untuk foto selfie dan lokasi
 * untuk titik absensi. Tanpa penangan ini Electron menolak keduanya diam-diam
 * dan tombol "Ambil Foto" tidak pernah berfungsi di aplikasi terpasang.
 *
 * Hanya halaman aplikasi sendiri yang diberi izin — halaman lain ditolak,
 * supaya kamera tidak bisa dinyalakan dari alamat lain kalau suatu saat ada
 * yang dimuat di dalam jendela ini. */
function izinkanPerangkatAplikasi() {
  const DIIZINKAN = new Set(['media', 'geolocation']);

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const asal = webContents?.getURL() ?? '';
    callback(DIIZINKAN.has(permission) && asal.startsWith(BASE_URL));
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, asalPemeriksa) => {
    const asal = asalPemeriksa || webContents?.getURL() || '';
    return DIIZINKAN.has(permission) && asal.startsWith(BASE_URL);
  });
}

/** Membuka panel Bluetooth bawaan Windows supaya kasir/radiolog bisa
 * mencari & memasangkan speaker/HP sendiri lewat dialog asli Windows — web
 * page tidak bisa memasangkan perangkat audio Bluetooth secara langsung. */
function bukaPengaturanBluetooth() {
  ipcMain.handle('open-bluetooth-settings', () => shell.openExternal('ms-settings:bluetoothdevices'));
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Klinik Prima Husada',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, 'preload.cjs'),
    },
  });

  await win.loadURL(BASE_URL);
}

app.whenReady().then(async () => {
  try {
    await startServer();
  } catch (err) {
    logError('startServer', err);
    dialog.showErrorBox(
      'Gagal menjalankan server',
      err instanceof Error ? err.message : String(err),
    );
    app.quit();
    return;
  }

  izinkanPerangkatAplikasi();
  bukaPengaturanBluetooth();

  const ready = await waitForServer(BASE_URL);
  if (!ready) {
    logError('waitForServer', new Error('timeout waiting for local server'));
    dialog.showErrorBox('Gagal memulai aplikasi', 'Server lokal tidak merespons. Coba buka ulang aplikasi.');
    app.quit();
    return;
  }

  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

process.on('uncaughtException', (err) => {
  logError('uncaughtException', err);
});
