import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Client, LocalAuth } = require('whatsapp-web.js');
import QRCode from 'qrcode-terminal';
import { EventEmitter } from 'events';
import type { WhatsAppConnectionState, Group, Message } from '@aipm/shared';
import { eventBus } from '@aipm/event-bus';
import type { MessageDelta } from './types/timeline.js';

// Event constants
const Events = {
  QR_RECEIVED: 'qr',
  AUTHENTICATED: 'authenticated',
  READY: 'ready',
  DISCONNECTED: 'disconnected',
  AUTH_FAILURE: 'auth_failure',
  MESSAGE_RECEIVED: 'message_create'
};

export interface WhatsAppClientEvents {
  connectionStateChanged: (state: WhatsAppConnectionState) => void;
  message: (message: Message) => void;
  groupsUpdated: (groups: Group[]) => void;
}

export class WhatsAppClient extends EventEmitter {
  private client: any;
  private connectionState: WhatsAppConnectionState = { status: 'DISCONNECTED' };
  private sessionPath: string;

  constructor(sessionPath: string) {
    super();
    this.sessionPath = sessionPath;
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'statuz-client',
        dataPath: sessionPath
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          // Removed --single-process (causes "Execution context was destroyed" errors)
          '--disable-gpu',
          '--disable-extensions',
          '--disable-software-rasterizer',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        timeout: 60000, // 60 second timeout for browser operations
      },
      // Add client options for better stability
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on(Events.QR_RECEIVED, (qr: string) => {
      this.updateConnectionState({ status: 'QR_REQUIRED', qrCode: qr });
      try {
        QRCode.generate(qr, { small: true });
      } catch (error) {
        // Ignore EPIPE errors in Electron when console is not available
        if ((error as any).code !== 'EPIPE') {
          console.error('Failed to generate QR code in terminal:', error);
        }
      }
    });

    this.client.on(Events.AUTHENTICATED, () => {
      this.updateConnectionState({ status: 'CONNECTING' });
    });

    this.client.on(Events.READY, async () => {
      this.updateConnectionState({ status: 'CONNECTED' });
      await this.loadGroups();
    });

    this.client.on(Events.DISCONNECTED, (reason: string) => {
      this.updateConnectionState({ status: 'DISCONNECTED', error: reason });
    });

    this.client.on(Events.AUTH_FAILURE, (message: string) => {
      this.updateConnectionState({ status: 'DISCONNECTED', error: `Authentication failed: ${message}` });
    });

