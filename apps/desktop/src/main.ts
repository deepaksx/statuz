import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import type { AppConfig, IpcMessage, IpcResponse } from '@aipm/shared' with { 'resolution-mode': 'import' };

// __dirname is available in CommonJS

class StatuzApp {
  private mainWindow: BrowserWindow | null = null;
  private backgroundService: any | null = null;
  private backgroundServiceReady: Promise<void>;
  private resolveBackgroundServiceReady!: () => void;
  private config: AppConfig;

  constructor() {
    this.backgroundServiceReady = new Promise((resolve) => {
      this.resolveBackgroundServiceReady = resolve;
    });
    this.config = this.loadConfig();
    this.setupApp();
  }

  private async saveConfigToDatabase(key: string, value: string): Promise<void> {
    // Import StatuzDatabase class from @aipm/db
    const { StatuzDatabase } = await import('@aipm/db');
    const dbPath = join(this.config.dataDirectory, 'statuz.db');
    const db = new StatuzDatabase(dbPath);

    try {
      await db.setConfig(key, value);
      console.log(`✅ Saved ${key} to database`);
    } catch (error) {
      console.error('Failed to save config to database:', error);
      throw error;
    } finally {
      db.close();
    }
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

  private async loadApiKeyAsync(dataDirectory: string) {
    try {
      const { StatuzDatabase } = await import('@aipm/db');
      const dbPath = join(dataDirectory, 'statuz.db');
      const db = new StatuzDatabase(dbPath);
      const geminiApiKey = await db.getConfig('geminiApiKey');
      db.close();

      if (geminiApiKey) {
        console.log('✅ Loaded Gemini API key from database');
        this.config.geminiApiKey = geminiApiKey;
        this.config.llmProvider = 'gemini';
        // Update background service with the API key
        if (this.backgroundService) {
          this.backgroundService.setGeminiApiKey(geminiApiKey);
        }
      } else {
        console.log('⚠️  No Gemini API key found in database');
      }
    } catch (error) {
      console.warn('Failed to load config from database:', error);
    }
  }

  private setupApp() {
    // Handle app ready
    app.whenReady().then(async () => {
      console.log('🚀 Electron app ready!');
      this.createWindow();
      this.setupIpcHandlers();

      // Load API key before starting background service
      console.log('🔑 Loading API key from database...');
      await this.loadApiKeyAsync(this.config.dataDirectory);

      console.log('⚙️  Initializing background service...');
      this.initializeBackgroundService().catch((err) => {
        console.error('❌ Background service failed:', err);
      });
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
    console.log('🪟 Creating Electron window...');
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      center: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js')
      },
      titleBarStyle: 'default',
      show: false,
      backgroundColor: '#1a1a1a',
      alwaysOnTop: true
    });

    // Check if production build exists
    // __dirname is dist/main, so ../renderer/index.html is dist/renderer/index.html
    const prodPath = join(__dirname, '../renderer/index.html');
    const isDev = process.env.NODE_ENV === 'development' || !existsSync(prodPath);

    console.log(`🔍 Checking production build at: ${prodPath}`);
    console.log(`📊 Production build exists: ${existsSync(prodPath)}`);

    if (isDev) {
      console.log('📡 Loading renderer from http://localhost:5173 (Development Mode)');
      this.mainWindow.loadURL('http://localhost:5173').then(() => {
        console.log('✅ Window loaded successfully!');
      }).catch((err) => {
        console.error('❌ Failed to load window:', err);
      });
      // Only open DevTools if NO_DEVTOOLS env var is not set
      if (!process.env.NO_DEVTOOLS) {
        this.mainWindow.webContents.openDevTools();
      } else {
        console.log('⚡ DevTools disabled for better performance');
      }
    } else {
      console.log('📡 Loading renderer from file (Production Mode)');
      this.mainWindow.loadFile(prodPath).then(() => {
        console.log('✅ Window loaded successfully!');
      }).catch((err) => {
        console.error('❌ Failed to load window:', err);
      });
      // Don't open DevTools in production
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      console.log('✅ Window ready to show');
      this.mainWindow?.center();
      this.mainWindow?.show();
      this.mainWindow?.focus();
      this.mainWindow?.moveTop();
      // Disable always-on-top after showing
      setTimeout(() => {
        this.mainWindow?.setAlwaysOnTop(false);
      }, 1000);
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
    // Wait for background service to be ready
    await this.backgroundServiceReady;

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

      case 'update-group-auto-response':
        const { groupId: arGroupId, enabled, trigger } = message.payload;
        return await this.backgroundService.updateGroupAutoResponse(arGroupId, enabled, trigger);

      case 'refresh-groups':
        return await this.backgroundService.refreshGroups();

      case 'get-messages':
        const { groupId: msgGroupId, since: msgSince, limit: msgLimit } = message.payload || {};
        return await this.backgroundService.getMessages(msgGroupId, msgSince, msgLimit);

      case 'get-group-members':
        const { groupId: membersGroupId } = message.payload;
        return await this.backgroundService.getGroupMembers(membersGroupId);

      case 'upload-chat-history':
        const { groupId: uploadGroupId, content } = message.payload;
        return await this.backgroundService.uploadChatHistory(uploadGroupId, content);

      case 'extract-project-data':
        const { groupId: extractGroupId } = message.payload;
        return await this.backgroundService.extractProjectData(extractGroupId);

      case 'delete-group-history':
        const { groupId: deleteHistoryGroupId } = message.payload;
        return await this.backgroundService.deleteGroupHistory(deleteHistoryGroupId);

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

      case 'get-group-context':
        const { groupId: contextGroupId } = message.payload;
        return await this.backgroundService.getGroupContext(contextGroupId);

      case 'update-group-context':
        const { groupId: updateContextGroupId, context } = message.payload;
        await this.backgroundService.updateGroupContext(updateContextGroupId, context);
        return { success: true };

      case 'delete-group-context':
        const { groupId: deleteContextGroupId } = message.payload;
        await this.backgroundService.deleteGroupContext(deleteContextGroupId);
        return { success: true };

      case 'generate-group-report':
        const { groupId: reportGroupId, timeframe } = message.payload;
        return await this.backgroundService.generateGroupReport(reportGroupId, timeframe);

      case 'ai-chat':
        const { groupId: aiGroupId, question, apiKey } = message.payload;
        return await this.backgroundService.chatWithAI(aiGroupId, question, apiKey);

      case 'test-ai-connection':
        const { apiKey: testApiKey } = message.payload || {};
        return await this.backgroundService.testAIConnection(testApiKey);

      case 'set-gemini-api-key':
        const { apiKey: geminiKey } = message.payload;
        this.backgroundService.setGeminiApiKey(geminiKey);
        this.config.geminiApiKey = geminiKey;
        // Persist to database
        await this.saveConfigToDatabase('geminiApiKey', geminiKey);
        return { success: true };

      case 'send-message':
        const { groupId: sendGroupId, message: messageText } = message.payload;
        return await this.backgroundService.sendMessage(sendGroupId, messageText);

      case 'get-contacts':
        return await this.backgroundService.getContacts();

      case 'get-contact':
        const { phoneNumber: getPhoneNumber } = message.payload;
        return await this.backgroundService.getContact(getPhoneNumber);

      case 'upsert-contact':
        const { phoneNumber, alias, role, notes } = message.payload;
        await this.backgroundService.upsertContact({ phoneNumber, alias, role, notes });
        return { success: true };

      case 'delete-contact':
        const { phoneNumber: deletePhoneNumber } = message.payload;
        await this.backgroundService.deleteContact(deletePhoneNumber);
        return { success: true };

      case 'get-authors-from-watched-groups':
        return await this.backgroundService.getAuthorsFromWatchedGroups();

      // ==================== AIPM PROJECT MANAGEMENT ====================

      case 'get-projects':
        const { status: projectStatus } = message.payload || {};
        return await this.backgroundService.getProjects({ status: projectStatus });

      case 'create-project':
        return await this.backgroundService.createProject(message.payload);

      case 'get-tasks':
        const { projectId: taskProjectId, status: taskStatus, ownerPhone } = message.payload || {};
        return await this.backgroundService.getTasks({
          projectId: taskProjectId,
          status: taskStatus,
          ownerPhone
        });

      case 'create-task':
        return await this.backgroundService.createTask(message.payload);

      case 'update-task':
        const { taskId, updates } = message.payload;
        return await this.backgroundService.updateTask(taskId, updates);

      case 'get-risks':
        const { projectId: riskProjectId } = message.payload || {};
        return await this.backgroundService.getRisks({ projectId: riskProjectId });

      case 'get-conflicts':
        return await this.backgroundService.getConflicts();

      case 'get-config':
        return this.config;

      case 'update-config':
        this.config = { ...this.config, ...message.payload };
        // Save geminiApiKey to database if provided
        if (message.payload.geminiApiKey) {
          await this.saveConfigToDatabase('geminiApiKey', message.payload.geminiApiKey);
          // Also update background service
          if (this.backgroundService) {
            this.backgroundService.setGeminiApiKey(message.payload.geminiApiKey);
          }
        }
        return this.config;

      case 'restart-service':
        await this.backgroundService.stop();
        // Create new promise for the restarted service
        this.backgroundServiceReady = new Promise((resolve) => {
          this.resolveBackgroundServiceReady = resolve;
        });
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

    // Use dynamic import for ES module
    const { BackgroundService } = await import('@aipm/background');
    this.backgroundService = new BackgroundService(this.config);

    // Forward events to renderer
    this.backgroundService.on('connectionStateChanged', (state: any) => {
      this.sendToRenderer('connection-state-changed', state);
    });

    this.backgroundService.on('messageProcessed', (message: any) => {
      this.sendToRenderer('message-processed', { message });
    });

    this.backgroundService.on('groupsUpdated', (groups: any) => {
      this.sendToRenderer('groups-updated', groups);
    });

    this.backgroundService.on('contextUpdated', (context: any) => {
      this.sendToRenderer('context-updated', context);
    });

    this.backgroundService.on('error', (error: any) => {
      this.sendToRenderer('service-error', { message: error.message, stack: error.stack });
    });

    // Mark service as ready before starting
    this.resolveBackgroundServiceReady();

    // Start the service (non-blocking)
    console.log('🔄 Starting WhatsApp service...');
    this.backgroundService.start().then(() => {
      console.log('✅ WhatsApp service started!');
    }).catch((err: any) => {
      console.error('❌ WhatsApp service error:', err);
    });
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