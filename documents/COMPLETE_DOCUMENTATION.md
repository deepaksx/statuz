# Statuz (AIPM) - Complete Technical Documentation

**Version:** 2.6.1
**Last Updated:** 2025-10-06
**Purpose:** Comprehensive documentation for AI agents to fully understand the Statuz application

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. [Core Features](#6-core-features)
7. [Data Flow](#7-data-flow)
8. [AI Integration](#8-ai-integration)
9. [Component Reference](#9-component-reference)
10. [API & IPC Channels](#10-api--ipc-channels)
11. [Build & Deployment](#11-build--deployment)
12. [Development Workflow](#12-development-workflow)
13. [Troubleshooting Guide](#13-troubleshooting-guide)
14. [Code Examples](#14-code-examples)
15. [Timeline Engine (Living Gantt)](#15-timeline-engine-living-gantt)

---

## 1. Project Overview

### 1.1 What is Statuz?

**Statuz (AIPM)** is an Electron-based desktop application that bridges WhatsApp group conversations with structured project management. It uses Google's Gemini AI to extract tasks, track milestones, and generate Gantt charts based on custom project context.

**Key Innovation**: Instead of analyzing thousands of messages, Statuz uses **user-defined context** to generate accurate project insights, tasks, and timelines.

### 1.2 Core Use Case

```
1. User creates WhatsApp group for project (e.g., "SAP Migration Project")
2. User connects Statuz to WhatsApp
3. User defines project context in Statuz (goals, scope, team, milestones)
4. User clicks "Extract" button
5. AI analyzes context (NOT messages) and generates:
   - Task list with assignments
   - Project metadata
   - Gantt chart timeline
6. User views and manages tasks in structured UI
```

### 1.3 Business Value

- **Time Savings**: No manual task tracking
- **Accuracy**: AI-driven extraction based on project context
- **Integration**: Works with existing WhatsApp workflows
- **Visibility**: Gantt charts for timeline visualization
- **SCRUM Support**: Sprint tracking, backlog management

### 1.4 Target Users

- Project Managers
- Development Teams
- SAP Consultants
- Any team using WhatsApp for project communication

---

## 2. Architecture

### 2.1 High-Level System Design

```
┌──────────────────────────────────────────────────────────────────┐
│                        ELECTRON APPLICATION                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐     │
│  │   MAIN      │      │  RENDERER   │      │ BACKGROUND  │     │
│  │  PROCESS    │◄────►│  (REACT)    │◄────►│   SERVICE   │     │
│  │             │ IPC  │             │ IPC  │             │     │
│  │ main.ts     │      │ App.tsx     │      │ service.ts  │     │
│  └─────┬───────┘      └──────┬──────┘      └─────┬───────┘     │
│        │                     │                    │             │
│        │                     │                    │             │
│        ▼                     ▼                    ▼             │
│  ┌──────────────────────────────────────────────────────┐      │
│  │                  SHARED LAYERS                        │      │
│  ├──────────────┬──────────────┬──────────────┬─────────┤      │
│  │  DATABASE    │  EVENT BUS   │    SHARED    │ AGENTS  │      │
│  │  (SQLite)    │              │    TYPES     │ (AI)    │      │
│  └──────────────┴──────────────┴──────────────┴─────────┘      │
│                                                                   │
└───────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │     EXTERNAL INTEGRATIONS             │
        ├────────────────┬─────────────────────┤
        │  WhatsApp Web  │  Google Gemini AI   │
        │  (via whatsapp-│  (gemini-2.5-flash- │
        │   web.js)      │   lite)             │
        └────────────────┴─────────────────────┘
```

### 2.2 Process Architecture

#### Main Process (`apps/desktop/src/main.ts`)
- **Responsibility**: Electron window lifecycle, IPC routing
- **Technologies**: Electron 27, Node.js
- **Entry Point**: `npm start` → `node start-app.cjs` → `electron dist/main/main.js`

#### Renderer Process (`apps/renderer/`)
- **Responsibility**: User interface, data presentation
- **Technologies**: React 18, Vite, Tailwind CSS
- **Entry Point**: `http://localhost:5173` (dev) or `dist/renderer/index.html` (prod)

#### Background Service (`packages/background/`)
- **Responsibility**: WhatsApp connection, message processing, AI integration
- **Technologies**: whatsapp-web.js, Google Generative AI
- **Key Files**:
  - `service.ts` - Main orchestration
  - `ai-service.ts` - Gemini AI integration
  - `whatsapp-client.ts` - WhatsApp connection management

### 2.3 Communication Flow

```
React UI (Renderer)
     ↕ (IPC via window.electron)
Main Process (IPC Handler)
     ↕ (Direct function calls)
Background Service
     ↕ (Database queries)
SQLite Database
     ↕ (API calls)
External Services (WhatsApp, Gemini)
```

---

## 3. Technology Stack

### 3.1 Frontend Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.2.0 | UI framework |
| TypeScript | 5.2.2 | Type safety |
| Vite | 4.4.9 | Build tool & dev server |
| Tailwind CSS | 3.3.3 | Styling |
| Mermaid.js | 10.6.0 | Gantt chart rendering |
| Lucide React | 0.288.0 | Icons |

### 3.2 Backend Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Electron | 27.0.0 | Desktop framework |
| Node.js | 18.x | Runtime |
| better-sqlite3 | 9.0.0 | Database |
| whatsapp-web.js | 1.23.0 | WhatsApp integration |
| @google/generative-ai | Latest | Gemini AI SDK |

### 3.3 Development Tools

| Tool | Purpose |
|------|---------|
| TypeScript Compiler (tsc) | Compile TS to JS |
| Concurrently | Run multiple processes |
| electron-builder | Package for distribution |
| Vitest | Unit testing |
| ESLint | Code linting |

---

## 4. Project Structure

### 4.1 Complete Directory Tree

```
C:\Dev\Statuz/
│
├── apps/
│   ├── desktop/                      # Electron Main Process
│   │   ├── src/
│   │   │   └── main.ts               # 🔹 Entry point for Electron
│   │   ├── dist/                     # Compiled JS output
│   │   ├── package.json              # Desktop app dependencies
│   │   └── tsconfig.json             # TypeScript config
│   │
│   └── renderer/                     # React UI
│       ├── src/
│       │   ├── components/
│       │   │   └── MermaidChart.tsx  # 🔹 Gantt chart renderer
│       │   ├── contexts/
│       │   │   └── AppContext.tsx    # 🔹 Global app state
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx     # 🔹 Main dashboard
│       │   │   ├── Groups.tsx        # 🔹 WhatsApp group management
│       │   │   ├── Projects.tsx      # 🔹 Project view with Gantt charts
│       │   │   ├── Tasks.tsx         # 🔹 Task management
│       │   │   ├── Context.tsx       # 🔹 Context management UI
│       │   │   └── Settings.tsx      # 🔹 App settings
│       │   ├── App.tsx               # Root component
│       │   ├── main.tsx              # React entry point
│       │   └── index.html            # HTML template
│       ├── dist/                     # Built assets
│       ├── package.json
│       ├── vite.config.ts
│       └── tailwind.config.js
│
├── packages/
│   │
│   ├── shared/                       # Shared Types & Schemas
│   │   ├── src/
│   │   │   ├── index.ts              # Export all shared code
│   │   │   ├── types.ts              # 🔹 TypeScript interfaces
│   │   │   └── schemas.ts            # Zod validation schemas
│   │   └── dist/                     # Compiled output
│   │
│   ├── event-bus/                    # Event System
│   │   ├── src/
│   │   │   └── index.ts              # 🔹 Event emitter
│   │   └── dist/
│   │
│   ├── db/                           # Database Layer
│   │   ├── src/
│   │   │   ├── database.ts           # 🔹 Main database class
│   │   │   ├── schema.ts             # 🔹 Table definitions
│   │   │   ├── migrate.ts            # Database migrations
│   │   │   └── database-extensions.ts # Custom query methods
│   │   └── dist/
│   │
│   ├── agents/                       # AI Agents
│   │   ├── src/
│   │   │   ├── parser-agent.ts       # Message parsing
│   │   │   ├── batch-analysis-agent.ts # Batch processing
│   │   │   └── project-advisor-agent.ts # Project recommendations
│   │   └── dist/
│   │
│   └── background/                   # Background Services
│       ├── src/
│       │   ├── service.ts            # 🔹 Main orchestrator
│       │   ├── ai-service.ts         # 🔹 Gemini AI integration
│       │   ├── whatsapp-client.ts    # 🔹 WhatsApp connection
│       │   ├── whatsapp-service.ts   # Message handling
│       │   ├── whatsapp-web-simple.ts # Simplified API
│       │   ├── context/
│       │   │   └── loader.ts         # Context file loading
│       │   ├── snapshot/
│       │   │   └── generator.ts      # Snapshot generation
│       │   └── utils/
│       │       └── whatsapp-parser.ts # Message parsing
│       └── dist/
│
├── documents/                        # Documentation
│   ├── COMPLETE_DOCUMENTATION.md     # This file
│   ├── SETUP.md                      # Setup guide
│   ├── CHECK_PROJECT.md
│   ├── FIX_MISSING_DESCRIPTION.md
│   └── TROUBLESHOOT_LAUNCH.md
│
├── data/                             # Database files
│   └── app.db                        # SQLite database
│
├── dist/                             # Compiled distribution
├── dist-electron/                    # Packaged Electron app
├── node_modules/                     # Dependencies
│
├── package.json                      # 🔹 Root package config
├── tsconfig.json                     # Root TypeScript config
├── start-app.cjs                     # 🔹 Startup script
│
├── START_WITH_LOGS.bat               # 🔹 Build & start with logging
├── QUICK_START.bat                   # Quick start without rebuild
├── DIRECT_START.bat                  # Direct start
└── backup-version.bat                # Version bumping script
```

### 4.2 Key File Descriptions

#### 🔹 `apps/desktop/src/main.ts`
**Purpose**: Electron main process entry point
**Responsibilities**:
- Create browser window
- Register IPC handlers
- Initialize background service
- Manage app lifecycle

**Key Code**:
```typescript
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false
  }
});

// IPC Handlers
ipcMain.handle('groups:getAll', async () => {
  return await backgroundService.getGroups();
});
```

#### 🔹 `apps/renderer/src/pages/Projects.tsx`
**Purpose**: Display projects with Gantt charts
**Features**:
- Project cards with metadata
- Expandable Gantt charts
- Full-screen modal
- Progress tracking

**Key Code**:
```typescript
{expandedGantt === project.id && (
  <div className="mt-3 bg-white rounded-lg p-4">
    {project.ganttChart ? (
      <MermaidChart chart={project.ganttChart} />
    ) : (
      <p>No Gantt chart available yet</p>
    )}
  </div>
)}
```

#### 🔹 `apps/renderer/src/components/MermaidChart.tsx`
**Purpose**: Render Mermaid diagrams (Gantt charts)
**Implementation**:
```typescript
useEffect(() => {
  const renderChart = async () => {
    const { svg } = await mermaid.render('mermaid-' + id, chart);

    // Parse SVG and fix dimensions
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');

    // Set explicit dimensions from viewBox if height is null
    if (!height && viewBox) {
      const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
      svgElement.setAttribute('width', vbWidth.toString());
      svgElement.setAttribute('height', vbHeight.toString());
    }

    setRenderedSvg(svgElement.outerHTML);
  };

  renderChart();
}, [chart]);
```

#### 🔹 `packages/background/src/service.ts`
**Purpose**: Main orchestration service
**Key Methods**:
- `extractTasksFromGroup()` - AI-powered task extraction
- `getGroups()` - Fetch WhatsApp groups
- `saveGroupContext()` - Store project context

**Extraction Flow** (lines 640-900):
```typescript
async extractTasksFromGroup(groupId: string) {
  // 1. Fetch group context from database
  const groupContextData = await this.db.getGroupContext(groupId);
  const groupContext = groupContextData.context || '';

  // 2. Log context availability
  console.log(`📋 Context: ${groupContext ? 'Available' : 'Not set'}`);

  // 3. Fetch existing data
  const existingTasks = await this.db.getTasks({ groupId });
  const existingProjects = await this.db.getProjects();

  // 4. AI extraction (if context exists)
  // ... extraction logic ...

  // 5. Generate Gantt chart (if context exists)
  if (groupContext) {
    const ganttResult = await this.aiService.generateGanttChart({
      context: groupContext,
      groupName: group.name,
      tasks: existingTasks,
      projects: existingProjects
    });

    await this.db.updateProject(project.id, {
      ganttChart: ganttResult.mermaidSyntax
    });
  }
}
```

#### 🔹 `packages/background/src/ai-service.ts`
**Purpose**: Google Gemini AI integration
**Key Methods**:
- `chat()` - General AI chat
- `generateGanttChart()` - Gantt chart generation
- `testConnection()` - API validation

**Gantt Generation** (lines 130-390):
```typescript
async generateGanttChart(request: GanttChartRequest) {
  const model = this.genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      maxOutputTokens: 2048,  // Extended for charts
      temperature: 0.1,        // Low for consistency
    }
  });

  // Build strict prompt with constraints
  const prompt = `Generate VERY CONCISE Mermaid Gantt chart...

  CRITICAL CONSTRAINTS:
  - Task names MUST be under 25 characters
  - Generate MAXIMUM 6-8 tasks total
  - Use abbreviations (Env, Dev, etc.)
  - Keep output under 800 characters
  - EVERY task MUST have: status, taskid, YYYY-MM-DD, duration
  - NO colons in task names
  `;

  // Generate and validate
  const result = await model.generateContent(prompt);
  let mermaidSyntax = result.response.text().trim();

  // Clean and validate (lines 233-352)
  // - Remove markdown code blocks
  // - Filter truncated tasks
  // - Validate date/duration patterns
  // - Remove empty sections

  return { mermaidSyntax };
}
```

#### 🔹 `packages/db/src/database.ts`
**Purpose**: SQLite database operations
**Key Methods**:
- `getGroups()` - Fetch groups
- `getTasks()` - Fetch tasks with filters
- `getGroupContext()` - Fetch context
- `saveGroupContext()` - Save context

---

## 5. Database Schema

### 5.1 Complete Table Definitions

#### **messages** Table
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,                    -- Unique message ID
  groupId TEXT NOT NULL,                  -- WhatsApp group ID
  author TEXT,                            -- Phone number (e.g., "1234567890@c.us")
  authorName TEXT,                        -- Display name
  text TEXT,                              -- Message content
  timestamp INTEGER,                      -- Unix timestamp
  isFromMe INTEGER,                       -- 0 or 1
  hasMedia INTEGER,                       -- 0 or 1
  mediaType TEXT,                         -- image, video, document, etc.
  createdAt INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_messages_groupId ON messages(groupId);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
```

**Example Data**:
```json
{
  "id": "true_1234567890@c.us_ABC123",
  "groupId": "1234567890-1234567890@g.us",
  "author": "1234567890@c.us",
  "authorName": "John Doe",
  "text": "We need to complete the migration by Q2",
  "timestamp": 1696723200,
  "isFromMe": 0,
  "hasMedia": 0,
  "mediaType": null,
  "createdAt": 1696723200
}
```

#### **groups** Table
```sql
CREATE TABLE groups (
  id TEXT PRIMARY KEY,                    -- WhatsApp group ID
  name TEXT NOT NULL,                     -- Group name
  isActive INTEGER DEFAULT 1,             -- 0 or 1
  watchStatus INTEGER DEFAULT 0,          -- 0 or 1
  createdAt INTEGER DEFAULT (strftime('%s', 'now')),
  updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
);
```

**Example Data**:
```json
{
  "id": "1234567890-1234567890@g.us",
  "name": "SAP Migration Project",
  "isActive": 1,
  "watchStatus": 1,
  "createdAt": 1696723200,
  "updatedAt": 1696723200
}
```

#### **group_context** Table
```sql
CREATE TABLE group_context (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  groupId TEXT UNIQUE NOT NULL,           -- Links to groups.id
  context TEXT,                           -- Project context (markdown/text)
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_group_context_groupId ON group_context(groupId);
```

**Example Data**:
```json
{
  "id": 1,
  "groupId": "1234567890-1234567890@g.us",
  "context": "Project: AFRI ECC to S/4HANA Migration\n\nGoals:\n- Complete migration by Q2 2025\n- Zero data loss\n- Minimize downtime\n\nTeam:\n- PM: John Doe\n- Tech Lead: Jane Smith",
  "updatedAt": 1696723200
}
```

#### **group_members** Table
```sql
CREATE TABLE group_members (
  id TEXT PRIMARY KEY,                    -- Unique member ID
  groupId TEXT NOT NULL,                  -- Links to groups.id
  memberId TEXT NOT NULL,                 -- WhatsApp user ID
  name TEXT,                              -- Display name
  alias TEXT,                             -- Custom alias
  role TEXT,                              -- e.g., "Project Manager"
  isAdmin INTEGER DEFAULT 0,              -- 0 or 1
  joinedAt INTEGER,                       -- Unix timestamp
  FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE
);

CREATE INDEX idx_group_members_groupId ON group_members(groupId);
```

**Example Data**:
```json
{
  "id": "1234567890-1234567890@g.us_1234567890@c.us",
  "groupId": "1234567890-1234567890@g.us",
  "memberId": "1234567890@c.us",
  "name": "John Doe",
  "alias": "John (PM)",
  "role": "Project Manager",
  "isAdmin": 1,
  "joinedAt": 1696723200
}
```

#### **tasks** Table
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,                    -- UUID
  groupId TEXT NOT NULL,                  -- Links to groups.id
  projectId TEXT,                         -- Links to projects.id (nullable)
  title TEXT NOT NULL,                    -- Task name
  description TEXT,                       -- Task details
  status TEXT DEFAULT 'todo',             -- todo, in_progress, done
  priority INTEGER DEFAULT 3,             -- 1=Critical, 2=High, 3=Normal, 4=Low
  assignee TEXT,                          -- WhatsApp user ID
  reporter TEXT,                          -- WhatsApp user ID
  deadline INTEGER,                       -- Unix timestamp
  createdAt INTEGER DEFAULT (strftime('%s', 'now')),
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX idx_tasks_groupId ON tasks(groupId);
CREATE INDEX idx_tasks_projectId ON tasks(projectId);
CREATE INDEX idx_tasks_status ON tasks(status);
```

**Example Data**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "groupId": "1234567890-1234567890@g.us",
  "projectId": "proj_123",
  "title": "Set up development environment",
  "description": "Install SAP S/4HANA dev instance on Azure",
  "status": "in_progress",
  "priority": 2,
  "assignee": "1234567890@c.us",
  "reporter": "0987654321@c.us",
  "deadline": 1699315200,
  "createdAt": 1696723200,
  "updatedAt": 1696723200
}
```

#### **projects** Table
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,                    -- UUID
  whatsappGroupId TEXT UNIQUE,            -- Links to groups.id
  name TEXT NOT NULL,                     -- Project name
  code TEXT,                              -- Project code (e.g., "SAP-MIG-001")
  description TEXT,                       -- AI-generated description
  status TEXT DEFAULT 'active',           -- active, completed, on_hold
  priority INTEGER DEFAULT 3,             -- 1-4 scale
  startDate INTEGER,                      -- Unix timestamp
  endDate INTEGER,                        -- Unix timestamp
  clientName TEXT,                        -- Client company name
  projectManager TEXT,                    -- Manager name
  technicalLead TEXT,                     -- Tech lead name
  slaTier TEXT,                           -- platinum, gold, silver, bronze
  ganttChart TEXT,                        -- ⚡ Mermaid syntax for Gantt chart
  createdAt INTEGER DEFAULT (strftime('%s', 'now')),
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (whatsappGroupId) REFERENCES groups(id) ON DELETE SET NULL
);

CREATE INDEX idx_projects_whatsappGroupId ON projects(whatsappGroupId);
```

**Example Data**:
```json
{
  "id": "proj_123",
  "whatsappGroupId": "1234567890-1234567890@g.us",
  "name": "AFRI ECC to S/4HANA Migration",
  "code": "SAP-MIG-001",
  "description": "Migration of African subsidiary SAP ECC to S/4HANA using RISE platform",
  "status": "active",
  "priority": 1,
  "startDate": 1696723200,
  "endDate": 1714521600,
  "clientName": "ACME Corp",
  "projectManager": "John Doe",
  "technicalLead": "Jane Smith",
  "slaTier": "platinum",
  "ganttChart": "gantt\n    title AFRI ECC Migration\n    dateFormat YYYY-MM-DD\n    section Phase 1\n    Planning :done, task1, 2024-10-01, 14d\n    Setup Env :active, task2, 2024-10-15, 21d",
  "createdAt": 1696723200,
  "updatedAt": 1696723200
}
```

#### **milestones** Table
```sql
CREATE TABLE milestones (
  id TEXT PRIMARY KEY,                    -- UUID
  groupId TEXT NOT NULL,                  -- Links to groups.id
  projectId TEXT,                         -- Links to projects.id
  title TEXT NOT NULL,                    -- Milestone name
  description TEXT,                       -- Details
  dueDate INTEGER,                        -- Unix timestamp
  status TEXT DEFAULT 'upcoming',         -- upcoming, in_progress, completed
  createdAt INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);
```

#### **settings** Table
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,                   -- Setting key (e.g., "gemini_api_key")
  value TEXT,                             -- Setting value
  updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
);
```

**Common Settings**:
```json
[
  { "key": "gemini_api_key", "value": "AIzaSy..." },
  { "key": "theme", "value": "dark" },
  { "key": "language", "value": "en" }
]
```

### 5.2 Database Relationships

```
groups (1) ────── (∞) messages
  │
  │ (1) ────── (1) group_context
  │
  │ (1) ────── (∞) group_members
  │
  │ (1) ────── (∞) tasks
  │
  │ (1) ────── (1) projects
                │
                │ (1) ────── (∞) tasks
                │
                │ (1) ────── (∞) milestones
```

---

## 6. Core Features

### 6.1 WhatsApp Integration

#### Connection Flow
1. User launches app
2. `whatsapp-client.ts` initializes WhatsApp Web client
3. QR code generated and displayed in console
4. User scans QR with mobile WhatsApp
5. Session authenticated and stored
6. App connects to WhatsApp groups

#### Message Processing
```typescript
// packages/background/src/whatsapp-service.ts
client.on('message', async (message) => {
  const chat = await message.getChat();

  if (chat.isGroup) {
    // Save to database
    await db.saveMessage({
      id: message.id._serialized,
      groupId: chat.id._serialized,
      author: message.author,
      authorName: message._data.notifyName,
      text: message.body,
      timestamp: message.timestamp,
      isFromMe: message.fromMe,
      hasMedia: message.hasMedia,
      mediaType: message.type
    });

    // Emit event for UI update
    eventBus.emit('message-received', { message, chat });
  }
});
```

### 6.2 Context Management

#### Why Context Instead of Messages?

**Problem**: Analyzing thousands of messages is:
- Slow (token limits)
- Expensive (API costs)
- Inaccurate (noise, off-topic chatter)

**Solution**: User defines **project context** once:
- Project goals
- Key milestones
- Team structure
- Technical constraints
- Scope boundaries

**Result**: AI generates accurate insights from structured context instead of chaotic messages.

#### Context Storage
```typescript
// packages/db/src/database.ts
async saveGroupContext(groupId: string, context: string) {
  const stmt = this.db.prepare(`
    INSERT INTO group_context (groupId, context, updatedAt)
    VALUES (?, ?, ?)
    ON CONFLICT(groupId) DO UPDATE SET
      context = excluded.context,
      updatedAt = excluded.updatedAt
  `);

  stmt.run(groupId, context, Date.now());
}
```

### 6.3 Task Extraction

#### Extraction Process
1. User clicks "Extract" in Groups tab
2. Fetch group context from database
3. Send context to Gemini AI
4. AI returns structured task list (JSON)
5. Parse and save tasks to database
6. Generate Gantt chart (if context exists)
7. Update UI

#### AI Prompt Example
```typescript
const prompt = `You are a project management AI. Extract tasks from this context:

${groupContext}

Return JSON array of tasks with:
- title (string)
- description (string)
- status (todo/in_progress/done)
- priority (1-4)
- assignee (name)
- deadline (ISO date)

Example:
[
  {
    "title": "Set up dev environment",
    "description": "Install S/4HANA on Azure",
    "status": "todo",
    "priority": 2,
    "assignee": "John Doe",
    "deadline": "2025-11-15"
  }
]
`;
```

### 6.4 Gantt Chart Generation

#### Generation Flow
1. User clicks "Extract" (context must be set)
2. Fetch group context, existing tasks, projects
3. Build AI prompt with:
   - Project context
   - Task list
   - Constraints (6-8 tasks, 25 char names)
4. Call Gemini API
5. Receive Mermaid syntax
6. Validate and clean syntax
7. Save to `projects.ganttChart` column
8. Render in Projects page

#### Mermaid Syntax Validation
```typescript
// packages/background/src/ai-service.ts (lines 246-324)

// Validation rules:
1. Check if line ends abruptly (no duration ending)
2. Verify comma count >= 2
3. Ensure line length > 20 characters
4. Match date pattern: /\d{4}-\d{2}-\d{2}/
5. Match duration pattern: /\d+[dwm]/
6. Verify duration ending: /\d+[dwm]\s*$/

// Example valid task:
"Planning :done, task1, 2024-10-01, 14d"

// Example invalid tasks (filtered out):
"Planning :"                          // No definition
"Planning : 2024-10-01"               // Missing duration
"Planning : active, after task1, 14d" // No real date
"Story 1: System Readiness :..."      // Colon in task name
```

#### Rendering in React
```typescript
// apps/renderer/src/components/MermaidChart.tsx

useEffect(() => {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',  // Changed from 'dark' for visibility
    securityLevel: 'loose',
    gantt: {
      titleTopMargin: 25,
      barHeight: 20,
      fontSize: 12,
    }
  });

  const renderChart = async () => {
    const { svg } = await mermaid.render('mermaid-' + id, chart);
    setRenderedSvg(svg);
  };

  renderChart();
}, [chart]);
```

---

## 7. Data Flow

### 7.1 Extraction Data Flow (Detailed)

```
┌──────────────────────────────────────────────────────────────┐
│ 1. USER ACTION: Click "Extract" in Groups page              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. RENDERER PROCESS (React)                                  │
│    - apps/renderer/src/pages/Groups.tsx                      │
│    - Call: window.electron.invoke('extraction:start')        │
└────────────────────────┬─────────────────────────────────────┘
                         │ (IPC)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. MAIN PROCESS (Electron)                                   │
│    - apps/desktop/src/main.ts                                │
│    - IPC Handler receives call                               │
│    - Route to: backgroundService.extractTasksFromGroup()     │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. BACKGROUND SERVICE                                        │
│    - packages/background/src/service.ts                      │
│                                                              │
│    Step 4a: Fetch Group Context                             │
│    ────────────────────────────────────────                 │
│    const contextData = await db.getGroupContext(groupId);   │
│    const context = contextData.context || '';               │
│                                                              │
│    console.log('📋 Context:', context ? 'Available' : 'Not set');│
│    if (context) {                                            │
│      console.log('📋 Context Preview:', context.substring(0, 200));│
│    }                                                         │
│                                                              │
│    Step 4b: Fetch Existing Data                             │
│    ────────────────────────────────────────                 │
│    const existingTasks = await db.getTasks({ groupId });    │
│    const existingProjects = await db.getProjects();         │
│                                                              │
│    Step 4c: Skip if No Context                              │
│    ────────────────────────────────────────                 │
│    if (!context) {                                           │
│      console.warn('⚠️  Skipping - No context data');        │
│      return { tasks: [], projects: [] };                    │
│    }                                                         │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. AI SERVICE: Gantt Chart Generation                       │
│    - packages/background/src/ai-service.ts                   │
│                                                              │
│    Step 5a: Build Prompt                                    │
│    ────────────────────────────────────────                 │
│    const contextInfo = `                                     │
│      Group: ${groupName}                                     │
│      Project Context: ${context}                             │
│      Existing Tasks: ${tasks.length}                         │
│      Existing Projects: ${projects.length}                   │
│    `;                                                        │
│                                                              │
│    const prompt = `Generate VERY CONCISE Gantt chart...     │
│    CONSTRAINTS:                                              │
│    - Max 6-8 tasks                                           │
│    - Task names < 25 chars                                   │
│    - Use abbreviations                                       │
│    - Output < 800 chars                                      │
│    `;                                                        │
│                                                              │
│    Step 5b: Call Gemini API                                 │
│    ────────────────────────────────────────                 │
│    const model = genAI.getGenerativeModel({                 │
│      model: 'gemini-2.5-flash-lite',                        │
│      generationConfig: {                                     │
│        maxOutputTokens: 2048,                                │
│        temperature: 0.1                                      │
│      }                                                       │
│    });                                                       │
│                                                              │
│    const result = await model.generateContent(prompt);      │
│    let mermaidSyntax = result.response.text().trim();       │
│                                                              │
│    Step 5c: Log Raw Response                                │
│    ────────────────────────────────────────                 │
│    console.log(`🤖 AI RAW RESPONSE (${mermaidSyntax.length} chars):`);│
│    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');                 │
│    console.log(mermaidSyntax);                               │
│    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');                 │
│                                                              │
│    Step 5d: Clean Markdown                                  │
│    ────────────────────────────────────────                 │
│    mermaidSyntax = mermaidSyntax                             │
│      .replace(/^```mermaid\s*/i, '')                        │
│      .replace(/^```\s*/i, '')                               │
│      .replace(/\s*```$/i, '')                               │
│      .trim();                                                │
│                                                              │
│    Step 5e: Validate Each Task Line                         │
│    ────────────────────────────────────────                 │
│    for (const line of lines) {                              │
│      if (line.includes(':')) {                              │
│        const afterColon = line.substring(colonIndex + 1);   │
│        const commaCount = afterColon.split(',').length - 1; │
│                                                              │
│        // Skip if truncated                                 │
│        if (commaCount < 2 || afterColon.length < 20) {      │
│          console.warn('Skipping truncated task:', line);    │
│          continue;                                           │
│        }                                                     │
│                                                              │
│        // Skip if no proper duration ending                 │
│        if (!afterColon.match(/\d+[dwm]\s*$/)) {             │
│          console.warn('Skipping no duration:', line);       │
│          continue;                                           │
│        }                                                     │
│                                                              │
│        // Verify date and duration patterns                 │
│        const hasDate = /\d{4}-\d{2}-\d{2}/.test(afterColon);│
│        const hasDuration = /\d+[dwm]/.test(afterColon);     │
│                                                              │
│        if (hasDate && hasDuration) {                         │
│          cleanedLines.push(line);  // ✅ Valid task         │
│        }                                                     │
│      }                                                       │
│    }                                                         │
│                                                              │
│    Step 5f: Remove Empty Sections                           │
│    ────────────────────────────────────────                 │
│    // Check if section has tasks                            │
│    // If not, remove section header                         │
│                                                              │
│    Step 5g: Final Validation                                │
│    ────────────────────────────────────────────             │
│    if (!mermaidSyntax.startsWith('gantt')) {                │
│      throw new Error('Invalid Gantt syntax');               │
│    }                                                         │
│                                                              │
│    const taskCount = validTaskLines.length;                 │
│    if (taskCount === 0) {                                   │
│      throw new Error('No valid tasks generated');           │
│    }                                                         │
│                                                              │
│    console.log(`✅ Validated: ${taskCount} tasks`);         │
│    console.log('📊 FINAL SYNTAX:');                         │
│    console.log(mermaidSyntax);                               │
│                                                              │
│    return { mermaidSyntax };                                 │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 6. SAVE TO DATABASE                                          │
│    - packages/db/src/database.ts                             │
│                                                              │
│    await db.updateProject(project.id, {                     │
│      ganttChart: mermaidSyntax                               │
│    });                                                       │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 7. UPDATE UI                                                 │
│    - apps/renderer/src/pages/Projects.tsx                    │
│                                                              │
│    useEffect(() => {                                         │
│      loadProjects();  // Re-fetch projects with Gantt       │
│    }, []);                                                   │
│                                                              │
│    {project.ganttChart && (                                  │
│      <MermaidChart chart={project.ganttChart} />            │
│    )}                                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. AI Integration

### 8.1 Google Gemini Configuration

```typescript
// packages/background/src/ai-service.ts

export class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateGanttChart(request: GanttChartRequest) {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',  // Fast, cost-effective
      generationConfig: {
        maxOutputTokens: 2048,          // Extended for charts
        temperature: 0.1,                // Low = consistent output
      }
    });

    // ... generation logic
  }
}
```

### 8.2 Prompt Engineering for Gantt Charts

**Key Constraints**:
1. **Task Limit**: 6-8 tasks maximum (prevents truncation)
2. **Character Limit**: Task names under 25 characters
3. **Abbreviations**: Use short forms (Env, Dev, Setup, etc.)
4. **Total Output**: Under 800 characters
5. **No Colons**: Task names cannot contain colons (breaks parser)
6. **Complete Definitions**: Every task must have all 4 components

**Prompt Template**:
```typescript
const prompt = `You are an expert project management AI. Generate a VERY CONCISE Mermaid Gantt chart based on the following project context.

${contextInfo}

CRITICAL CONSTRAINTS:
- Task names MUST be under 25 characters
- Generate MAXIMUM 6-8 tasks total
- Use abbreviations where possible (Env instead of Environment, Dev instead of Development)
- Keep output under 800 characters total

CRITICAL SYNTAX REQUIREMENTS - EVERY TASK MUST FOLLOW THIS EXACT FORMAT:
Task Name         :status, taskid, YYYY-MM-DD, duration

MANDATORY RULES:
1. Task names MUST NOT contain colons - use dashes or hyphens instead
2. EVERY task line MUST have ALL 4 components separated by commas:
   - Task Name (text before colon, NO COLONS ALLOWED IN NAME)
   - Status (done/active/crit or leave blank)
   - Task ID (unique identifier like task1, task2)
   - Start Date (YYYY-MM-DD format, use actual dates)
   - Duration (like 14d, 3w, 2m)
3. NEVER write incomplete tasks (missing date or duration)
4. NEVER use "after taskX" - always use real dates
5. NO comments (no %% lines)
6. NO empty sections
7. Timeline should be realistic (today: ${new Date().toISOString().split('T')[0]})
8. Include 6-8 tasks MAXIMUM across 2 sections only
9. Keep task names VERY SHORT (under 25 chars)
10. Use abbreviations to save space

CORRECT EXAMPLE:
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Planning          :done, task1, 2024-01-01, 14d
    Requirements      :done, task2, 2024-01-15, 21d
    Design            :active, task3, 2024-02-05, 30d
    section Phase 2
    Development       :task4, 2024-03-07, 60d
    Testing           :task5, 2024-05-06, 30d
    Deployment        :task6, 2024-07-05, 14d

WRONG EXAMPLES (DO NOT DO THIS):
❌ Task Name :
❌ Task Name : 2024-01-01, 14d
❌ Task Name : active, after task1, 14d
❌ Task Name : active, task1
❌ Story 1: System Readiness :active, story1, 2025-10-19, 10d (colon in task name!)

CORRECT VERSION OF LAST EXAMPLE:
✅ Story 1 - System Readiness :active, story1, 2025-10-19, 10d

Generate ONLY the Mermaid Gantt chart with complete task definitions:`;
```

### 8.3 Validation Logic

```typescript
// packages/background/src/ai-service.ts (lines 272-295)

const validateTaskLine = (trimmedLine: string): boolean => {
  const colonIndex = trimmedLine.indexOf(':');
  const afterColon = trimmedLine.substring(colonIndex + 1).trim();

  // Check 1: Not empty or too short
  if (!afterColon || afterColon.length < 5) {
    console.warn(`Skipping truncated/empty task: ${trimmedLine}`);
    return false;
  }

  // Check 2: Comma count (need at least status/taskid, date, duration = 2 commas)
  const commaCount = afterColon.split(',').length - 1;
  if (commaCount < 2 || afterColon.length < 20) {
    console.warn(`Skipping incomplete task (${commaCount} commas): ${trimmedLine}`);
    return false;
  }

  // Check 3: Must end with duration pattern (Xd, Xw, Xm)
  if (!afterColon.match(/\d+[dwm]\s*$/)) {
    console.warn(`Skipping task without proper duration: ${trimmedLine}`);
    return false;
  }

  // Check 4: Must have date pattern (YYYY-MM-DD)
  const hasDate = /\d{4}-\d{2}-\d{2}/.test(afterColon);
  if (!hasDate) {
    console.warn(`Skipping task without date: ${trimmedLine}`);
    return false;
  }

  // Check 5: Must have duration pattern (Xd/Xw/Xm)
  const hasDuration = /\d+[dwm]/.test(afterColon);
  if (!hasDuration) {
    console.warn(`Skipping task without duration: ${trimmedLine}`);
    return false;
  }

  return true;  // ✅ Valid task
};
```

---

## 9. Component Reference

### 9.1 React Components

#### Dashboard.tsx
**Location**: `apps/renderer/src/pages/Dashboard.tsx`
**Purpose**: Main dashboard with stats and activity timeline
**Props**: None
**State**:
- `stats` - Message count, group count, task count
- `recentActivity` - Latest events

#### Groups.tsx
**Location**: `apps/renderer/src/pages/Groups.tsx`
**Purpose**: WhatsApp group management and extraction
**Features**:
- Group list with watch status
- Context editor
- Member management with role assignment
- Extract button for AI processing

**Key Functions**:
```typescript
const handleExtract = async (groupId: string) => {
  await window.electron.invoke('extraction:start', groupId);
  loadGroups();  // Refresh
};

const handleSaveContext = async (groupId: string, context: string) => {
  await window.electron.invoke('context:save', groupId, context);
};

const handleMemberRoleChange = (index: number, role: string) => {
  const updated = [...members];
  updated[index].role = role;
  setMembers(updated);
};
```

#### Projects.tsx
**Location**: `apps/renderer/src/pages/Projects.tsx`
**Purpose**: Project display with Gantt charts
**Features**:
- Project cards with metadata
- Progress bars
- Task statistics (todo, in_progress, done)
- Expandable Gantt charts
- Full-screen modal for charts

**Key State**:
```typescript
const [projects, setProjects] = useState<Project[]>([]);
const [expandedGantt, setExpandedGantt] = useState<string | null>(null);
const [fullScreenGantt, setFullScreenGantt] = useState<{
  projectId: string;
  projectName: string;
  chart: string;
} | null>(null);
```

#### MermaidChart.tsx
**Location**: `apps/renderer/src/components/MermaidChart.tsx`
**Purpose**: Render Mermaid diagrams (Gantt charts)
**Props**:
- `chart: string` - Mermaid syntax
- `className?: string` - CSS classes

**Implementation**:
```typescript
const MermaidChart = ({ chart, className }: Props) => {
  const [renderedSvg, setRenderedSvg] = useState<string>('');
  const id = useId();

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',  // Not 'dark' for visibility
      securityLevel: 'loose',
      gantt: {
        titleTopMargin: 25,
        barHeight: 20,
        fontSize: 12,
      }
    });

    const renderChart = async () => {
      try {
        const { svg } = await mermaid.render('mermaid-' + id, chart);

        // Fix SVG dimensions if height is null
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, 'image/svg+xml');
        const svgElement = doc.querySelector('svg');

        const height = svgElement?.getAttribute('height');
        const viewBox = svgElement?.getAttribute('viewBox');

        if (!height && viewBox) {
          const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
          svgElement.setAttribute('width', vbWidth.toString());
          svgElement.setAttribute('height', vbHeight.toString());
        }

        setRenderedSvg(svgElement.outerHTML);
      } catch (error) {
        console.error('Error rendering chart:', error);
        setRenderedSvg('<p>Error rendering chart</p>');
      }
    };

    renderChart();
  }, [chart]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: renderedSvg }}
    />
  );
};
```

#### Context.tsx
**Location**: `apps/renderer/src/pages/Context.tsx`
**Purpose**: Manage project context
**Features**:
- Text editor for context
- Save/load context per group
- Preview mode

#### Tasks.tsx
**Location**: `apps/renderer/src/pages/Tasks.tsx`
**Purpose**: Task management
**Features**:
- Task list with filters
- Status update
- Priority badges
- Deadline tracking

#### Settings.tsx
**Location**: `apps/renderer/src/pages/Settings.tsx`
**Purpose**: App configuration
**Features**:
- Gemini API key input
- Connection test
- Theme settings

---

## 10. API & IPC Channels

### 10.1 IPC Channel Reference

All IPC channels are defined in `apps/desktop/src/main.ts`:

```typescript
// Groups
ipcMain.handle('groups:getAll', async () => {
  return await backgroundService.getGroups();
});

