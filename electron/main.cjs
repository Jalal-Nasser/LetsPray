const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');

let store = null;
let tray = null;
let win = null;
let splashWin = null;
let isQuitting = false;
const isDev = process.env.NODE_ENV === 'development';

// ── App icon paths ──
const iconPath = path.join(__dirname, '..', 'public', 'icon-256.png');
const trayIconPath = path.join(__dirname, '..', 'public', 'tray-icon.png');

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
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body {
        background: transparent;
        display: flex; align-items: center; justify-content: center;
        height: 100vh; width: 100vw;
        font-family: 'Segoe UI', Tahoma, sans-serif;
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
      .title { font-size:28px; font-weight:700; color:#34d399; margin-bottom:6px; direction:rtl; }
      .subtitle { font-size:14px; color:#8899aa; margin-bottom:24px; letter-spacing:1px; }
      .loader { width:140px; height:3px; background:rgba(255,255,255,0.08); border-radius:2px; margin:0 auto; overflow:hidden; }
      .loader-bar { width:40%; height:100%; background:linear-gradient(90deg,#10b981,#34d399); border-radius:2px; animation:load 1.5s ease-in-out infinite; }
      @keyframes load { 0% { transform:translateX(-100%); } 100% { transform:translateX(350%); } }
      .version { font-size:10px; color:#556677; margin-top:14px; }
    </style>
    </head>
    <body>
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
        <div class="version">v1.0.1</div>
      </div>
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
        }, 1800); // show splash for at least 1.8s
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

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => { isQuitting = true; });

// ── IPC Handlers ──
ipcMain.handle('store:get', (_e, key) => store ? store.get(key) : undefined);
ipcMain.handle('store:getAll', () => store ? store.store : {});
ipcMain.on('store:set', (_e, key, value) => { if (store) store.set(key, value); });

ipcMain.on('notification:show', (_e, title, body) => {
    new Notification({ title, body, icon: nativeImage.createFromPath(iconPath) }).show();
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