    this.client.on(Events.MESSAGE_RECEIVED, async (message: any) => {
      try {
        console.log('📱 MESSAGE_RECEIVED event fired in WhatsApp client');

        if (message.fromMe) {
          console.log('⏭️  Skipping message from self');
          return;
        }

        const chat = await message.getChat();
        console.log(`📝 Message from chat: ${chat.name}, isGroup: ${chat.isGroup}`);

        if (!chat.isGroup) {
          console.log('⏭️  Skipping non-group message');
          return;
        }

        const contact = await message.getContact();
        console.log(`👤 Message author: ${contact.name || contact.pushname || 'Unknown'}`);

        const processedMessage: Message = {
          id: message.id._serialized,
          groupId: chat.id._serialized,
          author: contact.id._serialized,
          authorName: contact.name || contact.pushname || 'Unknown',
          timestamp: message.timestamp * 1000,
          text: message.body,
          raw: JSON.stringify({
            id: message.id,
            type: message.type,
            timestamp: message.timestamp,
            hasMedia: message.hasMedia,
            isForwarded: message.isForwarded
          })
        };

        console.log(`🚀 Emitting 'message' event for group: ${chat.name}`);
        this.emit('message', processedMessage);

        // Emit timeline delta for timeline engine
        const delta: MessageDelta = {
          groupId: chat.id._serialized,
          author: contact.id._serialized,
          authorName: contact.name || contact.pushname || undefined,
          text: message.body,
          timestamp: message.timestamp * 1000,
          isFromMe: false
        };
        eventBus.emit('timeline:messageDelta', delta);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Handle execution context destroyed errors gracefully
        if (errorMessage.includes('Execution context was destroyed') ||
            errorMessage.includes('Protocol error')) {
          console.warn('⚠️  Page context destroyed during message processing, skipping message');
        } else {
          console.error('❌ Error processing message:', error);
        }
      }
    });
  }

  private updateConnectionState(newState: WhatsAppConnectionState) {
    this.connectionState = { ...this.connectionState, ...newState };
    this.emit('connectionStateChanged', this.connectionState);
  }

  private async loadGroups() {
    try {
      console.log('🔄 loadGroups() called on READY event');
      const chats = await this.client.getChats();
      console.log(`📡 loadGroups: Received ${chats.length} chats from WhatsApp`);

      const groups: Group[] = chats
        .filter((chat: any) => chat.isGroup)
        .map((chat: any) => ({
          id: chat.id._serialized,
          name: chat.name,
          isWatched: false
        }));

      console.log(`✅ loadGroups: Emitting ${groups.length} groups`);
      this.emit('groupsUpdated', groups);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Handle execution context destroyed errors
      if (errorMessage.includes('Execution context was destroyed') ||
          errorMessage.includes('Protocol error')) {
        console.warn('⚠️  Page context destroyed during loadGroups, will retry on next ready event');
        this.updateConnectionState({
          status: 'RECONNECTING',
          error: 'Connection interrupted, reconnecting...'
        });
      } else {
        console.error('❌ Failed to load groups:', error);
      }
    }
  }

  async initialize() {
    try {
      console.log('🔄 Initializing WhatsApp client...');
      console.log('⏳ This may take a few minutes on first run (downloading Chromium)');
      this.updateConnectionState({ status: 'CONNECTING' });
      await this.client.initialize();
      console.log('✅ WhatsApp client initialization complete');
    } catch (error) {
      console.error('❌ WhatsApp client initialization failed:', error);
      this.updateConnectionState({
        status: 'DISCONNECTED',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async destroy() {
    try {
      await this.client.destroy();
      this.updateConnectionState({ status: 'DISCONNECTED' });
    } catch (error) {
      console.error('Error destroying WhatsApp client:', error);
    }
  }

  getConnectionState(): WhatsAppConnectionState {
    return this.connectionState;
  }

  async getGroups(): Promise<Group[]> {
    console.log('🔍 getGroups() called. Connection status:', this.connectionState.status);

    if (this.connectionState.status !== 'CONNECTED') {
      console.log('❌ Not connected, returning empty array');
      return [];
    }

    try {
      console.log('📡 Fetching chats from WhatsApp client...');
      const chats = await this.client.getChats();
      console.log(`✅ Received ${chats.length} chats from WhatsApp`);

      const groupChats = chats.filter((chat: any) => chat.isGroup);
      console.log(`📊 Found ${groupChats.length} group chats out of ${chats.length} total chats`);

      const groups = groupChats.map((chat: any) => ({
        id: chat.id._serialized,
        name: chat.name,
        isWatched: false
      }));

      console.log(`✅ Returning ${groups.length} groups:`, groups.slice(0, 5).map((g: Group) => g.name));
      return groups;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Handle execution context destroyed errors
      if (errorMessage.includes('Execution context was destroyed') ||
          errorMessage.includes('Protocol error')) {
        console.warn('⚠️  Page context destroyed during getGroups, marking as reconnecting');
        this.updateConnectionState({
          status: 'RECONNECTING',
          error: 'Connection interrupted, reconnecting...'
        });
      } else {
        console.error('❌ Failed to get groups:', error);
      }
      return [];
    }
  }

  isConnected(): boolean {
    return this.connectionState.status === 'CONNECTED';
  }

  async sendMessage(groupId: string, message: string): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error('WhatsApp is not connected. Please wait for connection.');
    }

    try {
      console.log(`📤 Sending message to group ${groupId}: "${message}"`);
      await this.client.sendMessage(groupId, message);
      console.log('✅ Message sent successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Handle execution context destroyed errors
      if (errorMessage.includes('Execution context was destroyed') ||
          errorMessage.includes('Protocol error')) {
        console.error('❌ Connection lost while sending message');
        this.updateConnectionState({
          status: 'RECONNECTING',
          error: 'Connection interrupted, reconnecting...'
        });
        throw new Error('Connection lost. Please wait for reconnection and try again.');
      } else {
        console.error('❌ Failed to send message:', error);
        throw new Error(errorMessage || 'Failed to send message');
      }
    }
  }
}