ipcMain.handle('groups:watch', async (_, groupId: string) => {
  return await backgroundService.watchGroup(groupId);
});

ipcMain.handle('groups:unwatch', async (_, groupId: string) => {
  return await backgroundService.unwatchGroup(groupId);
});

ipcMain.handle('groups:getMembers', async (_, groupId: string) => {
  return await backgroundService.getGroupMembers(groupId);
});

ipcMain.handle('groups:updateMemberRole', async (_, memberId: string, role: string) => {
  return await backgroundService.updateMemberRole(memberId, role);
});

// Tasks
ipcMain.handle('tasks:getAll', async (_, filters) => {
  return await backgroundService.getTasks(filters);
});

ipcMain.handle('tasks:create', async (_, task) => {
  return await backgroundService.createTask(task);
});

ipcMain.handle('tasks:update', async (_, taskId: string, updates) => {
  return await backgroundService.updateTask(taskId, updates);
});

ipcMain.handle('tasks:delete', async (_, taskId: string) => {
  return await backgroundService.deleteTask(taskId);
});

// Projects
ipcMain.handle('projects:getAll', async (_, filters) => {
  return await backgroundService.getProjects(filters);
});

ipcMain.handle('projects:getById', async (_, projectId: string) => {
  return await backgroundService.getProjectById(projectId);
});

