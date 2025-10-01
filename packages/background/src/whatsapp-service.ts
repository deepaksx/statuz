#!/usr/bin/env node
/**
 * Standalone WhatsApp Service
 * Runs as a separate process and communicates via HTTP API
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Client, LocalAuth } = require('whatsapp-web.js');
import QRCode from 'qrcode-terminal';
import express from 'express';
import cors from 'cors';
import { join } from 'path';

const app = express();
app.use(cors());
app.use(express.json());

let whatsappClient: any = null;
let connectionState = {
  status: 'DISCONNECTED',
  qrCode: null as string | null,
  message: null as string | null
};

// Initialize WhatsApp client
function initializeWhatsApp(sessionPath: string) {
  if (whatsappClient) {
    console.log('WhatsApp client already initialized');
    return;
  }

  console.log('🔄 Initializing WhatsApp client...');
  console.log('📁 Session path:', sessionPath);

  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      clientId: 'statuz-whatsapp-service',
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
        '--disable-gpu'
      ]
    }
  });

  // QR Code event
  whatsappClient.on('qr', (qr: string) => {
    console.log('📱 QR Code received!');
    QRCode.generate(qr, { small: true });
    connectionState = {
      status: 'QR_REQUIRED',
      qrCode: qr,
      message: 'Scan QR code with WhatsApp mobile app'
    };
  });

  // Authenticated event
  whatsappClient.on('authenticated', () => {
    console.log('✅ Authenticated!');
    connectionState = {
      status: 'CONNECTING',
      qrCode: null,
      message: 'Authentication successful'
    };
  });

  // Ready event
  whatsappClient.on('ready', async () => {
    console.log('✅ WhatsApp client is ready!');
    connectionState = {
      status: 'CONNECTED',
      qrCode: null,
      message: 'Connected to WhatsApp'
    };
  });

  // Disconnected event
  whatsappClient.on('disconnected', (reason: string) => {
    console.log('❌ Disconnected:', reason);
    connectionState = {
      status: 'DISCONNECTED',
      qrCode: null,
      message: `Disconnected: ${reason}`
    };
  });

  // Auth failure event
  whatsappClient.on('auth_failure', (msg: string) => {
    console.log('❌ Authentication failed:', msg);
    connectionState = {
      status: 'DISCONNECTED',
      qrCode: null,
      message: `Auth failed: ${msg}`
    };
  });

  // Initialize
  connectionState = {
    status: 'CONNECTING',
    qrCode: null,
    message: 'Initializing WhatsApp client...'
  };

  whatsappClient.initialize().catch((error: Error) => {
    console.error('❌ Failed to initialize:', error);
    connectionState = {
      status: 'DISCONNECTED',
      qrCode: null,
      message: `Failed: ${error.message}`
    };
  });
}

// API endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/connection-state', (req, res) => {
  res.json(connectionState);
});

app.post('/start', (req, res) => {
  const { sessionPath } = req.body;

  if (!sessionPath) {
    return res.status(400).json({ error: 'sessionPath is required' });
  }

  try {
    initializeWhatsApp(sessionPath);
    res.json({ success: true, message: 'WhatsApp service starting...' });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/stop', async (req, res) => {
  if (whatsappClient) {
    try {
      await whatsappClient.destroy();
      whatsappClient = null;
      connectionState = {
        status: 'DISCONNECTED',
        qrCode: null,
        message: 'Service stopped'
      };
      res.json({ success: true, message: 'WhatsApp service stopped' });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.json({ success: true, message: 'Service was not running' });
  }
});

app.get('/groups', async (req, res) => {
  if (!whatsappClient || connectionState.status !== 'CONNECTED') {
    return res.status(503).json({ error: 'WhatsApp not connected' });
  }

  try {
    const chats = await whatsappClient.getChats();
    const groups = chats
      .filter((chat: any) => chat.isGroup)
      .map((chat: any) => ({
        id: chat.id._serialized,
        name: chat.name,
        isWatched: false
      }));

    res.json(groups);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
const PORT = process.env.WHATSAPP_SERVICE_PORT || 3002;

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 WhatsApp Standalone Service');
  console.log(`📡 API running on http://localhost:${PORT}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET  /health - Health check`);
  console.log(`  GET  /connection-state - Get current connection state`);
  console.log(`  POST /start - Start WhatsApp client (body: {sessionPath})`);
  console.log(`  POST /stop - Stop WhatsApp client`);
  console.log(`  GET  /groups - Get WhatsApp groups`);
  console.log('');
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️  Shutting down...');
  if (whatsappClient) {
    await whatsappClient.destroy();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹️  Shutting down...');
  if (whatsappClient) {
    await whatsappClient.destroy();
  }
  process.exit(0);
});
