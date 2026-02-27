const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

let store = null;
let tray = null;
let win = null;
let splashWin = null;
let isQuitting = false;
const isDev = process.env.NODE_ENV === 'development';
let updateCheckTimer = null;
let lastNotifiedUpdateVersion = null;

const UPDATE_CHECK_URL = 'https://api.github.com/repos/Jalal-Nasser/LetsPray/releases/latest';
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours

// Allow automatic adhan playback without user gesture.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// ── App icon paths ──
const iconPath = path.join(__dirname, '..', 'public', 'icon-256.png');
const trayIconPath = path.join(__dirname, '..', 'public', 'tray-icon.png');
const splashAudioPath = path.join(__dirname, '..', 'public', 'audio', 'LetsPray.mp3');

function normalizeVersion(version) {
  return String(version || '')
    .trim()
    .replace(/^v/i, '')
    .split('-')[0];
}

function compareVersions(a, b) {
  const left = normalizeVersion(a).split('.').map((n) => parseInt(n, 10) || 0);
  const right = normalizeVersion(b).split('.').map((n) => parseInt(n, 10) || 0);
  const maxLen = Math.max(left.length, right.length);
  for (let i = 0; i < maxLen; i += 1) {
    const l = left[i] || 0;
    const r = right[i] || 0;
    if (l > r) return 1;
    if (l < r) return -1;
  }
  return 0;
}