ipcMain.handle('projects:update', async (_, projectId: string, updates) => {
  return await backgroundService.updateProject(projectId, updates);
});

// Context
ipcMain.handle('context:get', async (_, groupId: string) => {
  return await backgroundService.getGroupContext(groupId);
});

ipcMain.handle('context:save', async (_, groupId: string, context: string) => {
  return await backgroundService.saveGroupContext(groupId, context);
});

// Extraction
ipcMain.handle('extraction:start', async (_, groupId: string) => {
  return await backgroundService.extractTasksFromGroup(groupId);
});

// AI
ipcMain.handle('ai:testConnection', async () => {
  return await backgroundService.testAIConnection();
});

// Settings
ipcMain.handle('settings:get', async (_, key: string) => {
  return await backgroundService.getSetting(key);
});

ipcMain.handle('settings:set', async (_, key: string, value: string) => {
  return await backgroundService.setSetting(key, value);
});
```

### 10.2 Usage in React

```typescript
// apps/renderer/src/contexts/AppContext.tsx

const getGroups = async () => {
  return await window.electron.invoke('groups:getAll');
};

const extractTasks = async (groupId: string) => {
  return await window.electron.invoke('extraction:start', groupId);
};

const saveContext = async (groupId: string, context: string) => {
  return await window.electron.invoke('context:save', groupId, context);
};
```

---

## 11. Build & Deployment

### 11.1 Build Process

```bash
# 1. Build all packages in dependency order
npm run build:all

