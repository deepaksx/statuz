declare global {
  interface Window {
    electronAPI?: {
      // IPC communication methods
      invoke: (message: { type: string; payload?: any }) => Promise<{ success: boolean; data?: any; error?: string }>;

      // Event listeners
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;

      // App control
      minimize: () => void;
      maximize: () => void;
      close: () => void;

      // File operations
      openExternal: (url: string) => void;
      showItemInFolder: (path: string) => void;
      showSaveDialog: (options?: any) => Promise<any>;
      saveFile: (path: string, content: string) => Promise<void>;
    };
    electron: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}

export {};