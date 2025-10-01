# Statuz - Architecture & Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Core Components](#core-components)
6. [Data Flow](#data-flow)
7. [Features](#features)
8. [Database Schema](#database-schema)
9. [Development Guide](#development-guide)
10. [Troubleshooting](#troubleshooting)

---

## Overview

**Statuz** is a desktop application built with Electron that monitors WhatsApp groups and provides AI-powered insights, auto-responses, and project status tracking. It runs entirely locally on your machine, ensuring complete privacy and data security.

### Key Capabilities
- Monitor multiple WhatsApp groups simultaneously
- Store and analyze message history locally
- AI-powered chat assistance with Google Gemini
- Automatic AI responses to user questions
- Contact management with aliases and roles
- Message export and reporting
- Privacy-focused: all data stored locally

---

## Architecture

Statuz follows a **monorepo architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                 │
│  ┌─────────────┐    ┌──────────────┐   ┌────────────┐  │
│  │   Desktop   │───▶│  Background  │◀──│  WhatsApp  │  │
│  │     App     │    │   Service    │   │   Client   │  │
│  └──────┬──────┘    └──────┬───────┘   └────────────┘  │
│         │                  │                            │
│         │ IPC              │ Events                     │
└─────────┼──────────────────┼────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│              Electron Renderer Process                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │   React  │  │   Pages  │  │ Context  │              │
│  │    UI    │◀─│ (Routes) │◀─│   API    │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
          ▲
          │
┌─────────┴─────────┐
│  Local Database   │
│   (SQLite)        │
└───────────────────┘
```

### Process Separation

1. **Main Process** (`apps/desktop`)
   - Manages Electron app lifecycle
   - Creates and controls browser windows
   - Handles IPC (Inter-Process Communication)
   - Initializes background services
   - Manages configuration and database

2. **Renderer Process** (`apps/renderer`)
   - React-based user interface
   - Communicates with main process via IPC
   - Displays real-time updates
   - Handles user interactions

3. **Background Service** (`packages/background`)
   - Manages WhatsApp connection
   - Processes incoming messages
   - Handles auto-responses
   - Integrates with AI services

---

## Technology Stack

### Frontend
- **Electron**: Desktop application framework
- **React 18**: UI library with hooks
- **TypeScript**: Type-safe development
- **React Router**: Client-side routing
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library
- **React Hot Toast**: Notifications
- **date-fns**: Date formatting

### Backend
- **Node.js**: JavaScript runtime
- **whatsapp-web.js**: WhatsApp Web API client
- **Puppeteer**: Browser automation for WhatsApp
- **SQLite3**: Local database
- **better-sqlite3**: Synchronous SQLite wrapper

### AI Integration
- **Google Gemini API**: AI chat and auto-responses
- **@google/generative-ai**: Gemini SDK

### Build Tools
- **Vite**: Fast dev server and build tool
- **TypeScript Compiler**: Type checking
- **npm workspaces**: Monorepo management
- **Concurrently**: Run multiple dev processes

---

## Project Structure

```
statuz/
├── apps/
│   ├── desktop/                 # Electron main process
│   │   └── src/
│   │       ├── main.ts          # App entry point
│   │       └── preload.ts       # Preload script for IPC
│   │
│   └── renderer/                # React UI (renderer process)
│       └── src/
│           ├── components/      # Reusable UI components
│           ├── contexts/        # React context providers
│           ├── pages/          # Route pages
│           └── main.tsx        # React entry point
│
├── packages/
│   ├── background/             # Background service logic
│   │   └── src/
│   │       ├── service.ts      # Main background service
│   │       ├── whatsapp-client.ts  # WhatsApp integration
│   │       └── ai-service.ts   # AI integration
│   │
│   ├── db/                     # Database layer
│   │   └── src/
│   │       ├── database.ts     # Database operations
│   │       └── schema.ts       # Table definitions
│   │
│   └── shared/                 # Shared types and utilities
│       └── src/
│           └── types.ts        # TypeScript interfaces
│
├── dist/                       # Compiled output
├── check-db.cjs               # Database inspection utility
├── DIRECT_START.bat           # Development startup script
└── package.json               # Root package config
```

---

## Core Components

### 1. Desktop App (`apps/desktop/src/main.ts`)

**Responsibilities:**
- Initialize Electron application
- Create and manage browser windows
- Setup IPC handlers for renderer communication
- Load configuration (including API keys from database)
- Initialize and manage background service
- Handle app lifecycle events

**Key Methods:**
- `loadConfig()`: Loads app configuration including Gemini API key from database
- `loadApiKeyAsync()`: Asynchronously loads API key from database before service init
- `saveConfigToDatabase()`: Persists configuration to SQLite database
- `setupIpcHandlers()`: Registers IPC message handlers
- `handleIpcMessage()`: Routes IPC messages to appropriate handlers
- `initializeBackgroundService()`: Creates and starts background service
- `cleanup()`: Gracefully stops services on app quit

**IPC Handlers:**
```typescript
- get-connection-state
- get-groups
- update-group-watch-status
- update-group-auto-response
- refresh-groups
- get-messages
- get-group-members
- upload-chat-history
- get-milestones
- generate-snapshot
- export-snapshot
- get-stats
- get-config
- update-config
- set-gemini-api-key
- send-message
- get-contacts
- upsert-contact
- delete-contact
- get-authors-from-watched-groups
- restart-service
- ai-chat
- test-ai-connection
- generate-group-report
- get-group-context
- update-group-context
- delete-group-context
```

### 2. Background Service (`packages/background/src/service.ts`)

**Responsibilities:**
- Manage WhatsApp client connection
- Process incoming messages from watched groups
- Store messages in database
- Handle auto-response feature
- Integrate with AI services
- Manage contact caching for performance

**Key Features:**

#### WhatsApp Connection
```typescript
// Connects to WhatsApp Web using puppeteer
await this.whatsappClient.initialize();

// Events emitted:
- 'connectionStateChanged': Connection status updates
- 'messageProcessed': New message received and stored
- 'groupsUpdated': Group list refreshed
- 'error': Error occurred
```

#### Message Processing Flow
```typescript
1. WhatsApp client emits 'message' event
2. service.ts receives message
3. Check if message is from watched group
4. Store message in database
5. Check for auto-response trigger
6. If triggered, get AI answer and send response
```

#### Auto-Response Logic
```typescript
// Located in checkAndRespondToMessage()
1. Check if group has auto-response enabled
2. Check if message contains trigger (default: "NXSYS_AI")
3. Extract question after trigger keyword
4. Call Gemini API directly for answer
5. Format response with @mention
6. Send response back to WhatsApp group
```

#### Contact Caching
- Caches all contacts for 5 minutes
- Reduces database queries for better performance
- Automatically invalidates on contact modifications

### 3. WhatsApp Client (`packages/background/src/whatsapp-client.ts`)

**Responsibilities:**
- Initialize WhatsApp Web session using Puppeteer
- Handle QR code authentication
- Listen for incoming messages
- Send messages to groups
- Fetch group information and members

**Authentication Flow:**
```typescript
1. Launch Puppeteer browser in headless mode
2. Initialize whatsapp-web.js client
3. Listen for 'qr' event → Emit QR code for user to scan
4. Listen for 'ready' event → Connection established
5. Save session data to .wwebjs_auth for persistence
```

**Key Methods:**
- `initialize()`: Start WhatsApp client
- `sendMessage()`: Send text to group
- `fetchGroups()`: Get all group chats
- `fetchGroupMembers()`: Get members of specific group
- `destroy()`: Clean shutdown

### 4. Database (`packages/db/src/database.ts`)

**Responsibilities:**
- Manage SQLite database connection
- Define and execute queries
- Handle migrations
- Provide CRUD operations for all entities

**Tables:**
- `groups`: WhatsApp group metadata
- `messages`: Message history
- `milestones`: Project milestones
- `config`: App configuration (API keys, etc.)
- `audit`: Audit log for tracking actions
- `group_context`: AI context per group
- `contacts`: Contact aliases and roles

**Key Methods:**
```typescript
// Groups
- getGroups(): Get all groups
- upsertGroup(): Create/update group
- updateGroupWatchStatus(): Toggle group monitoring
- updateGroupAutoResponse(): Toggle auto-response

// Messages
- insertMessage(): Store new message
- getMessages(): Query messages with filters

// Config
- getConfig(): Get config value by key
- setConfig(): Set config value

// Contacts
- getContacts(): Get all contacts
- upsertContact(): Create/update contact
- deleteContact(): Remove contact
```

### 5. React UI (`apps/renderer/src`)

**App Context (`contexts/AppContext.tsx`):**
- Centralized state management
- IPC communication wrapper
- Real-time updates via event listeners
- Provides hooks for all features

**Pages:**
1. **Dashboard** (`pages/Dashboard.tsx`)
   - Overview of watched groups
   - Recent activity
   - Quick stats

2. **Groups** (`pages/Groups.tsx`)
   - List all WhatsApp groups
   - Toggle watch status
   - Enable/disable auto-response
   - View group details

3. **Messages** (`pages/Messages.tsx`)
   - View messages from watched groups
   - Filter by group
   - Chronological message history

4. **Contacts** (`pages/Contacts.tsx`)
   - Manage contact aliases
   - Assign roles
   - Add notes

5. **Settings** (`pages/Settings.tsx`)
   - Configure Gemini API key
   - Test API connection
   - View database stats
   - Data management

**Components:**
- `Layout.tsx`: Main app layout with sidebar
- Connection status indicator
- Navigation menu
- Version display

---

## Data Flow

### 1. Message Reception Flow
```
WhatsApp → Puppeteer → whatsapp-web.js → WhatsAppClient
    ↓
BackgroundService.processMessage()
    ↓
Check if group is watched?
    ↓ YES
Database.insertMessage()
    ↓
Check auto-response enabled?
    ↓ YES
Contains trigger keyword?
    ↓ YES
getDirectAIAnswer() → Google Gemini API
    ↓
Format with @mention
    ↓
WhatsAppClient.sendMessage() → WhatsApp
```

### 2. User Action Flow (e.g., Toggle Watch Status)
```
User clicks "Watch" button
    ↓
React Component calls updateGroupWatchStatus()
    ↓
AppContext.updateGroupWatchStatus()
    ↓
IPC: invoke('update-group-watch-status', {groupId, isWatched})
    ↓
Main Process: handleIpcMessage()
    ↓
BackgroundService.updateGroupWatchStatus()
    ↓
Database.updateGroupWatchStatus()
    ↓
Emit 'groupsUpdated' event
    ↓
Renderer receives event → UI updates
```

### 3. Auto-Response Flow
```
User sends: "NXSYS_AI what is 2+2?"
    ↓
Message received by BackgroundService
    ↓
checkAndRespondToMessage()
    ↓
Extract question: "what is 2+2?"
    ↓
getDirectAIAnswer("what is 2+2?")
    ↓
Google Gemini API call
    ↓
Response: "4"
    ↓
Format: "@User 4"
    ↓
Send to WhatsApp group
```

---

## Features

### 1. Group Monitoring

**How it works:**
- User selects groups to watch from Groups page
- Only watched groups have messages stored in database
- Real-time message capture when groups are watched
- Messages persist across app restarts

**Implementation:**
```typescript
// Database column
groups.is_watched (0 or 1)

// Toggle watch
await updateGroupWatchStatus(groupId, true);

// Message processing checks watch status
const group = groups.find(g => g.id === message.groupId && g.isWatched);
if (!group) return; // Skip if not watched
```

### 2. Auto-Response with AI

**How it works:**
- Enabled per-group via Auto-AI toggle
- Default trigger: "NXSYS_AI"
- Extracts question after trigger
- Calls Gemini API directly (no conversation context)
- Responds with @mention to user

**Configuration:**
```typescript
// Database columns
groups.auto_response_enabled (0 or 1)
groups.auto_response_trigger (default: 'NXSYS_AI')

// Enable for group
await updateGroupAutoResponse(groupId, true, 'NXSYS_AI');
```

**Example Usage:**
```
User: "NXSYS_AI what is the capital of France?"
Bot:  "@User Paris is the capital of France."
```

### 3. AI Chat Assistant

**How it works:**
- Available in Groups page
- Analyzes last 30 messages from group
- Uses contact aliases for privacy
- Answers questions about group activity

**Implementation:**
```typescript
// Load recent messages
const messages = await getMessages(groupId, undefined, 30);

// Get contact aliases
const contacts = await getContacts();

// Replace phone numbers with aliases
const maskedMessages = messages.map(m => ({
  ...m,
  authorName: contacts[m.author]?.alias || m.authorName
}));

// Send to Gemini with context
const response = await chatWithAI(groupId, question, apiKey);
```

### 4. Contact Management

**Purpose:**
- Assign aliases to phone numbers for privacy
- Define roles (e.g., "Developer", "Manager")
- Add notes about contacts

**Privacy Mode:**
- When enabled, phone numbers replaced with aliases in AI queries
- Protects identity of group members
- Configurable per contact

### 5. Message Export

**Formats:**
- JSON: Machine-readable format
- Markdown: Human-readable reports

**What's Exported:**
- Group name and metadata
- Message history with timestamps
- Author information (with aliases if privacy mode enabled)
- Statistics and summaries

---

## Database Schema

### groups
```sql
CREATE TABLE groups (
  id TEXT PRIMARY KEY,                -- WhatsApp group ID
  name TEXT NOT NULL,                 -- Group name
  is_watched INTEGER DEFAULT 0,       -- 1 if being monitored
  has_history_uploaded INTEGER DEFAULT 0,
  history_uploaded_at INTEGER,
  auto_response_enabled INTEGER DEFAULT 0,  -- 1 if auto-response enabled
  auto_response_trigger TEXT DEFAULT 'NXSYS_AI'  -- Trigger keyword
);
```

### messages
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,                -- Message ID
  group_id TEXT NOT NULL,             -- Foreign key to groups
  author TEXT NOT NULL,               -- Phone number
  author_name TEXT,                   -- Display name
  text TEXT NOT NULL,                 -- Message content
  timestamp INTEGER NOT NULL,         -- Unix timestamp
  FOREIGN KEY (group_id) REFERENCES groups(id)
);
```

### config
```sql
CREATE TABLE config (
  key TEXT PRIMARY KEY,               -- Config key
  value TEXT NOT NULL                 -- Config value
);

-- Example row:
-- key: 'geminiApiKey'
-- value: 'AIza...'
```

### contacts
```sql
CREATE TABLE contacts (
  phone_number TEXT PRIMARY KEY,      -- WhatsApp phone number
  alias TEXT,                         -- Display alias
  role TEXT,                          -- Role/title
  notes TEXT,                         -- Additional notes
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### group_context
```sql
CREATE TABLE group_context (
  group_id TEXT PRIMARY KEY,          -- Foreign key to groups
  context TEXT NOT NULL,              -- AI context/instructions
  context_updated_at INTEGER,
  FOREIGN KEY (group_id) REFERENCES groups(id)
);
```

### audit
```sql
CREATE TABLE audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  kind TEXT NOT NULL,                 -- Action type
  detail TEXT NOT NULL                -- Action details
);
```

---

## Development Guide

### Prerequisites
- Node.js 18+ and npm
- Git
- Windows/macOS/Linux

### Setup
```bash
# Clone repository
git clone https://github.com/deepaksx/statuz.git
cd statuz

# Install dependencies
npm install

# Build all packages
npm run build

# Run in development mode
DIRECT_START.bat  # Windows
# Or manually:
# Terminal 1: cd apps/renderer && npm run dev
# Terminal 2: cd packages/background && npm run dev
# Terminal 3: npx electron dist/main/main.js
```

### Development Workflow

1. **Start Dev Servers**
   ```bash
   # Start Vite dev server (port 5173)
   cd apps/renderer
   npm run dev
   ```

2. **Build TypeScript**
   ```bash
   # Build specific package
   cd packages/background
   npm run build

   # Or build all
   npm run build  # from root
   ```

3. **Run Electron**
   ```bash
   # From root
   set NODE_ENV=development
   npx electron dist/main/main.js
   ```

4. **Debug**
   - Main process: Check terminal console
   - Renderer: Open DevTools (Cmd/Ctrl + Shift + I)
   - Database: Use `node check-db.cjs`

### Building for Production
```bash
# Build all packages
npm run build

# Build renderer
cd apps/renderer
npm run build

# Package with electron-builder (to be configured)
npm run package
```

### Code Style
- TypeScript strict mode enabled
- ESLint for linting
- Prettier for formatting
- Follow existing patterns

---

## Troubleshooting

### WhatsApp Connection Issues

**Problem:** "WhatsApp stuck in 'Connecting' state"
```bash
# Solution: Clear WhatsApp session
1. Close app
2. Delete: C:\Users\[USER]\AppData\Roaming\Electron\data\.wwebjs_auth
3. Delete: C:\Users\[USER]\AppData\Roaming\Electron\data\.wwebjs_cache
4. Restart app
5. Scan QR code again
```

**Problem:** "Puppeteer crashes or errors"
```bash
# Solution: Reinstall whatsapp-web.js
npm install whatsapp-web.js --force
```

### Database Issues

**Problem:** "Database locked" or "SQLITE_CANTOPEN"
```bash
# Solution: Check database path and permissions
node check-db.cjs  # Inspect database
# Ensure path exists: C:\Users\[USER]\AppData\Roaming\Electron\data\
```

**Problem:** "API key not persisting"
```bash
# Solution: Verify database save
1. Go to Settings
2. Save API key
3. Check console for: "✅ Saved geminiApiKey to database"
4. Restart app
5. Check console for: "✅ Loaded Gemini API key from database"
```

### Auto-Response Not Working

**Checklist:**
1. ✅ Group has auto-response enabled (green Auto-AI button)
2. ✅ Gemini API key saved to database
3. ✅ API key loaded on startup (check console)
4. ✅ WhatsApp is connected
5. ✅ Message contains trigger: "NXSYS_AI [question]"
6. ✅ Group is watched

**Debug Console Logs:**
```
🔍 Checking auto-response for group: [GroupName], enabled: true
🔍 Checking message for trigger "NXSYS_AI": "[MessageText]"
🤖 Auto-response triggered in group: [GroupName]
🔍 Processing auto-response question: "[Question]"
🤖 Getting direct AI answer for question
✅ Got AI response: [Answer]
👤 Author for mention: [AuthorName]
📤 Sending auto-response to group: [GroupName]
✅ Auto-response sent successfully!
```

### Performance Issues

**Problem:** "AI chat is slow"
- Contact cache: 5-minute TTL reduces DB queries
- Message limit: Only last 30 messages analyzed
- Direct API: Auto-response bypasses context loading

**Problem:** "App uses too much memory"
```bash
# Solution: Restart background service
1. Settings → Restart Service
2. Or close and reopen app
```

### Build Errors

**Problem:** "Module not found"
```bash
# Solution: Rebuild dependencies
npm install
npm run build
```

**Problem:** "TypeScript errors"
```bash
# Solution: Check types and rebuild
cd [package-with-error]
npm run build
```

---

## Configuration Files

### package.json (root)
```json
{
  "name": "statuz",
  "version": "2.1.0",
  "type": "module",
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

### apps/desktop/package.json
```json
{
  "name": "@statuz/desktop",
  "version": "2.1.0",
  "main": "dist/main.js",
  "dependencies": {
    "@statuz/background": "^2.1.0",
    "@statuz/shared": "^2.1.0",
    "electron": "^27.0.0"
  }
}
```

### Environment Variables
```bash
# Development mode
NODE_ENV=development

# Disable DevTools (production)
NO_DEVTOOLS=1
```

---

## Security & Privacy

### Data Storage
- **All data stored locally** in user's AppData folder
- **No external servers** except AI API calls (optional)
- **SQLite database** not encrypted (add encryption if needed)

### API Keys
- Stored in `config` table in database
- Loaded on app startup
- Never transmitted except to Gemini API
- User controls when AI features are used

### WhatsApp Session
- Stored in `.wwebjs_auth` folder
- Managed by whatsapp-web.js
- Delete folder to clear session

### Privacy Mode
- Replace phone numbers with aliases
- Mask identity in AI queries
- Optional per contact

---

## Future Enhancements

### Planned Features
- [ ] Encrypted database
- [ ] Multiple WhatsApp accounts
- [ ] Advanced filtering and search
- [ ] Scheduled reports
- [ ] Integration with other messaging platforms
- [ ] Team collaboration features
- [ ] Cloud sync (optional)

### Performance Improvements
- [ ] Lazy loading messages
- [ ] Virtual scrolling for large lists
- [ ] Background message processing
- [ ] Optimized AI context building

---

## Contributing

### Development Process
1. Fork repository
2. Create feature branch
3. Make changes
4. Build and test
5. Submit pull request

### Code Review Checklist
- [ ] TypeScript types defined
- [ ] Error handling implemented
- [ ] Console logs for debugging
- [ ] IPC handlers documented
- [ ] Database migrations if schema changed
- [ ] UI responsive and accessible

---

## License

Copyright © 2025 Deepak Saxena

---

## Support

- **Issues**: https://github.com/deepaksx/statuz/issues
- **Email**: [Your Email]
- **Documentation**: This file

---

**Last Updated**: January 2025
**Version**: 2.1.0