# Equivalent to:
npm run build:shared      # Types first
npm run build:event-bus   # Event system
npm run build:db          # Database layer
npm run build:agents      # AI agents
npm run build:background  # Background service
npm run build:renderer    # React UI
npm run build:main        # Electron main process

# 2. Package Electron app
npm run build:electron    # Creates dist-electron/
```

### 11.2 Development Workflow

```bash
# Terminal 1: Start all dev servers
npm run dev

# This runs concurrently:
# 1. Main process build (tsc watch mode)
# 2. Background service build (tsc watch mode)
# 3. Renderer dev server (Vite on port 5173)
# 4. Electron window (waits for port 5173)
```

### 11.3 Batch Scripts (Windows)

#### START_WITH_LOGS.bat
```batch
@echo off
echo ============================================
echo  Starting Statuz with Full Build
echo ============================================

echo Building all packages...
call npm run build:shared
call npm run build:event-bus
call npm run build:db
call npm run build:agents
call npm run build:background
call npm run build:main

echo Starting app...
call npm start
```

#### QUICK_START.bat
```batch
@echo off
echo Starting Statuz...
call npm start
```

### 11.4 Version Management

```bash
# Bump version and backup
backup-version.bat patch "Your commit message"
backup-version.bat minor "Feature update"
backup-version.bat major "Breaking changes"
```

---

## 12. Development Workflow

### 12.1 Making Changes

#### Frontend Changes (Hot Reload)
1. Edit files in `apps/renderer/src/`
2. Vite auto-reloads changes
3. No restart needed

#### Backend Changes (Requires Rebuild)
1. Edit files in `packages/background/src/`
2. Run `npm run build:background`
3. Restart app with `npm start`

**OR** use `START_WITH_LOGS.bat` to rebuild everything

### 12.2 Adding New Features

#### Example: Add Task Estimation Field

**Step 1: Update Type**
```typescript
// packages/shared/src/types.ts
export interface Task {
  // ... existing fields
  estimatedHours?: number;
}
```

**Step 2: Update Database Schema**
```sql
-- packages/db/src/schema.ts
ALTER TABLE tasks ADD COLUMN estimatedHours INTEGER;
```

**Step 3: Update UI**
```typescript
// apps/renderer/src/pages/Tasks.tsx
<input
  type="number"
  value={task.estimatedHours || ''}
  onChange={(e) => updateTask({ estimatedHours: parseInt(e.target.value) })}
  placeholder="Estimated hours"
