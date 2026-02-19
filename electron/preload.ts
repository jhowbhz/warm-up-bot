import { contextBridge } from 'electron';

// Expor APIs seguras para o renderer
contextBridge.exposeInMainWorld('electron', {
  // Podemos adicionar funções IPC aqui se necessário no futuro
  platform: process.platform,
});
