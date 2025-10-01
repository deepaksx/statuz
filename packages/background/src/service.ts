import { EventEmitter } from 'events';
import { join } from 'path';
import { existsSync } from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { StatuzDatabase } from '@statuz/db';
import { WhatsAppClient } from './whatsapp-client.js';
import { WhatsAppWebSimple } from './whatsapp-web-simple.js';
import { ContextLoader } from './context/loader.js';
import { SnapshotGenerator } from './snapshot/generator.js';
import { parseWhatsAppChat } from './utils/whatsapp-parser.js';
import { AIService } from './ai-service.js';
import type {
  WhatsAppConnectionState,
  Group,
  Message,
  ProjectContext,
  SnapshotReport,
  AppConfig
} from '@statuz/shared';

export interface BackgroundServiceEvents {
  connectionStateChanged: (state: WhatsAppConnectionState) => void;
  messageProcessed: (message: Message) => void;
  groupsUpdated: (groups: Group[]) => void;
  contextUpdated: (context: ProjectContext) => void;
  error: (error: Error) => void;
}

export class BackgroundService extends EventEmitter {
  private db: StatuzDatabase;
  private whatsappClient: WhatsAppClient | WhatsAppWebSimple;
  private contextLoader: ContextLoader;
  private snapshotGenerator: SnapshotGenerator;
  private aiService: AIService;
  private config: AppConfig;
  private isRunning = false;
  private contextChecksum = '';
  private whatsappServiceProcess: ChildProcess | null = null;
  private whatsappServicePort = 3002;

  constructor(config: AppConfig) {
    super();
    this.config = config;

    // Initialize database
    const dbPath = join(config.dataDirectory, 'statuz.db');
    this.db = new StatuzDatabase(dbPath);

    // Initialize WhatsApp client
    const sessionPath = join(config.dataDirectory, '.wwebjs_auth');
    this.whatsappClient = new WhatsAppClient(sessionPath);
    console.log('✅ WhatsApp client initialized with session path:', sessionPath);

    // Initialize other components
    this.contextLoader = new ContextLoader(join(process.cwd(), 'context'));
    this.snapshotGenerator = new SnapshotGenerator(this.db);
    this.aiService = new AIService();

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // WhatsApp connection state changes
    this.whatsappClient.on('connectionStateChanged', (state: WhatsAppConnectionState) => {
      this.emit('connectionStateChanged', state);
    });

    // New messages from WhatsApp
    this.whatsappClient.on('message', async (message: Message) => {
      await this.processMessage(message);
    });

    // Groups updated
    this.whatsappClient.on('groupsUpdated', async (groups: Group[]) => {
      // Update database with new groups
      for (const group of groups) {
        await this.db.upsertGroup(group);
      }
      // Emit groups from database to preserve watch status and other fields
      const dbGroups = await this.db.getGroups();
      this.emit('groupsUpdated', dbGroups);
    });
  }

  private async startWhatsAppService() {
    if (this.whatsappServiceProcess) {
      console.log('WhatsApp service already running');
      return;
    }

    console.log('🚀 Starting WhatsApp standalone service...');

    const servicePath = join(__dirname, 'whatsapp-service.js');

    this.whatsappServiceProcess = spawn('node', [servicePath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        WHATSAPP_SERVICE_PORT: String(this.whatsappServicePort)
      }
    });

    this.whatsappServiceProcess.stdout?.on('data', (data) => {
      console.log(`[WhatsApp Service] ${data.toString().trim()}`);
    });

    this.whatsappServiceProcess.stderr?.on('data', (data) => {
      console.error(`[WhatsApp Service Error] ${data.toString().trim()}`);
    });

    this.whatsappServiceProcess.on('exit', (code) => {
      console.log(`WhatsApp service exited with code ${code}`);
      this.whatsappServiceProcess = null;
    });

    // Wait for service to be ready
    await this.waitForService();

    // Initialize WhatsApp in the service
    const sessionPath = join(this.config.dataDirectory, '.wwebjs_auth');
    await this.callServiceAPI('/start', 'POST', { sessionPath });