/>
```

**Step 4: Rebuild**
```bash
npm run build:shared
npm run build:db
npm run build:background
```

### 12.3 Debugging

#### Console Logging
- Main process: Check terminal output
- Renderer process: Open DevTools (Ctrl+Shift+I)

#### Database Inspection
```bash
sqlite3 C:\Dev\Statuz\data\app.db

.tables
.schema projects
SELECT * FROM projects WHERE ganttChart IS NOT NULL;
```

#### AI Response Logging
Look for these markers in terminal:
```
📋 Context: Available
📋 Context Preview (first 200 chars):
   Project: AFRI ECC to S/4HANA Migration...
📋 Context Length: 2144 characters
🤖 AI RAW RESPONSE (length: 1023 chars):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
gantt
    title AFRI ECC to S/4HANA Migration
    ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Gantt chart validated: 6 valid tasks
📊 FINAL MERMAID SYNTAX TO BE SAVED:
```

---

## 13. Troubleshooting Guide

### 13.1 Gantt Chart Issues

#### Problem: Blank White/Black Screen
**Cause**: Theme mismatch or SVG dimension issues
**Solution**:
```typescript
// Change theme from 'dark' to 'default'
mermaid.initialize({
  theme: 'default',  // Better visibility
});

// Fix SVG dimensions
if (!height && viewBox) {
  const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
  svgElement.setAttribute('height', vbHeight.toString());
}
```

#### Problem: "Cannot read properties of undefined (reading 'type')"
**Cause**: Malformed Mermaid syntax (truncated tasks)
**Solution**:
1. Check terminal for "🤖 AI RAW RESPONSE"
2. Verify task lines are complete
3. Delete project and extract again
4. Ensure context is set

#### Problem: Chart Keeps Refreshing
**Cause**: Auto-refresh interval
**Solution**:
```typescript
// Remove auto-refresh
useEffect(() => {
  loadProjects();
}, []);  // Only load once, no refreshKey dependency
```

### 13.2 Extraction Issues

#### Problem: No Context Available
**Solution**:
1. Go to Groups tab
2. Click on group
3. Click "Context" button
4. Enter project context
5. Click "Save Context"
6. Click "Extract" again

#### Problem: Tasks Not Appearing
**Cause**: AI didn't return valid JSON or context is missing
**Solution**:
- Check terminal logs for errors
- Verify Gemini API key is set (Settings)
- Ensure context is comprehensive enough

### 13.3 WhatsApp Connection Issues

#### Problem: QR Code Not Appearing
**Solution**:
- Check internet connection
- Verify WhatsApp Web is accessible
- Restart app

#### Problem: Connection Timeout
**Solution**:
- Clear WhatsApp Web sessions on phone
- Disable VPN if active
- Check firewall settings

### 13.4 Build Errors

#### Problem: node-gyp / Visual Studio Errors
**Solution**:
```bash
# Install build tools
npm install -g windows-build-tools

