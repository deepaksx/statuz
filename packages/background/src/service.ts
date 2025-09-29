import { EventEmitter } from 'events';
import { join } from 'path';
import { existsSync } from 'fs';
import { StatuzDatabase } from '@statuz/db';
import { WhatsAppClient } from './whatsapp-client.js';
import { MessageExtractor } from './extraction/extractor.js';
import { ContextLoader } from './context/loader.js';
import { SnapshotGenerator } from './snapshot/generator.js';
import type {
  WhatsAppConnectionState,
  Group,
  Message,
  Signal,
  ProjectContext,
  SnapshotReport,
  AppConfig
} from '@statuz/shared';

export interface BackgroundServiceEvents {
  connectionStateChanged: (state: WhatsAppConnectionState) => void;
  messageProcessed: (message: Message, signals: Signal[]) => void;
  groupsUpdated: (groups: Group[]) => void;
  contextUpdated: (context: ProjectContext) => void;
  error: (error: Error) => void;
}

export class BackgroundService extends EventEmitter {
  private db: StatuzDatabase;
  private whatsappClient: WhatsAppClient;
  private extractor: MessageExtractor;
  private contextLoader: ContextLoader;
  private snapshotGenerator: SnapshotGenerator;
  private config: AppConfig;
  private isRunning = false;
  private contextChecksum = '';

  constructor(config: AppConfig) {
    super();
    this.config = config;

    // Initialize database
    const dbPath = join(config.dataDirectory, 'statuz.db');
    this.db = new StatuzDatabase(dbPath);

    // Initialize WhatsApp client
    const sessionPath = join(config.dataDirectory, 'whatsapp-session');
    this.whatsappClient = new WhatsAppClient(sessionPath);

    // Initialize other components
    this.extractor = new MessageExtractor();
    this.contextLoader = new ContextLoader(join(process.cwd(), 'context'));
    this.snapshotGenerator = new SnapshotGenerator(this.db);

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
        this.db.upsertGroup(group);
      }
      this.emit('groupsUpdated', groups);
    });
  }

  async start() {
    if (this.isRunning) return;

    try {
      this.isRunning = true;

      // Load project context
      await this.loadProjectContext();

      // Start WhatsApp client
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
        this.extractor.setContext(context);

        // Update milestones in database
        for (const milestoneData of context.milestones) {
          const milestone = {
            ...milestoneData,
            status: 'NOT_STARTED' as const,
            lastUpdateTs: Date.now()
          };
          this.db.upsertMilestone(milestone);
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
      // Check if the message is from a watched group
      const group = this.db.getGroups().find(g => g.id === message.groupId && g.isWatched);
      if (!group) return;

      // Store message in database
      const inserted = this.db.insertMessage(message);
      if (!inserted) return; // Message already exists

      // Extract signals from message
      const signals = this.extractor.extractSignals(message);

      // Store signals in database
      for (const signal of signals) {
        this.db.insertSignal(signal);
      }

      this.emit('messageProcessed', message, signals);
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
    const success = this.db.updateGroupWatchStatus(groupId, isWatched);
    if (success) {
      const groups = this.db.getGroups();
      this.emit('groupsUpdated', groups);
    }
    return success;
  }

  async getMessages(groupId?: string, since?: number, limit?: number): Promise<Message[]> {
    return this.db.getMessages(groupId, since, limit);
  }

  async getSignals(kind?: string, since?: number, limit?: number): Promise<Signal[]> {
    return this.db.getSignals(kind, since, limit);
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
        this.db.upsertGroup(group);
      }
      this.emit('groupsUpdated', groups);
      return groups;
    }
    return this.db.getGroups();
  }

  isRunning(): boolean {
    return this.isRunning;
  }
}