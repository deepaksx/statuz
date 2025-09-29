import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { BackgroundService } from '@statuz/background';
import type { AppConfig, IpcMessage, IpcResponse } from '@statuz/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class StatuzApp {
  private mainWindow: BrowserWindow | null = null;
  private backgroundService: BackgroundService | null = null;
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
    this.setupApp();
  }

  private loadConfig(): AppConfig {
    const userDataPath = app.getPath('userData');
    const dataDirectory = join(userDataPath, 'data');

    // Ensure data directory exists
    if (!existsSync(dataDirectory)) {
      mkdirSync(dataDirectory, { recursive: true });
    }

    return {
      privacyMode: true,
      llmProvider: 'none',
      dataDirectory
    };
  }

  private setupApp() {
    // Handle app ready
    app.whenReady().then(() => {
      this.createWindow();
      this.setupIpcHandlers();
      this.initializeBackgroundService();
    });

    // Handle window closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.cleanup();
        app.quit();
      }
    });

    // Handle activate (macOS)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    // Handle before quit
    app.on('before-quit', () => {
      this.cleanup();
    });
  }

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js')
      },
      titleBarStyle: 'default',
      show: false
    });

    // Load the renderer
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/dist/index.html'));
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupIpcHandlers() {
    // Generic IPC handler
    ipcMain.handle('app-request', async (event, message: IpcMessage): Promise<IpcResponse> => {
      try {
        const result = await this.handleIpcMessage(message);
        return { success: true, data: result };
      } catch (error) {
        console.error('IPC handler error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // File operations
    ipcMain.handle('show-save-dialog', async (event, options) => {
      if (!this.mainWindow) return null;
      const result = await dialog.showSaveDialog(this.mainWindow, options);
      return result;
    });

    ipcMain.handle('show-open-dialog', async (event, options) => {
      if (!this.mainWindow) return null;
      const result = await dialog.showOpenDialog(this.mainWindow, options);
      return result;
    });

    ipcMain.handle('save-file', async (event, filePath: string, content: string) => {
      try {
        writeFileSync(filePath, content, 'utf-8');
        return true;
      } catch (error) {
        console.error('Failed to save file:', error);
        return false;
      }
    });

    ipcMain.handle('open-external', async (event, url: string) => {
      await shell.openExternal(url);
    });

    // App info
    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });

    ipcMain.handle('get-app-path', (event, name: string) => {
      return app.getPath(name as any);
    });
  }

  private async handleIpcMessage(message: IpcMessage): Promise<any> {
    if (!this.backgroundService) {
      throw new Error('Background service not initialized');
    }

    switch (message.type) {
      case 'get-connection-state':
        return this.backgroundService.getConnectionState();

      case 'get-groups':
        return await this.backgroundService.getGroups();

      case 'update-group-watch-status':
        const { groupId, isWatched } = message.payload;
        return await this.backgroundService.updateGroupWatchStatus(groupId, isWatched);

      case 'refresh-groups':
        return await this.backgroundService.refreshGroups();

      case 'get-messages':
        const { groupId: msgGroupId, since: msgSince, limit: msgLimit } = message.payload || {};
        return await this.backgroundService.getMessages(msgGroupId, msgSince, msgLimit);

      case 'get-signals':
        const { kind, since, limit } = message.payload || {};
        return await this.backgroundService.getSignals(kind, since, limit);

      case 'get-milestones':
        return await this.backgroundService.getMilestones();

      case 'generate-snapshot':
        const { since: snapshotSince } = message.payload || {};
        return await this.backgroundService.generateSnapshot(snapshotSince);

      case 'export-snapshot':
        const { report, format } = message.payload;
        return await this.backgroundService.exportSnapshot(report, format);

      case 'get-stats':
        return this.backgroundService.getStats();

      case 'get-audit-logs':
        const { limit: auditLimit } = message.payload || {};
        return this.backgroundService.getAuditLogs(auditLimit);

      case 'get-config':
        return this.config;

      case 'update-config':
        this.config = { ...this.config, ...message.payload };
        return this.config;

      case 'restart-service':
        await this.backgroundService.stop();
        await this.initializeBackgroundService();
        return { restarted: true };

      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }

  private async initializeBackgroundService() {
    if (this.backgroundService) {
      await this.backgroundService.stop();
    }

    this.backgroundService = new BackgroundService(this.config);

    // Forward events to renderer
    this.backgroundService.on('connectionStateChanged', (state) => {
      this.sendToRenderer('connection-state-changed', state);
    });

    this.backgroundService.on('messageProcessed', (message, signals) => {
      this.sendToRenderer('message-processed', { message, signals });
    });

    this.backgroundService.on('groupsUpdated', (groups) => {
      this.sendToRenderer('groups-updated', groups);
    });

    this.backgroundService.on('contextUpdated', (context) => {
      this.sendToRenderer('context-updated', context);
    });

    this.backgroundService.on('error', (error) => {
      this.sendToRenderer('service-error', { message: error.message, stack: error.stack });
    });

    // Start the service
    await this.backgroundService.start();
  }

  private sendToRenderer(channel: string, data: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  private async cleanup() {
    if (this.backgroundService) {
      await this.backgroundService.stop();
      this.backgroundService = null;
    }
  }
}

// Create and run the app
new StatuzApp();