function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const req = https.get(
      UPDATE_CHECK_URL,
      {
        headers: {
          'User-Agent': 'LetsPray-App',
          Accept: 'application/vnd.github+json',
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`GitHub API failed: ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on('error', reject);
    req.setTimeout(12000, () => {
      req.destroy(new Error('GitHub API timeout'));
    });
  });
}

function notifyUpdateAvailable(info) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('update:available', info);
}

async function checkForUpdates(options = {}) {
  const { notifyRenderer = true } = options;
  if (isDev) {
    return { available: false, currentVersion: app.getVersion() };
  }

  const currentVersion = app.getVersion();
  try {
    const release = await fetchLatestRelease();
    const latestVersion = normalizeVersion(release.tag_name || release.name);
    if (!latestVersion) {
      return { available: false, currentVersion };
    }

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
    if (!hasUpdate) {
      return { available: false, currentVersion, latestVersion };
    }

    const info = {
      available: true,
      currentVersion,
      latestVersion,
      releaseUrl: release.html_url || 'https://github.com/Jalal-Nasser/LetsPray/releases',
      publishedAt: release.published_at || null,
      releaseName: release.name || '',
    };

    if (notifyRenderer && latestVersion !== lastNotifiedUpdateVersion) {
      lastNotifiedUpdateVersion = latestVersion;
      notifyUpdateAvailable(info);
    }

    return info;
  } catch (err) {
    console.warn('Update check failed:', err.message);
    return { available: false, currentVersion, error: err.message };
  }
}

function startUpdateChecks() {
  if (updateCheckTimer) clearInterval(updateCheckTimer);
  checkForUpdates({ notifyRenderer: true });
  updateCheckTimer = setInterval(() => {
    checkForUpdates({ notifyRenderer: true });
  }, UPDATE_CHECK_INTERVAL_MS);
}

// ── Electron Store (ESM dynamic import) ──
async function initStore() {
  try {
    const { default: Store } = await import('electron-store');
    store = new Store({
      defaults: {
        location: null,
        calculationMethod: 'UmmAlQura',
        madhab: 'Shafi',
        language: 'ar',
        theme: 'dark',
        timeFormat: '12h',
        audioEnabled: true,
        notificationsEnabled: true,
        autoStart: false,
        highLatitudeRule: 'MiddleOfTheNight',
        offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
        muezzin: 'makkah',
      },
    });
  } catch (err) {
    console.error('Failed to initialize electron-store:', err);
  }
}

// ── Splash Screen ──
function createSplash() {
  let splashAudioSrc = '';
  try {
    // Use data URI to avoid cross-origin/file protocol issues inside splash data URL page.
    if (fs.existsSync(splashAudioPath)) {
      const audioBuffer = fs.readFileSync(splashAudioPath);
      splashAudioSrc = `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`;
    } else {
      console.warn('Splash audio file not found:', splashAudioPath);
    }
  } catch (err) {
    console.warn('Failed to load splash audio:', err);
  }

  splashWin = new BrowserWindow({
    width: 400,
    height: 320,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    icon: nativeImage.createFromPath(iconPath),
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const splashHTML = `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8" />
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@700&family=Amiri:wght@400;700&display=swap');
      * { margin:0; padding:0; box-sizing:border-box; }
      body {
        background: transparent;
        display: flex; align-items: center; justify-content: center;
        height: 100vh; width: 100vw;
        font-family: 'Segoe UI', 'Tahoma', system-ui, -apple-system, sans-serif;
        overflow: hidden;
      }
      .splash {
        background: linear-gradient(135deg, #0f1923 0%, #162231 50%, #0f1923 100%);
        border-radius: 24px;
        padding: 50px 40px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        border: 1px solid rgba(16,185,129,0.15);
        animation: fadeIn 0.6s ease-out;
        min-width: 300px;
      }
      @keyframes fadeIn { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
      .logo-wrap { width:80px; height:80px; margin:0 auto 20px; animation:moonPulse 2s ease-in-out infinite; }
      @keyframes moonPulse {
        0%,100% { transform:scale(1); filter:drop-shadow(0 0 10px rgba(16,185,129,0.3)); }
        50% { transform:scale(1.05); filter:drop-shadow(0 0 25px rgba(16,185,129,0.5)); }
      }
      .title { font-size:38px; font-weight:700; font-family:'Aref Ruqaa', 'Amiri', serif; color:#34d399; margin-bottom:6px; direction:rtl; letter-spacing:0; }
      .subtitle { font-size:14px; color:#8899aa; margin-bottom:24px; letter-spacing:1px; font-family:'Amiri', 'Tahoma', sans-serif; }
      .loader { width:140px; height:3px; background:rgba(255,255,255,0.08); border-radius:2px; margin:0 auto; overflow:hidden; }
      .loader-bar { width:40%; height:100%; background:linear-gradient(90deg,#10b981,#34d399); border-radius:2px; animation:load 1.5s ease-in-out infinite; }
      @keyframes load { 0% { transform:translateX(-100%); } 100% { transform:translateX(350%); } }
      .version { font-size:10px; color:#556677; margin-top:14px; }
    </style>
    </head>
    <body>
      <audio id="splash-audio" src="${splashAudioSrc}" preload="auto" autoplay></audio>
      <div class="splash">
        <div class="logo-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none" style="width:100%;height:100%">
            <defs>
              <linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#34d399"/>
                <stop offset="100%" stop-color="#059669"/>
              </linearGradient>
              <filter id="sg"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <path d="M 44 8 C 28 8,14 22,14 38 C 14 54,28 68,44 68 C 33 61,26 50,26 38 C 26 26,33 15,44 8 Z" fill="url(#hg)" filter="url(#sg)"/>
            <path d="M 52 24 L 53.8 29 L 59 29.5 L 55 32.5 L 56.2 37.5 L 52 34.8 L 47.8 37.5 L 49 32.5 L 45 29.5 L 50.2 29 Z" fill="url(#hg)"/>
          </svg>
        </div>
        <div class="title">حي على الصلاة</div>
        <div class="subtitle">Let's Pray</div>
        <div class="loader"><div class="loader-bar"></div></div>
        <div class="version">v1.0.4</div>
      </div>
      <script>
        const splashAudio = document.getElementById('splash-audio');
        const tryPlay = () => {
          if (!splashAudio) return;
          splashAudio.volume = 0.85;
          splashAudio.play().catch(() => {});
        };
        tryPlay();
        setTimeout(tryPlay, 120);
      </script>
    </body>
    </html>`;

  splashWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHTML));
}

// ── Window ──
function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 700,
    minHeight: 500,
    frame: false,
    transparent: false,
    resizable: true,
    show: false, // hidden until ready
    icon: nativeImage.createFromPath(iconPath),
    backgroundColor: '#0f1923',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Show main window after content loads, close splash
  win.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      if (splashWin) {
        splashWin.close();
        splashWin = null;
      }
      win.show();
      if (isDev) win.webContents.openDevTools({ mode: 'detach' });
    }, 5000); // show splash for at least 5s
  });

  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });
}

// ── Tray ──
function createTray() {
  const icon = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("حي على الصلاة - Let's Pray");

  const updateTrayMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'حي على الصلاة', click: () => win.show() },
      { type: 'separator' },
      { label: 'خروج / Quit', click: () => { isQuitting = true; app.quit(); } },
    ]);
    tray.setContextMenu(contextMenu);
  };

  updateTrayMenu();
  tray.on('click', () => (win.isVisible() ? win.focus() : win.show()));
}

// ── App lifecycle ──
app.whenReady().then(async () => {
  createSplash();
  await initStore();
  createWindow();
  createTray();
  startUpdateChecks();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => { isQuitting = true; });
app.on('before-quit', () => {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = null;
  }
});

// ── IPC Handlers ──
ipcMain.handle('store:get', (_e, key) => store ? store.get(key) : undefined);
ipcMain.handle('store:getAll', () => store ? store.store : {});
ipcMain.on('store:set', (_e, key, value) => { if (store) store.set(key, value); });
ipcMain.handle('update:check', async () => checkForUpdates({ notifyRenderer: false }));

let adhanWin = null;

function createAdhanWindow(title, body) {
  if (adhanWin) {
    adhanWin.close();
    adhanWin = null;
  }

  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Window dimensions
  const w = 340;
  const h = 120;

  adhanWin = new BrowserWindow({
    width: w,
    height: h,
    x: width - w - 20, // Bottom right with 20px padding
    y: height - h - 20,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false, // Don't steal focus from user's current app
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });

  const adhanHTML = `<!DOCTYPE html>
    <html dir="rtl">
    <head>
    <meta charset="utf-8">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body {
        background: transparent;
        font-family: 'Segoe UI', Tahoma, sans-serif;
        overflow: hidden;
        user-select: none;
      }
      .notification {
        background: linear-gradient(135deg, #0f1923 0%, #162231 100%);
        border-radius: 16px;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        border: 1px solid rgba(16,185,129,0.3);
        height: 100vh;
        animation: slideIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        position: relative;
      }
      @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      .icon-box {
        width: 48px; height: 48px;
        background: rgba(16,185,129,0.1);
        border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        animation: pulse 2s infinite;
      }
      .icon-box svg { width: 28px; height: 28px; fill: #34d399; }
      @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16,185,129, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(16,185,129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16,185,129, 0); } }
      .text-content { flex-grow: 1; }
      .title { font-size: 18px; font-weight: 700; color: #34d399; margin-bottom: 4px; }
      .body { font-size: 14px; color: #cbd5e1; }
      .close-btn {
        position: absolute; top: 12px; left: 12px; /* RTL means left is trailing */
        background: none; border: none; color: #64748b; cursor: pointer;
        font-size: 18px; line-height: 1; width: 24px; height: 24px; border-radius: 50%;
        transition: all 0.2s;
        -webkit-app-region: no-drag;
      }
      .close-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
    </style>
    </head>
    <body style="-webkit-app-region: drag;">
      <div class="notification">
        <button class="close-btn" onclick="const { ipcRenderer } = require('electron'); ipcRenderer.send('adhan:close');">&times;</button>
        <div class="icon-box">
          <svg viewBox="0 0 24 24"><path d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M11,19.93C7.05,19.43 4,16.05 4,12C4,7.95 7.05,4.57 11,4.07V19.93M13,4.07C16.95,4.57 20,7.95 20,12C20,16.05 16.95,19.43 13,19.93V4.07Z"/></svg>
        </div>
        <div class="text-content">
          <div class="title">${title}</div>
          <div class="body">${body}</div>
        </div>
      </div>
    </body>
    </html>`;

  adhanWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(adhanHTML));

  // Auto close after 15 seconds
  setTimeout(() => {
    if (adhanWin) { adhanWin.close(); adhanWin = null; }
  }, 15000);
}

ipcMain.on('adhan:close', () => {
  if (adhanWin) { adhanWin.close(); adhanWin = null; }
});

ipcMain.on('notification:show', (_e, title, body) => {
  // Show custom adhan window instead of native notification
  createAdhanWindow(title, body);
});

// Open external links (for footer)
ipcMain.on('open-external', (_e, url) => { shell.openExternal(url); });

// Window controls for frameless window
ipcMain.on('window:minimize', () => win?.minimize());
ipcMain.on('window:maximize', () => {
  if (win?.isMaximized()) win.unmaximize();
  else win?.maximize();
});
ipcMain.on('window:close', () => win?.close());
