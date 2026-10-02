// نواة البرنامج (Electron) — تخزين محلي كامل دون أي اتصال بالإنترنت
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const fs = require('fs');
const path = require('path');

let win;
const root = () => path.join(app.getPath('userData'), 'data');
const filesDir = () => path.join(root(), 'files');
const dbPath = () => path.join(root(), 'db.json');
const okId = id => typeof id === 'string' && /^[a-z0-9]{6,32}$/.test(id);
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const findFile = id => {
  if (!okId(id)) throw new Error('bad id');
  const n = fs.readdirSync(filesDir()).find(e => e === id || e.startsWith(id + '.'));
  if (!n) throw new Error('missing file');
  return path.join(filesDir(), n);
};

function registerIpc() {
  ipcMain.handle('db:load', () => {
    fs.mkdirSync(filesDir(), { recursive: true });
    try { return JSON.parse(fs.readFileSync(dbPath(), 'utf8')); } catch { return null; }
  });
  ipcMain.handle('db:save', (_, db) => {
    fs.mkdirSync(filesDir(), { recursive: true });
    const tmp = dbPath() + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, dbPath());
    return true;
  });
  ipcMain.handle('file:put', (_, id, name, bytes) => {
    if (!okId(id)) throw new Error('bad id');
    fs.mkdirSync(filesDir(), { recursive: true });
    const ext = (path.extname(String(name)).toLowerCase().match(/^\.[a-z0-9]{1,8}$/) || [''])[0];
    fs.writeFileSync(path.join(filesDir(), id + ext), Buffer.from(bytes));
    return true;
  });
  ipcMain.handle('file:get', (_, id) => ({ bytes: fs.readFileSync(findFile(id)) }));
  ipcMain.handle('file:del', (_, id) => { try { fs.unlinkSync(findFile(id)); } catch {} return true; });
  ipcMain.handle('file:open', async (_, id) => !(await shell.openPath(findFile(id))));
  ipcMain.handle('file:saveas', async (_, id, name) => {
    const r = await dialog.showSaveDialog(win, { defaultPath: String(name || 'file') });
    if (r.canceled || !r.filePath) return false;
    fs.copyFileSync(findFile(id), r.filePath);
    return true;
  });
  ipcMain.handle('backup:make', async () => {
    const r = await dialog.showOpenDialog(win, { title: 'اختر مكان حفظ النسخة الاحتياطية', properties: ['openDirectory', 'createDirectory'] });
    if (r.canceled || !r.filePaths[0]) return { ok: false };
    const target = path.join(r.filePaths[0], 'نسخة-التقويم-الذاتي-' + stamp());
    fs.cpSync(root(), target, { recursive: true });
    return { ok: true, path: target };
  });
  ipcMain.handle('backup:restore', async () => {
    const r = await dialog.showOpenDialog(win, { title: 'اختر مجلد النسخة الاحتياطية', properties: ['openDirectory'] });
    if (r.canceled || !r.filePaths[0]) return { ok: false };
    const src = r.filePaths[0];
    if (!fs.existsSync(path.join(src, 'db.json'))) return { ok: false, error: 'المجلد المختار ليس نسخة احتياطية صالحة' };
    fs.cpSync(root(), root() + '-before-restore-' + stamp(), { recursive: true }); // نسخة أمان قبل الاستبدال
    fs.rmSync(root(), { recursive: true, force: true });
    fs.cpSync(src, root(), { recursive: true });
    fs.mkdirSync(filesDir(), { recursive: true });
    return { ok: true, db: JSON.parse(fs.readFileSync(dbPath(), 'utf8')) };
  });
  ipcMain.handle('report:pdf', async (_, name) => {
    const r = await dialog.showSaveDialog(win, { defaultPath: String(name || 'report') + '.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (r.canceled || !r.filePath) return false;
    const pdf = await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true });
    fs.writeFileSync(r.filePath, pdf);
    shell.showItemInFolder(r.filePath);
    return true;
  });
  ipcMain.handle('app:info', () => ({ path: root(), version: app.getVersion(), platform: process.platform }));
  ipcMain.handle('app:openfolder', () => shell.openPath(root()));
}

function createWindow() {
  const icon = path.join(__dirname, 'build', 'icon.png');
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 1000, minHeight: 680, show: false,
    backgroundColor: '#f7f5ef', title: 'دليل التقويم الذاتي المدرسي', autoHideMenuBar: true,
    ...(fs.existsSync(icon) ? { icon } : {}),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, plugins: true },
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    const isMac = process.platform === 'darwin';
    Menu.setApplicationMenu(Menu.buildFromTemplate([...(isMac ? [{ role: 'appMenu' }] : []), { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }]));
    registerIpc();
    createWindow();
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