    // Start polling for connection state
    this.startConnectionStatePolling();
  }

  private async stopWhatsAppService() {
    if (!this.whatsappServiceProcess) {
      return;
    }

    console.log('⏹️  Stopping WhatsApp standalone service...');

    try {
      await this.callServiceAPI('/stop', 'POST');
    } catch (error) {
      console.error('Failed to stop service gracefully:', error);
    }

    this.whatsappServiceProcess.kill();
    this.whatsappServiceProcess = null;
  }

  private async waitForService(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`http://localhost:${this.whatsappServicePort}/health`);
        if (response.ok) {
          console.log('✅ WhatsApp service is ready');
          return;
        }
      } catch (error) {
        // Service not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('WhatsApp service failed to start');
  }

  private async callServiceAPI(endpoint: string, method = 'GET', body?: any) {
    const url = `http://localhost:${this.whatsappServicePort}${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`Service API error: ${response.statusText}`);
    }

    return await response.json();
  }

  private connectionStatePolling: NodeJS.Timeout | null = null;

  private startConnectionStatePolling() {
    if (this.connectionStatePolling) {
      return;
    }

    this.connectionStatePolling = setInterval(async () => {
      try {
        const state = await this.callServiceAPI('/connection-state');
        this.emit('connectionStateChanged', state);
      } catch (error) {
        // Service might be down
      }
    }, 2000); // Poll every 2 seconds
  }

  private stopConnectionStatePolling() {
    if (this.connectionStatePolling) {
      clearInterval(this.connectionStatePolling);
      this.connectionStatePolling = null;
    }
  }

  async start() {
    if (this.isRunning) return;

    try {
      this.isRunning = true;

      // Load project context (non-blocking - continue if it fails)
      try {
        await this.loadProjectContext();
      } catch (error) {
        console.warn('Failed to load project context:', error);
        // Continue anyway - context is optional
      }

      // Initialize WhatsApp client
      await this.whatsappClient.initialize();

      this.db.auditLog('SERVICE_START', 'Background service started');
    } catch (error) {
      this.isRunning = false;
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  async stop() {
    if (!this.isRunning) return;

    try {
      this.isRunning = false;

      // Stop connection state polling
      this.stopConnectionStatePolling();

      // Stop WhatsApp standalone service
      await this.stopWhatsAppService();

      // Stop WhatsApp client
      await this.whatsappClient.destroy();

      // Close database
      this.db.close();

      this.db.auditLog('SERVICE_STOP', 'Background service stopped');
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async loadProjectContext() {
    try {
      const context = await this.contextLoader.loadContext();
      const checksum = await this.contextLoader.getContextChecksum();

      if (checksum !== this.contextChecksum) {
        this.contextChecksum = checksum;
        // Signal extraction has been removed - context setting no longer needed

        // Update milestones in database
        for (const milestoneData of context.milestones) {
          const milestone = {
            ...milestoneData,
            status: 'NOT_STARTED' as const,
            lastUpdateTs: Date.now()
          };
          await this.db.upsertMilestone(milestone);
        }

        this.emit('contextUpdated', context);
        this.db.auditLog('CONTEXT_LOADED', `Context loaded with ${context.milestones.length} milestones`);
      }
    } catch (error) {
      console.error('Failed to load project context:', error);
    }
  }

  private async processMessage(message: Message) {
    try {
      console.log(`📨 Processing message from group: ${message.groupId}`);

      // Check if the message is from a watched group
      const groups = await this.db.getGroups();
      const group = groups.find(g => g.id === message.groupId && g.isWatched);

      if (!group) {
        console.log(`⏭️  Skipping message - group ${message.groupId} is not watched`);
        return;
      }

      console.log(`💾 Storing message from watched group: ${group.name}`);

      // Store message in database
      const inserted = await this.db.insertMessage(message);
      if (!inserted) {
        console.log(`⏭️  Message already exists, skipping`);
        return; // Message already exists
      }

      console.log(`✅ Message stored and emitting messageProcessed event`);
      this.emit('messageProcessed', message);
    } catch (error) {
      console.error('Failed to process message:', error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Public API methods

  getConnectionState(): WhatsAppConnectionState {
    return this.whatsappClient.getConnectionState();
  }

  async getGroups(): Promise<Group[]> {
    return this.db.getGroups();
  }

  async updateGroupWatchStatus(groupId: string, isWatched: boolean): Promise<boolean> {
    const success = await this.db.updateGroupWatchStatus(groupId, isWatched);
    if (success) {
      const groups = await this.db.getGroups();
      this.emit('groupsUpdated', groups);
    }
    return success;
  }

  async getMessages(groupId?: string, since?: number, limit?: number): Promise<Message[]> {
    return this.db.getMessages(groupId, since, limit);
  }

  async getGroupMembers(groupId: string) {
    // Get all messages for this group
    const messages = await this.db.getMessages(groupId, undefined, 100000);

    // Process messages to get unique members with their stats
    const memberMap = new Map();

    messages.forEach((message: Message) => {
      const memberKey = message.author;
      if (memberMap.has(memberKey)) {
        const existing = memberMap.get(memberKey);
        existing.messageCount++;
        existing.lastSeen = Math.max(existing.lastSeen, message.timestamp);
      } else {
        memberMap.set(memberKey, {
          author: message.author,
          authorName: message.authorName || message.author,
          messageCount: 1,
          lastSeen: message.timestamp,
          role: ''
        });
      }
    });

    // Convert map to array and sort by message count
    const members = Array.from(memberMap.values()).sort((a, b) => b.messageCount - a.messageCount);

    return members;
  }

  async uploadChatHistory(groupId: string, content: string) {
    try {
      console.log(`📤 Uploading chat history for group: ${groupId}`);
      console.log(`📄 Content length: ${content.length} characters`);

      // Parse WhatsApp chat export
      const parsedMessages = parseWhatsAppChat(content);
      console.log(`✅ Parsed ${parsedMessages.length} messages`);

      let messagesInserted = 0;

      // Insert each message into database
      for (const parsed of parsedMessages) {
        const message: Message = {
          id: `${groupId}_${parsed.timestamp}_${parsed.author}`,
          groupId,
          author: parsed.author,
          authorName: parsed.authorName,
          timestamp: parsed.timestamp,
          text: parsed.text,
          raw: JSON.stringify({ imported: true, originalTimestamp: parsed.timestamp })
        };

        const inserted = await this.db.insertMessage(message);
        if (inserted) {
          messagesInserted++;
        }
      }

      console.log(`💾 Inserted ${messagesInserted} messages into database`);

      // Mark group as having history uploaded
      const updated = await this.db.updateGroupHistoryStatus(groupId, true);
      console.log(`📊 Updated group history status: ${updated}`);

      this.db.auditLog('CHAT_HISTORY_UPLOADED', `Uploaded ${messagesInserted} messages for group ${groupId}`);

      // Emit event to refresh groups in UI
      const groups = await this.db.getGroups();
      this.emit('groupsUpdated', groups);
      console.log(`🔄 Emitted groupsUpdated event`);

      return {
        success: true,
        messagesProcessed: parsedMessages.length,
        messagesInserted
      };
    } catch (error) {
      console.error('❌ Failed to upload chat history:', error);
      throw error;
    }
  }

  async getMilestones() {
    return this.db.getMilestones();
  }

  async generateSnapshot(since?: number): Promise<SnapshotReport> {
    // Reload context if it has changed
    await this.loadProjectContext();

    return this.snapshotGenerator.generateSnapshot(since);
  }

  async exportSnapshot(report: SnapshotReport, format: 'json' | 'markdown'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    } else {
      return this.snapshotGenerator.formatAsMarkdown(report);
    }
  }

  getStats() {
    return this.db.getStats();
  }

  getAuditLogs(limit = 100) {
    return this.db.getAuditLogs(limit);
  }

  async refreshGroups(): Promise<Group[]> {
    if (this.whatsappClient.isConnected()) {
      const groups = await this.whatsappClient.getGroups();
      for (const group of groups) {
        await this.db.upsertGroup(group);
      }
      // Return groups from database to include all fields (history status, etc.)
      const dbGroups = await this.db.getGroups();
      this.emit('groupsUpdated', dbGroups);
      return dbGroups;
    }
    return await this.db.getGroups();
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  async getGroupContext(groupId: string) {
    return await this.db.getGroupContext(groupId);
  }

  async updateGroupContext(groupId: string, context: string) {
    return await this.db.updateGroupContext(groupId, context);
  }

  async deleteGroupContext(groupId: string) {
    return await this.db.deleteGroupContext(groupId);
  }

  async generateGroupReport(groupId: string, timeframe: number = 30) {
    // Stub for now - can implement AI-powered reports later
    const messages = await this.db.getMessages(groupId, Date.now() - (timeframe * 24 * 60 * 60 * 1000), 1000);
    return {
      groupId,
      timeframe,
      messageCount: messages.length,
      summary: `${messages.length} messages in the last ${timeframe} days`
    };
  }

  // AI Chat methods

  async chatWithAI(groupId: string, question: string, apiKey?: string) {
    // Set API key if provided
    if (apiKey && apiKey !== this.config.geminiApiKey) {
      this.aiService.setApiKey(apiKey);
    } else if (this.config.geminiApiKey) {
      this.aiService.setApiKey(this.config.geminiApiKey);
    }

    if (!this.aiService.hasApiKey()) {
      throw new Error('AI service not configured. Please provide a Gemini API key in settings.');
    }

    // Get group messages
    const messages = await this.db.getMessages(groupId, undefined, 100);

    // Get group context
    const contextData = await this.db.getGroupContext(groupId);

    return await this.aiService.chat({
      question,
      context: contextData.context,
      groupMessages: messages,
      apiKey
    });
  }

  async testAIConnection(apiKey?: string) {
    if (apiKey) {
      this.aiService.setApiKey(apiKey);
    } else if (this.config.geminiApiKey) {
      this.aiService.setApiKey(this.config.geminiApiKey);
    }

    return await this.aiService.testConnection();
  }

  setGeminiApiKey(apiKey: string) {
    this.aiService.setApiKey(apiKey);
    this.config.geminiApiKey = apiKey;
  }

  async sendMessage(groupId: string, message: string): Promise<boolean> {
    if (!this.whatsappClient.isConnected()) {
      throw new Error('WhatsApp is not connected. Please connect first.');
    }

    this.db.auditLog('MESSAGE_SENT', `Sent message to group ${groupId}: ${message.substring(0, 50)}...`);
    return await this.whatsappClient.sendMessage(groupId, message);
  }
}