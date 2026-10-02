const { contextBridge, ipcRenderer } = require('electron');
const call = (ch, ...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld('desktop', {
  loadDb: () => call('db:load'),
  saveDb: db => call('db:save', db),
  putFile: (id, name, mime, bytes) => call('file:put', id, name, bytes),
  getFile: id => call('file:get', id),
  delFile: id => call('file:del', id),
  openFile: id => call('file:open', id),
  saveFileAs: (id, name) => call('file:saveas', id, name),
  backup: () => call('backup:make'),
  restore: () => call('backup:restore'),
  exportPdf: name => call('report:pdf', name),
  info: () => call('app:info'),
  openFolder: () => call('app:openfolder'),
});
