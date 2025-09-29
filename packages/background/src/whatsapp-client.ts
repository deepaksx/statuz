import { Client, LocalAuth, Events } from 'whatsapp-web.js';
import QRCode from 'qrcode-terminal';
import { EventEmitter } from 'events';
import type { WhatsAppConnectionState, Group, Message } from '@statuz/shared';

export interface WhatsAppClientEvents {
  connectionStateChanged: (state: WhatsAppConnectionState) => void;
  message: (message: Message) => void;
  groupsUpdated: (groups: Group[]) => void;
}

export class WhatsAppClient extends EventEmitter {
  private client: Client;
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
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on(Events.QR_RECEIVED, (qr: string) => {
      this.updateConnectionState({ status: 'QR_REQUIRED', qrCode: qr });
      QRCode.generate(qr, { small: true });
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

    this.client.on(Events.MESSAGE_RECEIVED, async (message) => {
      if (message.fromMe) return;

      const chat = await message.getChat();
      if (!chat.isGroup) return;

      const contact = await message.getContact();

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

      this.emit('message', processedMessage);
    });
  }

  private updateConnectionState(newState: WhatsAppConnectionState) {
    this.connectionState = { ...this.connectionState, ...newState };
    this.emit('connectionStateChanged', this.connectionState);
  }

  private async loadGroups() {
    try {
      const chats = await this.client.getChats();
      const groups: Group[] = chats
        .filter(chat => chat.isGroup)
        .map(chat => ({
          id: chat.id._serialized,
          name: chat.name,
          isWatched: false
        }));

      this.emit('groupsUpdated', groups);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  }

  async initialize() {
    try {
      this.updateConnectionState({ status: 'CONNECTING' });
      await this.client.initialize();
    } catch (error) {
      console.error('WhatsApp client initialization failed:', error);
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
    if (this.connectionState.status !== 'CONNECTED') {
      return [];
    }

    try {
      const chats = await this.client.getChats();
      return chats
        .filter(chat => chat.isGroup)
        .map(chat => ({
          id: chat.id._serialized,
          name: chat.name,
          isWatched: false
        }));
    } catch (error) {
      console.error('Failed to get groups:', error);
      return [];
    }
  }

  isConnected(): boolean {
    return this.connectionState.status === 'CONNECTED';
  }
}