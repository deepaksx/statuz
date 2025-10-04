import { contextBridge, ipcRenderer } from 'electron';
import type { IpcMessage, IpcResponse } from '@aipm/shared' with { 'resolution-mode': 'import' };

// Define the API that will be exposed to the renderer process
const electronAPI = {
  // IPC communication
  invoke: async (message: IpcMessage): Promise<IpcResponse> => {
    return await ipcRenderer.invoke('app-request', message);
  },

  // Event listeners
  on: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (event, ...args) => listener(...args));
  },

  removeListener: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, listener);
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // File operations
  showSaveDialog: async (options: any) => {
    return await ipcRenderer.invoke('show-save-dialog', options);
  },

  showOpenDialog: async (options: any) => {
    return await ipcRenderer.invoke('show-open-dialog', options);
  },

  saveFile: async (filePath: string, content: string) => {
    return await ipcRenderer.invoke('save-file', filePath, content);
  },

  openExternal: async (url: string) => {
    return await ipcRenderer.invoke('open-external', url);
  },

  // App info
  getAppVersion: async () => {
    return await ipcRenderer.invoke('get-app-version');
  },

  getAppPath: async (name: string) => {
    return await ipcRenderer.invoke('get-app-path', name);
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type definitions for the renderer process
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}