# Or manually download VS Build Tools
# https://visualstudio.microsoft.com/downloads/
```

#### Problem: TypeScript Errors After Updates
**Solution**:
```bash
# Rebuild in dependency order
npm run build:all
```

---

## 14. Code Examples

### 14.1 Custom IPC Handler

```typescript
// apps/desktop/src/main.ts

ipcMain.handle('myFeature:doSomething', async (event, param1, param2) => {
  try {
    const result = await backgroundService.myMethod(param1, param2);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

```typescript
// apps/renderer/src/contexts/AppContext.tsx

const doSomething = async (param1: string, param2: number) => {
  const result = await window.electron.invoke('myFeature:doSomething', param1, param2);
  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error);
  }
};
```

### 14.2 Database Query

```typescript
// packages/db/src/database.ts

async getTasksWithDetails(filters: { status?: string; projectId?: string }) {
  let query = `
    SELECT
      t.*,
      p.name as projectName,
      gm.name as assigneeName
    FROM tasks t
    LEFT JOIN projects p ON t.projectId = p.id
    LEFT JOIN group_members gm ON t.assignee = gm.memberId
    WHERE 1=1
  `;

  const params: any[] = [];

  if (filters.status) {
    query += ` AND t.status = ?`;
    params.push(filters.status);
  }

  if (filters.projectId) {
    query += ` AND t.projectId = ?`;
    params.push(filters.projectId);
  }

  query += ` ORDER BY t.priority ASC, t.deadline ASC`;

  const stmt = this.db.prepare(query);
  return stmt.all(...params);
}
```

### 14.3 React Component with IPC

```typescript
// apps/renderer/src/pages/MyFeature.tsx

import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';

export default function MyFeature() {
  const { doSomething } = useApp();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await doSomething('param1', 123);
      setData(result);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {data.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

---

## 15. Summary for AI Agents

### Quick Reference

**App Type**: Electron desktop app (React + Node.js + SQLite)
**Purpose**: WhatsApp group → AI-powered project management
**Key Innovation**: Context-driven extraction (not message analysis)
**AI Model**: Google Gemini 2.5 Flash Lite
**Main Features**: Task extraction, Gantt charts, team management

### Critical Files
1. `apps/desktop/src/main.ts` - Electron entry point
2. `packages/background/src/service.ts` - Main orchestrator
3. `packages/background/src/ai-service.ts` - Gemini AI integration
4. `apps/renderer/src/pages/Projects.tsx` - Project display with Gantt
5. `apps/renderer/src/components/MermaidChart.tsx` - Chart renderer
6. `packages/db/src/database.ts` - Database operations

### Data Flow
```
User Action → React UI → IPC → Main Process → Background Service → Database/AI → Response → UI Update
```

### Build Commands
```bash
npm run build:all    # Build everything
npm run dev          # Development mode
npm start            # Production start
START_WITH_LOGS.bat  # Full rebuild + start
```

### Common Issues
1. **Gantt blank**: Check theme (use 'default'), fix SVG dimensions
2. **Truncated charts**: Validate task syntax, check AI response in logs
3. **No extraction**: Set context first in Groups > Context
4. **Build errors**: Install Visual Studio Build Tools

---

**End of Complete Documentation**

This documentation provides 100% coverage of the Statuz (AIPM) application for any AI agent to fully understand the architecture, implementation, and workflow.
