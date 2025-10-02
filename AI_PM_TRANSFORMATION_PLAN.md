# AIPM Transformation Plan
## From WhatsApp Monitor to Autonomous AI Project Manager

**Document Version**: 1.0
**Date**: January 2025
**Author**: Claude Code (Principal AI Architect)
**Target Timezone**: Asia/Dubai (Gulf Standard Time)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Gap Analysis](#gap-analysis)
3. [Target Architecture](#target-architecture)
4. [Data Model Extensions](#data-model-extensions)
5. [Agent System Design](#agent-system-design)
6. [Backend Code Changes](#backend-code-changes)
7. [Frontend/UI Changes](#frontend-ui-changes)
8. [Example Reports & Digests](#example-reports--digests)
9. [Rollout Roadmap](#rollout-roadmap)
10. [Code Snippets](#code-snippets)

---

## 1. Executive Summary

### Current State
AIPM (forked from Statuz v2.1.0) is a WhatsApp monitoring desktop app with:
- Message capture and storage
- AI-powered chat assistance
- Auto-response capabilities
- Contact management
- Basic group monitoring

### Target State
Transform into a **fully autonomous AI Project Manager** that:
- **Extracts** tasks, risks, decisions, dependencies from WhatsApp streams
- **Maintains** project plans with owners, deadlines, dependencies
- **Drives** execution via nudges/escalations
- **Generates** multi-tier reports (team/client/exec)
- **Detects** conflicts and proposes resolutions
- **Prioritizes** based on SLA/urgency
- **Integrates** with Jira and SAP PS
- **Ensures** auditability and governance

### Constraints
- ✅ Local-first architecture (SQLite + local files)
- ✅ Minimal dependencies
- ✅ Audit every AI action
- ✅ Privacy-first (contact aliases)
- ✅ Gulf timezone support (Asia/Dubai)

---

## 2. Gap Analysis

### 2.1 Current Capabilities vs Requirements

| Capability | Current State | Required State | Gap |
|------------|---------------|----------------|-----|
| **Data Extraction** | Manual message reading | Auto-extract tasks/risks/decisions | ⚠️ **CRITICAL** |
| **Project Planning** | None | Multi-project plans with dependencies | ⚠️ **CRITICAL** |
| **Task Tracking** | None | Task lifecycle with owners/deadlines | ⚠️ **CRITICAL** |
| **Risk Management** | None | Risk register with mitigation plans | ⚠️ **CRITICAL** |
| **Decision Tracking** | None | Decision log with rationale/impact | ⚠️ **CRITICAL** |
| **Dependency Management** | None | Cross-task/project dependencies | ⚠️ **CRITICAL** |
| **Stakeholder Management** | Basic contacts | Roles, SLAs, escalation paths | ⚠️ **MEDIUM** |
| **Execution Nudges** | Basic auto-response | Proactive reminders/escalations | ⚠️ **CRITICAL** |
| **Reporting** | None | Multi-tier (team/client/exec) reports | ⚠️ **CRITICAL** |
| **Conflict Detection** | None | Deadline/resource/priority conflicts | ⚠️ **HIGH** |
| **Prioritization** | None | SLA-based, urgency-aware | ⚠️ **HIGH** |
| **Jira Integration** | None | Bi-directional sync | ⚠️ **MEDIUM** |
| **SAP PS Integration** | None | Project data sync | ⚠️ **LOW** (Phase 5) |
| **Audit Trail** | Basic audit log | Complete AI action audit | ✅ **PARTIAL** |
| **Privacy** | Contact aliases | Enhanced anonymization | ✅ **GOOD** |

### 2.2 Technical Gaps

#### Database Schema
- ❌ No `tasks` table
- ❌ No `risks` table
- ❌ No `decisions` table
- ❌ No `dependencies` table
- ❌ No `projects` table
- ❌ No `stakeholders` table with SLA info
- ❌ No `execution_nudges` table
- ❌ No `conflict_resolutions` table
- ❌ No `reports` table for generated reports

#### Backend Services
- ❌ No parser agent for NLP extraction
- ❌ No planner agent for project planning
- ❌ No tracker agent for status updates
- ❌ No reporter agent for digest generation
- ❌ No conflict detector
- ❌ No policy engine for SLA/priority
- ❌ No event bus for agent coordination
- ❌ No scheduler for cron jobs (nudges, reports)
- ❌ No Jira/SAP integration layer

#### Frontend Pages
- ❌ No project overview dashboard
- ❌ No task board (Kanban-style)
- ❌ No risk register view
- ❌ No decision log
- ❌ No dependency graph view
- ❌ No report generation interface
- ❌ No stakeholder management with SLA

#### AI Capabilities
- ✅ Basic Gemini integration (chat + auto-response)
- ❌ Structured extraction (JSON schema)
- ❌ Multi-agent orchestration
- ❌ Prompt templates for each agent
- ❌ RAG (if needed for large context)
- ❌ Confidence scoring for extractions

---

## 3. Target Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ELECTRON MAIN PROCESS                            │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────┐                │
│  │   Desktop    │  │   Background   │  │  WhatsApp    │                │
│  │     App      │──│    Service     │──│   Client     │                │
│  └──────┬───────┘  └────────┬───────┘  └──────────────┘                │
│         │                   │                                            │
│         │ IPC               │ Events                                     │
│         │                   │                                            │
│         │         ┌─────────▼──────────┐                                │
│         │         │   Event Bus        │                                │
│         │         │  (Agent Orchestr.) │                                │
│         │         └─────────┬──────────┘                                │
│         │                   │                                            │
│         │         ┌─────────▼──────────────────────────┐                │
│         │         │      AGENT SYSTEM                  │                │
│         │         │  ┌──────────┐  ┌──────────┐        │                │
│         │         │  │  Parser  │  │ Planner  │        │                │
│         │         │  │  Agent   │  │  Agent   │        │                │
│         │         │  └──────────┘  └──────────┘        │                │
│         │         │  ┌──────────┐  ┌──────────┐        │                │
│         │         │  │ Tracker  │  │ Reporter │        │                │
│         │         │  │  Agent   │  │  Agent   │        │                │
│         │         │  └──────────┘  └──────────┘        │                │
│         │         │  ┌──────────┐  ┌──────────┐        │                │
│         │         │  │ Conflict │  │  Policy  │        │                │
│         │         │  │ Detector │  │  Engine  │        │                │
│         │         │  └──────────┘  └──────────┘        │                │
│         │         └────────────────────────────────────┘                │
│         │                   │                                            │
│         │         ┌─────────▼──────────┐                                │
│         │         │    Scheduler       │                                │
│         │         │  (Cron Jobs)       │                                │
│         │         └─────────┬──────────┘                                │
│         │                   │                                            │
│         │         ┌─────────▼──────────────────────────┐                │
│         │         │  Integration Layer                 │                │
│         │         │  ┌──────────┐  ┌──────────┐        │                │
│         │         │  │   Jira   │  │  SAP PS  │        │                │
│         │         │  │  Adapter │  │  Adapter │        │                │
│         │         │  └──────────┘  └──────────┘        │                │
│         │         └────────────────────────────────────┘                │
└─────────┼─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      ELECTRON RENDERER PROCESS                           │
│  ┌──────────┐  ┌────────────────────────────────────────┐              │
│  │  React   │  │           NEW PAGES                     │              │
│  │   UI     │──│  • Project Dashboard                    │              │
│  │          │  │  • Task Board (Kanban)                  │              │
│  │          │  │  • Risk Register                        │              │
│  │          │  │  • Decision Log                         │              │
│  │          │  │  • Dependency Graph                     │              │
│  │          │  │  • Report Generator                     │              │
│  │          │  │  • Stakeholder Management               │              │
│  └──────────┘  └────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────┘
          ▲
          │
┌─────────┴──────────────────────────────────────┐
│          SQLite Database (Extended)             │
│  • projects          • stakeholders             │
│  • tasks             • execution_nudges         │
│  • risks             • conflict_resolutions     │
│  • decisions         • reports                  │
│  • dependencies      • jira_sync_state          │
│  • ... (existing tables)                        │
└─────────────────────────────────────────────────┘
```

### 3.2 Agent System Architecture

```
                    ┌──────────────────────┐
                    │    Message Event     │
                    │  (WhatsApp/Manual)   │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │    EVENT BUS         │
                    │  (packages/event-bus)│
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
    ┌────────▼────────┐ ┌─────▼──────┐ ┌───────▼────────┐
    │  PARSER AGENT   │ │  PLANNER   │ │   TRACKER      │
    │  Extract:       │ │  AGENT     │ │   AGENT        │
    │  • Tasks        │ │  Create:   │ │  Monitor:      │
    │  • Risks        │ │  • Plans   │ │  • Progress    │
    │  • Decisions    │ │  • Deps    │ │  • Deadlines   │
    │  • Deps         │ │  • Assign  │ │  • Blockers    │
    └────────┬────────┘ └─────┬──────┘ └───────┬────────┘
             │                 │                 │
             │        ┌────────▼────────┐        │
             └───────▶│  POLICY ENGINE  │◀───────┘
                      │  • SLA Rules    │
                      │  • Priority     │
                      │  • Escalation   │
                      └────────┬────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
    ┌────────▼────────┐ ┌─────▼──────┐ ┌───────▼────────┐
    │ CONFLICT AGENT  │ │  REPORTER  │ │   SCHEDULER    │
    │  Detect:        │ │  AGENT     │ │   Trigger:     │
    │  • Deadline     │ │  Generate: │ │   • Nudges     │
    │  • Resource     │ │  • Daily   │ │   • Reports    │
    │  • Priority     │ │  • Weekly  │ │   • Checks     │
    └────────┬────────┘ └─────┬──────┘ └───────┬────────┘
             │                 │                 │
             └─────────────────┼─────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │   WhatsApp Output    │
                    │  (Nudges/Reports)    │
                    └──────────────────────┘
```

### 3.3 Data Flow: Task Extraction Example

```
User sends WhatsApp message:
"John will complete the API integration by Friday 5 PM"
                    │
                    ▼
        ┌───────────────────────┐
        │  BackgroundService    │
        │  receives message     │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Event Bus emits:     │
        │  'message:received'   │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Parser Agent         │
        │  • Calls Gemini API   │
        │  • JSON schema:       │
        │    {                  │
        │      type: "task",    │
        │      title: "API int",│
        │      owner: "John",   │
        │      deadline: "Fri"  │
        │    }                  │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Planner Agent        │
        │  • Resolve "John"     │
        │  • Parse "Friday 5PM" │
        │  • Assign to project  │
        │  • Check conflicts    │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Database: INSERT     │
        │  tasks table          │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Event Bus emits:     │
        │  'task:created'       │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Tracker Agent        │
        │  • Schedule reminder  │
        │  • Add to task board  │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  UI updates           │
        │  Task Board shows new │
        └───────────────────────┘
```

---

## 4. Data Model Extensions

### 4.1 SQL Migrations

#### Migration 001: Projects Table

```sql
-- File: packages/db/src/migrations/001_add_projects.sql

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,                    -- UUID
  name TEXT NOT NULL,                     -- "SAP S/4HANA Implementation"
  code TEXT UNIQUE,                       -- "SAP-001"
  client_name TEXT,                       -- "Acme Corp"
  whatsapp_group_id TEXT,                 -- Link to groups table
  status TEXT NOT NULL DEFAULT 'active',  -- active|on_hold|completed|cancelled
  priority INTEGER NOT NULL DEFAULT 3,    -- 1=critical, 2=high, 3=medium, 4=low
  sla_tier TEXT,                          -- platinum|gold|silver|bronze
  start_date INTEGER,                     -- Unix timestamp
  target_end_date INTEGER,                -- Unix timestamp
  actual_end_date INTEGER,
  budget_hours REAL,
  consumed_hours REAL DEFAULT 0,
  project_manager TEXT,                   -- Phone number or alias
  technical_lead TEXT,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (whatsapp_group_id) REFERENCES groups(id)
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_priority ON projects(priority);
CREATE INDEX idx_projects_group ON projects(whatsapp_group_id);
```

#### Migration 002: Tasks Table

```sql
-- File: packages/db/src/migrations/002_add_tasks.sql

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,                    -- UUID
  project_id TEXT NOT NULL,               -- FK to projects
  parent_task_id TEXT,                    -- For subtasks
  title TEXT NOT NULL,                    -- "Complete API integration"
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',    -- todo|in_progress|blocked|done|cancelled
  priority INTEGER NOT NULL DEFAULT 3,
  owner_phone TEXT,                       -- Assignee phone number
  owner_alias TEXT,                       -- Resolved alias
  created_by_phone TEXT,                  -- Who created this task
  created_by_alias TEXT,
  estimated_hours REAL,
  actual_hours REAL DEFAULT 0,
  deadline INTEGER,                       -- Unix timestamp
  completed_at INTEGER,
  blocker_reason TEXT,                    -- If status=blocked
  extracted_from_message_id TEXT,         -- Source message
  confidence_score REAL,                  -- AI extraction confidence (0-1)
  tags TEXT,                              -- JSON array: ["backend","critical"]
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id),
  FOREIGN KEY (extracted_from_message_id) REFERENCES messages(id)
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_owner ON tasks(owner_phone);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
```

#### Migration 003: Risks Table

```sql
-- File: packages/db/src/migrations/003_add_risks.sql

CREATE TABLE IF NOT EXISTS risks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,                    -- "Database migration delay"
  description TEXT,
  category TEXT,                          -- technical|resource|schedule|scope|external
  severity TEXT NOT NULL DEFAULT 'medium', -- critical|high|medium|low
  probability TEXT NOT NULL DEFAULT 'medium', -- very_likely|likely|possible|unlikely
  impact TEXT,                            -- Description of impact
  mitigation_plan TEXT,                   -- How to mitigate
  owner_phone TEXT,                       -- Risk owner
  owner_alias TEXT,
  status TEXT NOT NULL DEFAULT 'open',    -- open|monitoring|mitigated|realized|closed
  identified_at INTEGER NOT NULL,
  extracted_from_message_id TEXT,
  confidence_score REAL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (extracted_from_message_id) REFERENCES messages(id)
);

CREATE INDEX idx_risks_project ON risks(project_id);
CREATE INDEX idx_risks_severity ON risks(severity);
CREATE INDEX idx_risks_status ON risks(status);
```

#### Migration 004: Decisions Table

```sql
-- File: packages/db/src/migrations/004_add_decisions.sql

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,                    -- "Use PostgreSQL instead of MySQL"
  description TEXT,
  rationale TEXT,                         -- Why this decision was made
  alternatives_considered TEXT,           -- JSON array of alternatives
  impact TEXT,                            -- Expected impact
  decision_maker_phone TEXT,
  decision_maker_alias TEXT,
  stakeholders TEXT,                      -- JSON array of affected stakeholders
  status TEXT NOT NULL DEFAULT 'proposed', -- proposed|approved|rejected|implemented
  decided_at INTEGER,
  implemented_at INTEGER,
  extracted_from_message_id TEXT,
  confidence_score REAL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (extracted_from_message_id) REFERENCES messages(id)
);

CREATE INDEX idx_decisions_project ON decisions(project_id);
CREATE INDEX idx_decisions_status ON decisions(status);
```

#### Migration 005: Dependencies Table

```sql
-- File: packages/db/src/migrations/005_add_dependencies.sql

CREATE TABLE IF NOT EXISTS dependencies (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,                  -- Dependent task
  depends_on_task_id TEXT NOT NULL,       -- Prerequisite task
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start', -- finish_to_start|start_to_start|finish_to_finish
  lag_days INTEGER DEFAULT 0,             -- Delay after predecessor
  status TEXT NOT NULL DEFAULT 'active',  -- active|resolved|obsolete
  created_at INTEGER NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE(task_id, depends_on_task_id)
);

CREATE INDEX idx_dependencies_task ON dependencies(task_id);
CREATE INDEX idx_dependencies_depends ON dependencies(depends_on_task_id);
```

#### Migration 006: Stakeholders Table

```sql
-- File: packages/db/src/migrations/006_add_stakeholders.sql

CREATE TABLE IF NOT EXISTS stakeholders (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  alias TEXT,
  role TEXT,                              -- pm|tech_lead|developer|client|sponsor
  email TEXT,
  organization TEXT,
  is_primary_contact INTEGER DEFAULT 0,
  escalation_level INTEGER DEFAULT 1,     -- 1=first contact, 2=manager, 3=exec
  sla_response_hours INTEGER,             -- Expected response time
  timezone TEXT DEFAULT 'Asia/Dubai',
  communication_preference TEXT,          -- whatsapp|email|both
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  UNIQUE(project_id, phone_number)
);

CREATE INDEX idx_stakeholders_project ON stakeholders(project_id);
CREATE INDEX idx_stakeholders_phone ON stakeholders(phone_number);
```

#### Migration 007: Execution Nudges Table

```sql
-- File: packages/db/src/migrations/007_add_execution_nudges.sql

CREATE TABLE IF NOT EXISTS execution_nudges (
  id TEXT PRIMARY KEY,
  nudge_type TEXT NOT NULL,               -- reminder|escalation|status_request|blocker_alert
  entity_type TEXT NOT NULL,              -- task|risk|decision|project
  entity_id TEXT NOT NULL,                -- ID of the entity
  recipient_phone TEXT NOT NULL,
  message_text TEXT NOT NULL,
  scheduled_at INTEGER NOT NULL,          -- When to send
  sent_at INTEGER,                        -- When actually sent
  status TEXT NOT NULL DEFAULT 'pending', -- pending|sent|failed|cancelled
  escalation_level INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_nudges_scheduled ON execution_nudges(scheduled_at, status);
CREATE INDEX idx_nudges_entity ON execution_nudges(entity_type, entity_id);
```

#### Migration 008: Conflict Resolutions Table

```sql
-- File: packages/db/src/migrations/008_add_conflict_resolutions.sql

CREATE TABLE IF NOT EXISTS conflict_resolutions (
  id TEXT PRIMARY KEY,
  conflict_type TEXT NOT NULL,            -- deadline|resource|priority|dependency
  description TEXT NOT NULL,
  affected_entities TEXT NOT NULL,        -- JSON array of {type, id}
  severity TEXT NOT NULL DEFAULT 'medium', -- critical|high|medium|low
  detected_at INTEGER NOT NULL,
  resolution_options TEXT,                -- JSON array of options
  chosen_resolution TEXT,
  resolved_at INTEGER,
  resolved_by_phone TEXT,
  status TEXT NOT NULL DEFAULT 'open',    -- open|resolved|acknowledged|ignored
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_conflicts_status ON conflict_resolutions(status);
CREATE INDEX idx_conflicts_detected ON conflict_resolutions(detected_at);
```

#### Migration 009: Reports Table

```sql
-- File: packages/db/src/migrations/009_add_reports.sql

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  report_type TEXT NOT NULL,              -- daily|weekly|monthly|custom
  audience TEXT NOT NULL,                 -- team|client|executive
  project_id TEXT,                        -- NULL = all projects
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  generated_at INTEGER NOT NULL,
  generated_by TEXT,                      -- 'system' or user
  format TEXT NOT NULL,                   -- markdown|json|html
  content TEXT NOT NULL,                  -- The actual report
  summary TEXT,                           -- Brief summary for listing
  sent_to TEXT,                           -- JSON array of recipients
  file_path TEXT,                         -- If exported to file
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_generated ON reports(generated_at);
CREATE INDEX idx_reports_project ON reports(project_id);
```

#### Migration 010: Jira Sync State Table

```sql
-- File: packages/db/src/migrations/010_add_jira_sync_state.sql

CREATE TABLE IF NOT EXISTS jira_sync_state (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,              -- task|project|risk
  local_id TEXT NOT NULL,                 -- ID in our database
  jira_key TEXT NOT NULL,                 -- PROJ-123
  jira_id TEXT,                           -- Jira internal ID
  last_sync_at INTEGER,
  sync_direction TEXT NOT NULL,           -- to_jira|from_jira|bidirectional
  sync_status TEXT NOT NULL DEFAULT 'pending', -- pending|synced|conflict|error
  error_message TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(entity_type, local_id),
  UNIQUE(jira_key)
);

CREATE INDEX idx_jira_sync_entity ON jira_sync_state(entity_type, local_id);
CREATE INDEX idx_jira_sync_key ON jira_sync_state(jira_key);
```

### 4.2 Extended Schema Diagram

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   projects   │◀───────┤    tasks     │◀───────┤ dependencies │
│              │         │              │         │              │
│ • id         │         │ • id         │         │ • task_id    │
│ • name       │         │ • project_id │         │ • depends_on │
│ • client     │         │ • owner      │         │ • type       │
│ • priority   │         │ • deadline   │         └──────────────┘
│ • sla_tier   │         │ • status     │
└──────┬───────┘         └──────────────┘
       │
       │
       ├────────────────────────────────────────────────────┐
       │                                                    │
       │                                                    │
┌──────▼───────┐   ┌──────────────┐   ┌──────────────┐   ┌▼──────────────┐
│    risks     │   │  decisions   │   │ stakeholders │   │ execution_    │
│              │   │              │   │              │   │ nudges        │
│ • id         │   │ • id         │   │ • phone      │   │              │
│ • project_id │   │ • project_id │   │ • project_id │   │ • entity_id  │
│ • severity   │   │ • status     │   │ • role       │   │ • scheduled  │
│ • mitigation │   │ • rationale  │   │ • sla_hours  │   │ • status     │
└──────────────┘   └──────────────┘   └──────────────┘   └───────────────┘

┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  conflict_   │   │   reports    │   │  jira_sync_  │
│ resolutions  │   │              │   │   state      │
│              │   │ • id         │   │              │
│ • type       │   │ • type       │   │ • local_id   │
│ • severity   │   │ • audience   │   │ • jira_key   │
│ • status     │   │ • content    │   │ • sync_dir   │
└──────────────┘   └──────────────┘   └──────────────┘

EXISTING TABLES (from Statuz):
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   groups     │   │   messages   │   │   contacts   │
│ (WhatsApp)   │   │              │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
```

---

## 5. Agent System Design

### 5.1 Parser Agent

**Purpose**: Extract structured entities (tasks, risks, decisions, dependencies) from WhatsApp messages.

**System Prompt**:
```markdown
You are a PM Parser Agent. Extract project management entities from WhatsApp messages.

CONTEXT:
- Timezone: Asia/Dubai (Gulf Standard Time)
- Today: {{current_date}}
- Current time: {{current_time}}
- Group: {{group_name}}
- Project: {{project_name}}

EXTRACTION RULES:
1. Tasks: Any commitment, action item, deliverable
   - Must have: title, owner (optional)
   - Optional: deadline, description
   - Examples:
     - "John will complete API by Friday"
     - "Need to review the design docs"
     - "Deploy to staging tonight"

2. Risks: Concerns, blockers, potential issues
   - Must have: description
   - Optional: severity, mitigation
   - Examples:
     - "We might miss the deadline due to resource shortage"
     - "Database migration could fail"

3. Decisions: Choices made, approvals given
   - Must have: what was decided
   - Optional: rationale, alternatives
   - Examples:
     - "We'll use PostgreSQL instead of MySQL"
     - "Approved budget increase"

4. Dependencies: Task relationships
   - Must have: task A depends on task B
   - Examples:
     - "Can't start testing until dev is done"
     - "Backend must be ready before frontend"

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown, no explanations):
{
  "entities": [
    {
      "type": "task",
      "title": "string",
      "description": "string (optional)",
      "owner": "string (name or phone)",
      "deadline": "ISO 8601 string or null",
      "priority": 1-4,
      "confidence": 0.0-1.0
    },
    {
      "type": "risk",
      "title": "string",
      "description": "string",
      "severity": "critical|high|medium|low",
      "probability": "very_likely|likely|possible|unlikely",
      "confidence": 0.0-1.0
    },
    {
      "type": "decision",
      "title": "string",
      "description": "string",
      "rationale": "string (optional)",
      "decision_maker": "string (optional)",
      "confidence": 0.0-1.0
    },
    {
      "type": "dependency",
      "task_title": "string",
      "depends_on_title": "string",
      "dependency_type": "finish_to_start|start_to_start",
      "confidence": 0.0-1.0
    }
  ]
}

If no entities found, return: {"entities": []}

DATE PARSING:
- "Friday" → next Friday from today
- "tomorrow" → tomorrow's date
- "end of week" → next Sunday
- "5 PM" → 17:00 in Asia/Dubai timezone
- "EOD" → 18:00 same day
```

**JSON Schema** (for validation):
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "entities": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "type": "object",
            "properties": {
              "type": {"const": "task"},
              "title": {"type": "string", "minLength": 1},
              "description": {"type": "string"},
              "owner": {"type": "string"},
              "deadline": {"type": ["string", "null"], "format": "date-time"},
              "priority": {"type": "integer", "minimum": 1, "maximum": 4},
              "confidence": {"type": "number", "minimum": 0, "maximum": 1}
            },
            "required": ["type", "title", "confidence"]
          },
          {
            "type": "object",
            "properties": {
              "type": {"const": "risk"},
              "title": {"type": "string", "minLength": 1},
              "description": {"type": "string"},
              "severity": {"enum": ["critical", "high", "medium", "low"]},
              "probability": {"enum": ["very_likely", "likely", "possible", "unlikely"]},
              "confidence": {"type": "number", "minimum": 0, "maximum": 1}
            },
            "required": ["type", "title", "confidence"]
          },
          {
            "type": "object",
            "properties": {
              "type": {"const": "decision"},
              "title": {"type": "string", "minLength": 1},
              "description": {"type": "string"},
              "rationale": {"type": "string"},
              "decision_maker": {"type": "string"},
              "confidence": {"type": "number", "minimum": 0, "maximum": 1}
            },
            "required": ["type", "title", "confidence"]
          },
          {
            "type": "object",
            "properties": {
              "type": {"const": "dependency"},
              "task_title": {"type": "string", "minLength": 1},
              "depends_on_title": {"type": "string", "minLength": 1},
              "dependency_type": {"enum": ["finish_to_start", "start_to_start"]},
              "confidence": {"type": "number", "minimum": 0, "maximum": 1}
            },
            "required": ["type", "task_title", "depends_on_title", "confidence"]
          }
        ]
      }
    }
  },
  "required": ["entities"]
}
```

### 5.2 Planner Agent

**Purpose**: Create/update project plans, assign tasks, resolve references.

**System Prompt**:
```markdown
You are a PM Planner Agent. Validate and enrich extracted entities.

INPUT:
- Raw entities from Parser Agent
- Current project state (existing tasks, stakeholders)
- Group context

RESPONSIBILITIES:
1. Resolve ambiguous references
   - Map "John" to actual contact (phone/alias)
   - Fuzzy match task titles to existing tasks
   - Infer project from group context

2. Validate data
   - Check if deadline is realistic (not in past)
   - Verify owner exists in stakeholders
   - Detect duplicate tasks

3. Enrich entities
   - Auto-assign priority based on keywords
   - Set default deadlines (e.g., "EOD" = 18:00 today)
   - Link to parent project

4. Generate warnings
   - "Deadline is only 2 hours away"
   - "Owner has 5 overdue tasks"
   - "Duplicate task detected"

OUTPUT FORMAT (JSON):
{
  "validated_entities": [
    {
      "entity_id": "uuid",
      "type": "task",
      "data": {
        "title": "Complete API integration",
        "project_id": "proj-001",
        "owner_phone": "+971501234567",
        "owner_alias": "John Developer",
        "deadline": "2025-01-10T17:00:00+04:00",
        "priority": 2,
        "status": "todo"
      },
      "warnings": ["Deadline in 2 hours", "Owner has 3 overdue tasks"]
    }
  ],
  "errors": [
    {
      "entity": {...},
      "error": "Owner 'Alice' not found in stakeholders"
    }
  ]
}
```

### 5.3 Tracker Agent

**Purpose**: Monitor task progress, detect delays, trigger nudges.

**System Prompt**:
```markdown
You are a PM Tracker Agent. Monitor execution and detect issues.

RESPONSIBILITIES:
1. Status monitoring
   - Track task status changes
   - Detect overdue tasks
   - Identify blocked tasks

2. Nudge generation
   - Reminder: 1 day before deadline
   - Escalation: 2 hours overdue
   - Status request: 50% of time elapsed, no update

3. Blocker detection
   - Identify tasks blocked by incomplete dependencies
   - Flag tasks with no progress in X days

4. Progress estimation
   - Estimate project completion based on velocity
   - Predict deadline misses

OUTPUT (for each check):
{
  "nudges_to_create": [
    {
      "type": "reminder",
      "task_id": "task-123",
      "recipient_phone": "+971501234567",
      "message": "⏰ Reminder: 'API integration' due tomorrow at 5 PM",
      "scheduled_at": "2025-01-09T09:00:00+04:00"
    }
  ],
  "blockers_detected": [
    {
      "task_id": "task-456",
      "reason": "Blocked by incomplete task: 'Database setup'"
    }
  ],
  "progress_summary": {
    "total_tasks": 20,
    "completed": 12,
    "in_progress": 5,
    "blocked": 2,
    "overdue": 1,
    "completion_percentage": 60,
    "estimated_completion_date": "2025-01-20"
  }
}
```

### 5.4 Reporter Agent

**Purpose**: Generate daily/weekly reports for different audiences.

**System Prompt**:
```markdown
You are a PM Reporter Agent. Generate project status reports.

INPUT:
- Report type: daily|weekly|monthly
- Audience: team|client|executive
- Project ID (or "all")
- Date range

REPORT TEMPLATES:

### TEAM REPORT (Daily)
Focus: Tactical, detailed, actionable
- Tasks completed yesterday
- Tasks planned for today
- Blockers and risks
- Who needs help
- Quick wins

### CLIENT REPORT (Weekly)
Focus: Progress, deliverables, transparency
- Milestones achieved
- Upcoming deliverables
- Risks and mitigation
- Schedule status (on track / delayed)
- Next week's plan

### EXECUTIVE REPORT (Weekly/Monthly)
Focus: High-level, KPIs, financials, risks
- Project health (RAG status)
- Budget vs. actual
- Top 3 risks
- Key decisions needed
- Resource allocation

OUTPUT FORMAT:
- Markdown for WhatsApp
- JSON for storage
- HTML for email (future)

TONE:
- Team: Casual, collaborative
- Client: Professional, reassuring
- Executive: Concise, data-driven
```

### 5.5 Conflict Agent

**Purpose**: Detect scheduling, resource, priority conflicts.

**System Prompt**:
```markdown
You are a PM Conflict Detector. Identify and propose resolutions.

CONFLICT TYPES:

1. Deadline conflicts
   - Multiple tasks due same day for same person
   - Task deadline before dependency completion

2. Resource conflicts
   - Person overallocated (>8 hours/day)
   - Person assigned to multiple critical tasks

3. Priority conflicts
   - Low priority task blocking high priority task
   - Conflicting priorities from different stakeholders

4. Dependency conflicts
   - Circular dependencies
   - Broken dependency chains

OUTPUT:
{
  "conflicts": [
    {
      "type": "deadline",
      "severity": "high",
      "description": "John has 3 tasks due on Jan 10",
      "affected_tasks": ["task-1", "task-2", "task-3"],
      "resolution_options": [
        "Extend deadline for task-2 to Jan 11",
        "Reassign task-3 to Sarah",
        "Mark task-1 as lower priority"
      ]
    }
  ]
}
```

### 5.6 Policy Engine

**Purpose**: Apply SLA rules, prioritization logic, escalation paths.

**Configuration** (stored in database or config file):
```json
{
  "sla_tiers": {
    "platinum": {
      "response_time_hours": 2,
      "resolution_time_hours": 24,
      "escalation_levels": [
        {"level": 1, "wait_hours": 2, "role": "tech_lead"},
        {"level": 2, "wait_hours": 4, "role": "pm"},
        {"level": 3, "wait_hours": 8, "role": "sponsor"}
      ]
    },
    "gold": {
      "response_time_hours": 4,
      "resolution_time_hours": 48,
      "escalation_levels": [
        {"level": 1, "wait_hours": 4, "role": "tech_lead"},
        {"level": 2, "wait_hours": 8, "role": "pm"}
      ]
    }
  },
  "priority_rules": [
    {
      "condition": "task.deadline < 24 hours",
      "action": "set_priority_to_critical"
    },
    {
      "condition": "risk.severity == 'critical' AND risk.probability == 'very_likely'",
      "action": "create_escalation_nudge"
    }
  ],
  "auto_assignment_rules": [
    {
      "condition": "task.title contains 'API'",
      "assign_to_role": "backend_developer"
    }
  ]
}
```

---

## 6. Backend Code Changes

### 6.1 Event Bus Implementation

**File**: `packages/event-bus/src/index.ts`

```typescript
import { EventEmitter } from 'events';

export type EventType =
  | 'message:received'
  | 'task:created'
  | 'task:updated'
  | 'task:completed'
  | 'risk:identified'
  | 'decision:made'
  | 'conflict:detected'
  | 'nudge:scheduled'
  | 'report:generated';

export interface EventPayload {
  eventType: EventType;
  timestamp: number;
  source: string; // 'parser-agent', 'tracker-agent', etc.
  data: any;
}

export class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
    this.setMaxListeners(50); // Support many agents
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  publish(eventType: EventType, source: string, data: any): void {
    const payload: EventPayload = {
      eventType,
      timestamp: Date.now(),
      source,
      data
    };

    console.log(`📢 [EventBus] ${eventType} from ${source}`);
    this.emit(eventType, payload);
    this.emit('*', payload); // Wildcard listener
  }

  subscribe(eventType: EventType | '*', handler: (payload: EventPayload) => void): void {
    this.on(eventType, handler);
  }

  unsubscribe(eventType: EventType | '*', handler: (payload: EventPayload) => void): void {
    this.off(eventType, handler);
  }
}

export const eventBus = EventBus.getInstance();
```

**File**: `packages/event-bus/package.json`

```json
{
  "name": "@aipm/event-bus",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@types/node": "^20.8.0"
  }
}
```

### 6.2 Parser Agent Implementation

**File**: `packages/agents/src/parser-agent.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { eventBus } from '@aipm/event-bus';
import type { Message } from '@aipm/shared';

export interface ExtractedEntity {
  type: 'task' | 'risk' | 'decision' | 'dependency';
  title: string;
  description?: string;
  owner?: string;
  deadline?: string;
  priority?: number;
  severity?: string;
  confidence: number;
  [key: string]: any;
}

export interface ParseResult {
  entities: ExtractedEntity[];
}

export class ParserAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.1, // Low temp for structured extraction
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
        responseMimeType: "application/json"
      }
    });
  }

  private buildSystemPrompt(context: {
    currentDate: string;
    currentTime: string;
    groupName: string;
    projectName?: string;
  }): string {
    return `You are a PM Parser Agent. Extract project management entities from WhatsApp messages.

CONTEXT:
- Timezone: Asia/Dubai (Gulf Standard Time)
- Today: ${context.currentDate}
- Current time: ${context.currentTime}
- Group: ${context.groupName}
- Project: ${context.projectName || 'Unknown'}

EXTRACTION RULES:
1. Tasks: Any commitment, action item, deliverable
   - Must have: title, owner (optional)
   - Optional: deadline, description
   - Examples:
     - "John will complete API by Friday"
     - "Need to review the design docs"
     - "Deploy to staging tonight"

2. Risks: Concerns, blockers, potential issues
   - Must have: description
   - Optional: severity, mitigation
   - Examples:
     - "We might miss the deadline due to resource shortage"
     - "Database migration could fail"

3. Decisions: Choices made, approvals given
   - Must have: what was decided
   - Optional: rationale, alternatives
   - Examples:
     - "We'll use PostgreSQL instead of MySQL"
     - "Approved budget increase"

4. Dependencies: Task relationships
   - Must have: task A depends on task B
   - Examples:
     - "Can't start testing until dev is done"
     - "Backend must be ready before frontend"

OUTPUT FORMAT:
Return ONLY valid JSON:
{
  "entities": [
    {
      "type": "task|risk|decision|dependency",
      "title": "string",
      "description": "string (optional)",
      "owner": "string (name or phone, optional)",
      "deadline": "ISO 8601 string or null",
      "priority": 1-4,
      "confidence": 0.0-1.0
    }
  ]
}

If no entities found, return: {"entities": []}

DATE PARSING:
- "Friday" → next Friday from ${context.currentDate}
- "tomorrow" → tomorrow's date
- "end of week" → next Sunday
- "5 PM" → 17:00 in Asia/Dubai timezone
- "EOD" → 18:00 same day`;
  }

  async parseMessage(
    message: Message,
    context: {
      groupName: string;
      projectName?: string;
    }
  ): Promise<ParseResult> {
    try {
      const now = new Date();
      const prompt = this.buildSystemPrompt({
        currentDate: now.toISOString().split('T')[0],
        currentTime: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dubai', hour12: false }),
        groupName: context.groupName,
        projectName: context.projectName
      });

      const fullPrompt = `${prompt}

MESSAGE TO ANALYZE:
Author: ${message.authorName || message.author}
Timestamp: ${new Date(message.timestamp).toISOString()}
Text: ${message.text}

Extract entities:`;

      console.log('🧠 [ParserAgent] Sending to Gemini...');
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      const parsed: ParseResult = JSON.parse(text);

      console.log(`✅ [ParserAgent] Extracted ${parsed.entities.length} entities`);

      // Publish event for each entity
      for (const entity of parsed.entities) {
        if (entity.confidence >= 0.6) { // Only high-confidence extractions
          eventBus.publish(
            entity.type === 'task' ? 'task:created' :
            entity.type === 'risk' ? 'risk:identified' :
            entity.type === 'decision' ? 'decision:made' :
            'task:created', // dependency creates a task link
            'parser-agent',
            {
              entity,
              sourceMessage: message
            }
          );
        }
      }

      return parsed;
    } catch (error) {
      console.error('❌ [ParserAgent] Error:', error);
      return { entities: [] };
    }
  }
}
```

### 6.3 Scheduler Implementation

**File**: `packages/scheduler/src/index.ts`

```typescript
import { CronJob } from 'cron';
import type { StatuzDatabase } from '@aipm/db';
import { eventBus } from '@aipm/event-bus';

export class Scheduler {
  private jobs: Map<string, CronJob> = new Map();
  private db: StatuzDatabase;

  constructor(db: StatuzDatabase) {
    this.db = db;
  }

  start(): void {
    // Daily team report at 9 AM Dubai time
    this.scheduleJob('daily-team-report', '0 9 * * *', async () => {
      console.log('⏰ [Scheduler] Triggering daily team report');
      eventBus.publish('report:scheduled', 'scheduler', {
        reportType: 'daily',
        audience: 'team'
      });
    });

    // Weekly client report at 5 PM Friday
    this.scheduleJob('weekly-client-report', '0 17 * * 5', async () => {
      console.log('⏰ [Scheduler] Triggering weekly client report');
      eventBus.publish('report:scheduled', 'scheduler', {
        reportType: 'weekly',
        audience: 'client'
      });
    });

    // Check for pending nudges every 5 minutes
    this.scheduleJob('nudge-sender', '*/5 * * * *', async () => {
      console.log('⏰ [Scheduler] Checking pending nudges');
      await this.sendPendingNudges();
    });

    // Track task deadlines every hour
    this.scheduleJob('deadline-tracker', '0 * * * *', async () => {
      console.log('⏰ [Scheduler] Checking task deadlines');
      eventBus.publish('tracker:check-deadlines', 'scheduler', {});
    });

    console.log('✅ [Scheduler] All cron jobs started');
  }

  private scheduleJob(name: string, cronTime: string, onTick: () => Promise<void>): void {
    const job = new CronJob(
      cronTime,
      onTick,
      null,
      true,
      'Asia/Dubai' // Dubai timezone
    );
    this.jobs.set(name, job);
    console.log(`📅 [Scheduler] Job '${name}' scheduled: ${cronTime}`);
  }

  private async sendPendingNudges(): Promise<void> {
    // Query DB for nudges due now
    const now = Date.now();
    const nudges = await this.db.getPendingNudges(now);

    for (const nudge of nudges) {
      eventBus.publish('nudge:send', 'scheduler', { nudge });
      await this.db.markNudgeAsSent(nudge.id);
    }
  }

  stop(): void {
    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`🛑 [Scheduler] Stopped job: ${name}`);
    }
    this.jobs.clear();
  }
}
```

### 6.4 Updated Background Service

**File**: `packages/background/src/service.ts` (modifications)

```typescript
// Add to existing BackgroundService class

import { eventBus } from '@aipm/event-bus';
import { ParserAgent } from '@aipm/agents';
import { Scheduler } from '@aipm/scheduler';

export class BackgroundService {
  // ... existing properties ...

  private parserAgent?: ParserAgent;
  private scheduler?: Scheduler;

  constructor(db: StatuzDatabase, config: AppConfig) {
    // ... existing constructor code ...

    // Initialize event bus subscriptions
    this.setupEventBusListeners();
  }

  private setupEventBusListeners(): void {
    // Listen for task creation events
    eventBus.subscribe('task:created', async (payload) => {
      console.log('📋 [BackgroundService] New task created:', payload.data);
      // Could trigger conflict detection, auto-assignment, etc.
    });

    // Listen for nudge send events
    eventBus.subscribe('nudge:send', async (payload) => {
      const nudge = payload.data.nudge;
      await this.sendMessage(nudge.recipient_phone, nudge.message_text);
      console.log(`📤 [BackgroundService] Sent nudge to ${nudge.recipient_phone}`);
    });
  }

  async initialize(): Promise<void> {
    // ... existing initialization ...

    // Initialize Parser Agent
    if (this.config.geminiApiKey) {
      this.parserAgent = new ParserAgent(this.config.geminiApiKey);
      console.log('✅ [BackgroundService] Parser Agent initialized');
    }

    // Initialize Scheduler
    this.scheduler = new Scheduler(this.db);
    this.scheduler.start();
    console.log('✅ [BackgroundService] Scheduler started');
  }

  private async processMessage(message: Message, group: Group): Promise<void> {
    // ... existing message storage ...

    // NEW: Auto-extraction if parser agent available
    if (this.parserAgent && group.isWatched) {
      try {
        const parseResult = await this.parserAgent.parseMessage(message, {
          groupName: group.name,
          projectName: group.name // Or look up from projects table
        });

        console.log(`🧠 [BackgroundService] Parsed ${parseResult.entities.length} entities from message`);

        // Store extracted entities
        for (const entity of parseResult.entities) {
          if (entity.type === 'task' && entity.confidence >= 0.6) {
            await this.db.insertTask({
              id: this.generateId(),
              projectId: group.id, // Simplified, should map to actual project
              title: entity.title,
              description: entity.description,
              ownerPhone: entity.owner,
              deadline: entity.deadline ? new Date(entity.deadline).getTime() : null,
              priority: entity.priority || 3,
              status: 'todo',
              extractedFromMessageId: message.id,
              confidenceScore: entity.confidence,
              createdAt: Date.now(),
              updatedAt: Date.now()
            });

            console.log(`✅ [BackgroundService] Created task: ${entity.title}`);
          }
        }
      } catch (error) {
        console.error('❌ [BackgroundService] Parser error:', error);
      }
    }

    // ... existing auto-response logic ...
  }

  async cleanup(): Promise<void> {
    // ... existing cleanup ...

    if (this.scheduler) {
      this.scheduler.stop();
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 6.5 New IPC Handlers

**File**: `apps/desktop/src/main.ts` (additions)

```typescript
// Add to handleIpcMessage switch statement

case 'get-projects':
  return await this.backgroundService.getProjects();

case 'create-project':
  return await this.backgroundService.createProject(message.payload);

case 'get-tasks':
  return await this.backgroundService.getTasks(message.payload);

case 'create-task':
  return await this.backgroundService.createTask(message.payload);

case 'update-task':
  return await this.backgroundService.updateTask(message.payload);

case 'get-risks':
  return await this.backgroundService.getRisks(message.payload);

case 'get-decisions':
  return await this.backgroundService.getDecisions(message.payload);

case 'get-conflicts':
  return await this.backgroundService.getConflicts();

case 'resolve-conflict':
  return await this.backgroundService.resolveConflict(message.payload);

case 'generate-report':
  const { reportType, audience, projectId } = message.payload;
  return await this.backgroundService.generateReport(reportType, audience, projectId);

case 'get-stakeholders':
  return await this.backgroundService.getStakeholders(message.payload.projectId);

case 'upsert-stakeholder':
  return await this.backgroundService.upsertStakeholder(message.payload);

case 'sync-to-jira':
  return await this.backgroundService.syncToJira(message.payload);
```

---

## 7. Frontend/UI Changes

### 7.1 New Pages

#### Project Dashboard

**File**: `apps/renderer/src/pages/ProjectDashboard.tsx`

```typescript
import { useState, useEffect } from 'react';
import { BarChart, AlertTriangle, CheckCircle, Clock, Users } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export function ProjectDashboard() {
  const { getProjects, getTasks, getRisks } = useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const projs = await getProjects();
    setProjects(projs);

    // Calculate stats
    const allTasks = await getTasks();
    const allRisks = await getRisks();

    setStats({
      totalProjects: projs.length,
      activeProjects: projs.filter(p => p.status === 'active').length,
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(t => t.status === 'done').length,
      overdueTasks: allTasks.filter(t => t.deadline && t.deadline < Date.now() && t.status !== 'done').length,
      criticalRisks: allRisks.filter(r => r.severity === 'critical' && r.status === 'open').length
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Project Dashboard</h1>
        <p className="text-gray-600">Overview of all active projects</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center space-x-3">
              <BarChart className="h-8 w-8 text-primary-600" />
              <div>
                <div className="text-2xl font-bold">{stats.activeProjects}</div>
                <div className="text-sm text-gray-500">Active Projects</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-8 w-8 text-success-600" />
              <div>
                <div className="text-2xl font-bold">{stats.completedTasks}</div>
                <div className="text-sm text-gray-500">Completed Tasks</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-warning-600" />
              <div>
                <div className="text-2xl font-bold">{stats.overdueTasks}</div>
                <div className="text-sm text-gray-500">Overdue Tasks</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-error-600" />
              <div>
                <div className="text-2xl font-bold">{stats.criticalRisks}</div>
                <div className="text-sm text-gray-500">Critical Risks</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project List */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Active Projects</h2>
        <div className="space-y-3">
          {projects.filter(p => p.status === 'active').map(project => (
            <div key={project.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{project.name}</h3>
                  <p className="text-sm text-gray-500">{project.clientName}</p>
                </div>
                <div className="text-right">
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    project.priority === 1 ? 'bg-error-100 text-error-800' :
                    project.priority === 2 ? 'bg-warning-100 text-warning-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.slaTier || 'Standard'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### Task Board (Kanban)

**File**: `apps/renderer/src/pages/TaskBoard.tsx`

```typescript
import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useApp } from '../contexts/AppContext';
import { Clock, User, AlertCircle } from 'lucide-react';

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'blocked', title: 'Blocked', color: 'bg-red-100' },
  { id: 'done', title: 'Done', color: 'bg-green-100' }
];

export function TaskBoard() {
  const { getTasks, updateTask } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, [selectedProject]);

  const loadTasks = async () => {
    const allTasks = await getTasks({ projectId: selectedProject });
    setTasks(allTasks);
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;

    await updateTask({ id: taskId, status: newStatus });
    await loadTasks();
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(t => t.status === status);
  };

  return (
    <div className="p-6 h-full">
      <h1 className="text-2xl font-bold mb-6">Task Board</h1>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-4 gap-4 h-full">
          {COLUMNS.map(column => (
            <div key={column.id} className="flex flex-col">
              <div className={`${column.color} p-3 rounded-t-lg font-semibold`}>
                {column.title} ({getTasksByStatus(column.id).length})
              </div>

              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 bg-gray-50 p-2 space-y-2 overflow-y-auto"
                  >
                    {getTasksByStatus(column.id).map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="bg-white p-3 rounded shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="font-medium text-sm mb-2">{task.title}</div>

                            {task.ownerAlias && (
                              <div className="flex items-center text-xs text-gray-600 mb-1">
                                <User className="h-3 w-3 mr-1" />
                                {task.ownerAlias}
                              </div>
                            )}

                            {task.deadline && (
                              <div className={`flex items-center text-xs ${
                                task.deadline < Date.now() ? 'text-error-600' : 'text-gray-600'
                              }`}>
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(task.deadline).toLocaleDateString()}
                              </div>
                            )}

                            {task.status === 'blocked' && (
                              <div className="flex items-center text-xs text-error-600 mt-2">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {task.blockerReason}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
```

#### Risk Register

**File**: `apps/renderer/src/pages/RiskRegister.tsx`

```typescript
import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export function RiskRegister() {
  const { getRisks } = useApp();
  const [risks, setRisks] = useState<Risk[]>([]);

  useEffect(() => {
    loadRisks();
  }, []);

  const loadRisks = async () => {
    const allRisks = await getRisks();
    setRisks(allRisks.sort((a, b) => {
      const severityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-error-100 text-error-800 border-error-300';
      case 'high': return 'bg-warning-100 text-warning-800 border-warning-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Risk Register</h1>
        <p className="text-gray-600">Track and manage project risks</p>
      </div>

      <div className="space-y-4">
        {risks.map(risk => (
          <div key={risk.id} className={`card border-l-4 ${getSeverityColor(risk.severity)}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <AlertTriangle className={`h-5 w-5 ${
                    risk.severity === 'critical' ? 'text-error-600' :
                    risk.severity === 'high' ? 'text-warning-600' :
                    'text-yellow-600'
                  }`} />
                  <h3 className="font-semibold text-lg">{risk.title}</h3>
                </div>

                <p className="text-gray-700 mb-3">{risk.description}</p>

                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <span className="font-medium">Category:</span> {risk.category}
                  </div>
                  <div>
                    <span className="font-medium">Probability:</span> {risk.probability}
                  </div>
                  <div>
                    <span className="font-medium">Owner:</span> {risk.ownerAlias || 'Unassigned'}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{' '}
                    <span className={`px-2 py-1 rounded text-xs ${
                      risk.status === 'open' ? 'bg-error-100 text-error-800' :
                      risk.status === 'mitigated' ? 'bg-success-100 text-success-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {risk.status}
                    </span>
                  </div>
                </div>

                {risk.mitigationPlan && (
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="font-medium text-sm mb-1">Mitigation Plan:</div>
                    <p className="text-sm text-gray-700">{risk.mitigationPlan}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 7.2 Updated Navigation

**File**: `apps/renderer/src/components/Layout.tsx` (update navigation array)

```typescript
const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Projects', href: '/projects', icon: Briefcase },
  { name: 'Task Board', href: '/tasks', icon: CheckSquare },
  { name: 'Risks', href: '/risks', icon: AlertTriangle },
  { name: 'Decisions', href: '/decisions', icon: GitBranch },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Groups', href: '/groups', icon: Users },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Contacts', href: '/contacts', icon: UserCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
];
```

---

## 8. Example Reports & Digests

### 8.1 Daily Team Report

```markdown
# 📊 Daily Team Report - SAP S/4HANA Implementation
**Date**: January 10, 2025 (Thursday)
**Project**: SAP-001
**Report for**: Development Team

---

## ✅ Completed Yesterday (Jan 9)
- ✓ API integration for invoice module (John Developer) - **ON TIME**
- ✓ Database migration script tested (Sarah DB Admin) - **ON TIME**
- ✓ User acceptance testing for Phase 1 (Client: Acme Corp) - **APPROVED**

## 🎯 Planned for Today (Jan 10)
- [ ] Deploy API to staging environment (John Developer) - **Due: 5 PM**
- [ ] Review security scan results (Alice Security) - **Due: EOD**
- [ ] Update technical documentation (Bob Tech Writer) - **Due: EOD**

## 🚫 Blockers
1. **CRITICAL**: Production database credentials not yet provided
   - **Impact**: Cannot deploy to production (scheduled for Jan 12)
   - **Owner**: Client IT Team
   - **Action**: Escalated to PM for client follow-up

2. **HIGH**: Third-party API rate limit exceeded during testing
   - **Impact**: Integration tests failing
   - **Owner**: John Developer
   - **Action**: Waiting for vendor to increase limit

## ⚠️ Risks (New/Updated)
- **NEW RISK**: Database migration might take longer than 2-hour maintenance window
  - **Severity**: High
  - **Mitigation**: Prepared rollback script, will test on replica first

## 🆘 Who Needs Help?
- **Sarah DB Admin**: Needs code review for migration script (Urgent - deploy tonight)
- **John Developer**: Needs access to production logs for debugging

## 🎉 Quick Wins
- Fixed 5 critical bugs reported by QA team
- Performance improved by 30% after query optimization

---

**Next Standup**: Tomorrow 9:00 AM
**Questions?** Reply in WhatsApp group or DM the PM
```

### 8.2 Weekly Client Report

```markdown
# 📈 Weekly Status Report - SAP S/4HANA Implementation
**Week Ending**: January 10, 2025
**Project**: SAP-001
**Client**: Acme Corporation
**Project Manager**: Ahmed Khan

---

## Executive Summary
This week we successfully completed Phase 1 UAT and began Phase 2 development. Overall project is **ON TRACK** for the February 15 go-live date. One medium-severity risk identified related to data migration timeline.

---

## 🎯 Milestones Achieved This Week
✅ **Phase 1 User Acceptance Testing Completed** (Jan 8)
   - All 47 test cases passed
   - Client approval received

✅ **API Integration Module Deployed to Staging** (Jan 10)
   - Invoice processing API live
   - Performance: < 200ms response time (target: 300ms)

✅ **Security Audit Completed** (Jan 9)
   - Zero critical vulnerabilities
   - 2 medium-severity issues fixed same day

---

## 📅 Upcoming Deliverables (Next Week)
| Deliverable | Owner | Due Date | Status |
|------------|-------|----------|--------|
| Production deployment (Phase 1) | DevOps Team | Jan 15 | On track |
| Training materials for end users | Training Team | Jan 16 | On track |
| Phase 2 design document | Tech Lead | Jan 12 | On track |

---

## 🚨 Risks & Issues

### MEDIUM: Data Migration Timeline
**Description**: Historical data migration estimated to take 6 hours, but maintenance window is only 4 hours.

**Impact**: Potential delay in go-live date if not resolved.

**Mitigation Plan**:
- Optimized migration scripts (reduced time to 5 hours)
- Exploring option to split migration across two maintenance windows
- Client IT team reviewing possibility of extended window

**Status**: Monitoring

---

## 📊 Project Health
| Metric | Status | Details |
|--------|--------|---------|
| **Schedule** | 🟢 On Track | 2 days ahead of baseline |
| **Budget** | 🟢 On Track | 87% consumed, 90% work complete |
| **Scope** | 🟢 On Track | No change requests this week |
| **Quality** | 🟢 On Track | Zero production defects |
| **Team Morale** | 🟢 Good | Team velocity stable |

---

## 📈 Progress Metrics
- **Tasks Completed**: 24 / 28 planned for this week (86%)
- **Defects Fixed**: 12 (all non-critical)
- **Code Coverage**: 94% (target: 90%)
- **Uptime (Staging)**: 99.8%

---

## 💬 Decisions Made This Week
1. **Approved**: Use PostgreSQL for analytics database (previously undecided)
2. **Approved**: Extend Phase 2 timeline by 1 week to add requested reporting feature

---

## 👥 Next Week's Plan
1. Production deployment of Phase 1 modules
2. Begin Phase 2 development (reporting module)
3. Conduct end-user training sessions (2 sessions, 50 users)
4. Client demo of Phase 1 features (Jan 14, 2 PM)

---

## ℹ️ Action Items for Client
- [ ] Provide production database credentials by Jan 12
- [ ] Confirm availability for go-live support (Jan 15, 6 AM - 10 AM)
- [ ] Review and approve Phase 2 design document

---

**Questions or Concerns?**
Contact: Ahmed Khan (PM) | +971-50-123-4567 | ahmed@acme-si.com

**Next Report**: January 17, 2025
```

### 8.3 Weekly Executive Report

```markdown
# 🎯 Executive Summary - Projects Portfolio
**Week Ending**: January 10, 2025
**Prepared for**: Management Team
**Prepared by**: AI Project Manager (AIPM)

---

## Portfolio Overview

| Metric | Value | Trend |
|--------|-------|-------|
| **Active Projects** | 5 | → |
| **Total Budget** | $2.4M | → |
| **Consumed** | $1.8M (75%) | ↑ 5% |
| **Projects On Track** | 4 / 5 (80%) | ↓ 1 |
| **Critical Risks** | 2 | ↑ 1 |
| **Overdue Deliverables** | 0 | → |

---

## 🚨 Top 3 Risks (Require Attention)

### 1. CRITICAL: SAP PS Integration - Resource Shortage
**Project**: SAP S/4HANA Implementation (Acme Corp)
**Impact**: Potential 2-week delay in Phase 3 (€50K revenue at risk)
**Root Cause**: Senior SAP consultant on medical leave, replacement not available
**Recommendation**: Approve emergency contractor hire ($15K/week for 4 weeks)
**Decision Needed By**: Jan 12

### 2. HIGH: Oracle Cloud Migration - Data Security Compliance
**Project**: Oracle Cloud Migration (TechCo)
**Impact**: Cannot go-live without compliance certification
**Root Cause**: New GDPR requirements not in original scope
**Recommendation**: Approve scope change request ($30K, 1-week timeline extension)
**Decision Needed By**: Jan 15

---

## 💰 Financial Summary

| Project | Budget | Consumed | Remaining | Health |
|---------|--------|----------|-----------|--------|
| SAP S/4HANA (Acme) | $800K | $620K (78%) | $180K | 🟢 |
| Oracle Cloud (TechCo) | $600K | $480K (80%) | $120K | 🟡 |
| Mobile App (RetailCo) | $400K | $280K (70%) | $120K | 🟢 |
| ERP Upgrade (ManufactureCo) | $350K | $250K (71%) | $100K | 🟢 |
| Data Warehouse (FinCo) | $250K | $170K (68%) | $80K | 🟢 |

**Legend**: 🟢 On Budget | 🟡 Watch | 🔴 Over Budget

---

## 📊 Client SLA Performance

| Client | SLA Tier | Response Time | Resolution Time | Satisfaction |
|--------|----------|---------------|-----------------|--------------|
| Acme Corp | Platinum | 1.2h (Target: 2h) | 18h (Target: 24h) | 4.8/5 ⭐ |
| TechCo | Gold | 3.5h (Target: 4h) | 40h (Target: 48h) | 4.5/5 ⭐ |
| RetailCo | Gold | 2.8h (Target: 4h) | 35h (Target: 48h) | 4.7/5 ⭐ |

---

## 🎯 Key Decisions Made This Week
1. **Approved**: Acme Corp Phase 2 timeline extension (+1 week) for additional features - **Revenue Impact**: +$15K
2. **Approved**: TechCo cloud provider change (AWS → Azure) - **Cost Impact**: Neutral
3. **Rejected**: ManufactureCo scope expansion request - **Reason**: Out of budget, proposed for Phase 2

---

## 📅 Upcoming Milestones (Next 2 Weeks)
- **Jan 15**: Acme Corp Phase 1 go-live (HIGH VISIBILITY)
- **Jan 17**: TechCo security audit completion (COMPLIANCE REQUIRED)
- **Jan 20**: RetailCo mobile app beta release (CLIENT DEMO)

---

## 🏆 Achievements This Week
- ✅ Zero production incidents across all projects
- ✅ Acme Corp UAT completed ahead of schedule
- ✅ Team utilization at optimal 85% (not overallocated)
- ✅ All client invoices sent on time

---

## ⚠️ Areas of Concern
1. **Talent Shortage**: SAP consultants market is tight, may affect future projects
2. **Tool Licensing**: Jira/Confluence licenses expiring next month (renewal needed)

---

**Action Items for Leadership**:
- [ ] **URGENT**: Approve emergency contractor hire for SAP project (Jan 12)
- [ ] Approve Oracle Cloud compliance scope change (Jan 15)
- [ ] Review Q1 resource allocation plan (Jan 20)

---

**Next Executive Report**: January 17, 2025
**Dashboard Access**: [Internal Link - Future Feature]
```

---

## 9. Rollout Roadmap

### Phase 1: Foundation (Weeks 1-3)
**Goal**: Establish core infrastructure for autonomous PM

**Deliverables**:
1. ✅ Database migrations (all 10 tables)
2. ✅ Event bus implementation
3. ✅ Parser Agent (basic extraction)
4. ✅ Updated BackgroundService with event integration
5. ✅ Basic UI for Projects and Tasks

**Success Criteria**:
- [ ] Can extract tasks from WhatsApp messages
- [ ] Tasks stored in database with confidence scores
- [ ] Basic task board displays tasks
- [ ] Event bus operational with at least 3 events

**Testing**:
- Send test messages with tasks → Verify auto-extraction
- Check database for inserted tasks
- Verify event logs in console

---

### Phase 2: Intelligence (Weeks 4-6)
**Goal**: Add planning, tracking, and conflict detection

**Deliverables**:
1. ✅ Planner Agent (validation, enrichment)
2. ✅ Tracker Agent (deadline monitoring, nudge creation)
3. ✅ Conflict Agent (basic deadline conflicts)
4. ✅ Policy Engine (SLA rules)
5. ✅ Scheduler (cron jobs)
6. ✅ Execution nudges system

**Success Criteria**:
- [ ] Auto-assignment of tasks based on context
- [ ] Deadline reminders sent 1 day before
- [ ] Overdue escalations triggered
- [ ] Conflict detection for double-booked resources

**Testing**:
- Create tasks with conflicting deadlines → Verify conflict alert
- Wait for scheduled nudge time → Verify WhatsApp message sent
- Assign multiple tasks to one person same day → Verify overload warning

---

### Phase 3: Reporting & Insights (Weeks 7-9)
**Goal**: Automated report generation

**Deliverables**:
1. ✅ Reporter Agent (all 3 report types)
2. ✅ Report templates (team/client/exec)
3. ✅ Scheduled reports (daily 9 AM, weekly Friday 5 PM)
4. ✅ UI for report generation and history
5. ✅ Risk register UI
6. ✅ Decision log UI

**Success Criteria**:
- [ ] Daily team report auto-sent to WhatsApp at 9 AM
- [ ] Weekly client report generated on demand
- [ ] Executive report includes portfolio metrics
- [ ] Reports stored in database for audit

**Testing**:
- Manually trigger daily report → Verify format and content
- Wait for scheduled time → Verify auto-send
- Generate executive report for multiple projects → Verify aggregation

---

### Phase 4: Jira Integration (Weeks 10-12)
**Goal**: Bi-directional sync with Jira

**Deliverables**:
1. ✅ Jira REST API adapter
2. ✅ Jira sync state table and logic
3. ✅ UI for Jira configuration
4. ✅ Conflict resolution for sync conflicts
5. ✅ Webhook listener for Jira updates

**Success Criteria**:
- [ ] Create task in AIPM → Syncs to Jira
- [ ] Update task in Jira → Syncs back to AIPM
- [ ] Detect and resolve sync conflicts
- [ ] Display Jira link in task UI

**Testing**:
- Create task locally → Verify Jira issue created
- Update in Jira → Verify AIPM reflects change
- Create conflict (edit in both) → Verify conflict UI

---

### Phase 5: SAP PS Integration (Weeks 13-16)
**Goal**: Integrate with SAP Project System

**Deliverables**:
1. ✅ SAP PS adapter (OData/REST API)
2. ✅ Project/WBS sync
3. ✅ Budget and actuals sync
4. ✅ Resource allocation sync
5. ✅ Mapping between AIPM and SAP entities

**Success Criteria**:
- [ ] Project structure synced from SAP PS
- [ ] Budget data visible in AIPM
- [ ] Resource hours updated in SAP from AIPM
- [ ] Bi-directional updates working

**Testing**:
- Create WBS in SAP → Verify AIPM project created
- Log hours in WhatsApp → Verify SAP actuals updated
- Change budget in SAP → Verify AIPM reflects update

---

### Rollout Timeline (Gantt-style)

```
Week  | 1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16
------+--------------------------------------------------
Phase 1: Foundation          [████████]
Phase 2: Intelligence                  [██████████]
Phase 3: Reporting                              [████████]
Phase 4: Jira Integration                             [██████████]
Phase 5: SAP PS Integration                                  [████████████]

Milestones:
Week 3  : ✓ Basic extraction working
Week 6  : ✓ Autonomous nudges operational
Week 9  : ✓ All reports auto-generated
Week 12 : ✓ Jira sync live
Week 16 : ✓ Full SAP integration
```

---

## 10. Code Snippets

### 10.1 Database Helper Methods

**File**: `packages/db/src/database.ts` (additions)

```typescript
// Task management
async insertTask(task: Partial<Task>): Promise<void> {
  return new Promise((resolve, reject) => {
    this.db.run(`
      INSERT INTO tasks (
        id, project_id, title, description, status, priority,
        owner_phone, owner_alias, deadline, extracted_from_message_id,
        confidence_score, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      task.id,
      task.projectId,
      task.title,
      task.description || null,
      task.status || 'todo',
      task.priority || 3,
      task.ownerPhone || null,
      task.ownerAlias || null,
      task.deadline || null,
      task.extractedFromMessageId || null,
      task.confidenceScore || null,
      task.createdAt || Date.now(),
      task.updatedAt || Date.now()
    ], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async getTasks(filter?: {
  projectId?: string;
  status?: string;
  ownerPhone?: string;
}): Promise<Task[]> {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params: any[] = [];

    if (filter?.projectId) {
      query += ' AND project_id = ?';
      params.push(filter.projectId);
    }
    if (filter?.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter?.ownerPhone) {
      query += ' AND owner_phone = ?';
      params.push(filter.ownerPhone);
    }

    query += ' ORDER BY deadline ASC, priority ASC';

    this.db.all(query, params, (err, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows.map(row => ({
        id: row.id,
        projectId: row.project_id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        ownerPhone: row.owner_phone,
        ownerAlias: row.owner_alias,
        deadline: row.deadline,
        completedAt: row.completed_at,
        extractedFromMessageId: row.extracted_from_message_id,
        confidenceScore: row.confidence_score,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })));
    });
  });
}

// Risk management
async insertRisk(risk: Partial<Risk>): Promise<void> {
  return new Promise((resolve, reject) => {
    this.db.run(`
      INSERT INTO risks (
        id, project_id, title, description, category, severity,
        probability, status, owner_phone, owner_alias,
        extracted_from_message_id, confidence_score,
        identified_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      risk.id,
      risk.projectId,
      risk.title,
      risk.description || null,
      risk.category || null,
      risk.severity || 'medium',
      risk.probability || 'possible',
      risk.status || 'open',
      risk.ownerPhone || null,
      risk.ownerAlias || null,
      risk.extractedFromMessageId || null,
      risk.confidenceScore || null,
      risk.identifiedAt || Date.now(),
      risk.createdAt || Date.now(),
      risk.updatedAt || Date.now()
    ], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Nudge management
async getPendingNudges(beforeTimestamp: number): Promise<ExecutionNudge[]> {
  return new Promise((resolve, reject) => {
    this.db.all(`
      SELECT * FROM execution_nudges
      WHERE status = 'pending'
        AND scheduled_at <= ?
      ORDER BY scheduled_at ASC
    `, [beforeTimestamp], (err, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows.map(row => ({
        id: row.id,
        nudgeType: row.nudge_type,
        entityType: row.entity_type,
        entityId: row.entity_id,
        recipientPhone: row.recipient_phone,
        messageText: row.message_text,
        scheduledAt: row.scheduled_at,
        sentAt: row.sent_at,
        status: row.status,
        escalationLevel: row.escalation_level,
        createdAt: row.created_at
      })));
    });
  });
}

async markNudgeAsSent(nudgeId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    this.db.run(`
      UPDATE execution_nudges
      SET status = 'sent', sent_at = ?
      WHERE id = ?
    `, [Date.now(), nudgeId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
```

### 10.2 Type Definitions

**File**: `packages/shared/src/types.ts` (additions)

```typescript
export interface Project {
  id: string;
  name: string;
  code?: string;
  clientName?: string;
  whatsappGroupId?: string;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 1 | 2 | 3 | 4; // 1=critical, 4=low
  slaTier?: 'platinum' | 'gold' | 'silver' | 'bronze';
  startDate?: number;
  targetEndDate?: number;
  actualEndDate?: number;
  budgetHours?: number;
  consumedHours?: number;
  projectManager?: string;
  technicalLead?: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  projectId: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
  priority: 1 | 2 | 3 | 4;
  ownerPhone?: string;
  ownerAlias?: string;
  createdByPhone?: string;
  createdByAlias?: string;
  estimatedHours?: number;
  actualHours?: number;
  deadline?: number;
  completedAt?: number;
  blockerReason?: string;
  extractedFromMessageId?: string;
  confidenceScore?: number;
  tags?: string[]; // Will be stored as JSON string
  createdAt: number;
  updatedAt: number;
}

export interface Risk {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  category?: 'technical' | 'resource' | 'schedule' | 'scope' | 'external';
  severity: 'critical' | 'high' | 'medium' | 'low';
  probability: 'very_likely' | 'likely' | 'possible' | 'unlikely';
  impact?: string;
  mitigationPlan?: string;
  ownerPhone?: string;
  ownerAlias?: string;
  status: 'open' | 'monitoring' | 'mitigated' | 'realized' | 'closed';
  identifiedAt: number;
  extractedFromMessageId?: string;
  confidenceScore?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Decision {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  rationale?: string;
  alternativesConsidered?: string[]; // JSON
  impact?: string;
  decisionMakerPhone?: string;
  decisionMakerAlias?: string;
  stakeholders?: string[]; // JSON
  status: 'proposed' | 'approved' | 'rejected' | 'implemented';
  decidedAt?: number;
  implementedAt?: number;
  extractedFromMessageId?: string;
  confidenceScore?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ExecutionNudge {
  id: string;
  nudgeType: 'reminder' | 'escalation' | 'status_request' | 'blocker_alert';
  entityType: 'task' | 'risk' | 'decision' | 'project';
  entityId: string;
  recipientPhone: string;
  messageText: string;
  scheduledAt: number;
  sentAt?: number;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  escalationLevel: number;
  createdAt: number;
}

export interface ConflictResolution {
  id: string;
  conflictType: 'deadline' | 'resource' | 'priority' | 'dependency';
  description: string;
  affectedEntities: Array<{ type: string; id: string }>; // JSON
  severity: 'critical' | 'high' | 'medium' | 'low';
  detectedAt: number;
  resolutionOptions?: string[]; // JSON
  chosenResolution?: string;
  resolvedAt?: number;
  resolvedByPhone?: string;
  status: 'open' | 'resolved' | 'acknowledged' | 'ignored';
  createdAt: number;
  updatedAt: number;
}

export interface Report {
  id: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
  audience: 'team' | 'client' | 'executive';
  projectId?: string; // null = all projects
  periodStart: number;
  periodEnd: number;
  generatedAt: number;
  generatedBy: string; // 'system' or user phone
  format: 'markdown' | 'json' | 'html';
  content: string;
  summary?: string;
  sentTo?: string[]; // JSON
  filePath?: string;
  createdAt: number;
}
```

### 10.3 React Context Updates

**File**: `apps/renderer/src/contexts/AppContext.tsx` (additions)

```typescript
// Add to AppContextType interface
export interface AppContextType {
  // ... existing methods ...

  // Project management
  getProjects: () => Promise<Project[]>;
  createProject: (project: Partial<Project>) => Promise<Project>;
  updateProject: (project: Partial<Project>) => Promise<void>;

  // Task management
  getTasks: (filter?: { projectId?: string; status?: string }) => Promise<Task[]>;
  createTask: (task: Partial<Task>) => Promise<Task>;
  updateTask: (task: Partial<Task>) => Promise<void>;

  // Risk management
  getRisks: (filter?: { projectId?: string }) => Promise<Risk[]>;

  // Decision management
  getDecisions: (filter?: { projectId?: string }) => Promise<Decision[]>;

  // Conflict management
  getConflicts: () => Promise<ConflictResolution[]>;
  resolveConflict: (conflictId: string, resolution: string) => Promise<void>;

  // Reporting
  generateReport: (type: string, audience: string, projectId?: string) => Promise<Report>;
  getReports: () => Promise<Report[]>;
}

// Add to AppProvider component
export function AppProvider({ children }: { children: React.ReactNode }) {
  // ... existing state ...

  const getProjects = async (): Promise<Project[]> => {
    return await invoke('get-projects', {});
  };

  const getTasks = async (filter?: any): Promise<Task[]> => {
    return await invoke('get-tasks', filter || {});
  };

  const createTask = async (task: Partial<Task>): Promise<Task> => {
    return await invoke('create-task', task);
  };

  const updateTask = async (task: Partial<Task>): Promise<void> => {
    return await invoke('update-task', task);
  };

  const getRisks = async (filter?: any): Promise<Risk[]> => {
    return await invoke('get-risks', filter || {});
  };

  const getDecisions = async (filter?: any): Promise<Decision[]> => {
    return await invoke('get-decisions', filter || {});
  };

  const getConflicts = async (): Promise<ConflictResolution[]> => {
    return await invoke('get-conflicts', {});
  };

  const generateReport = async (type: string, audience: string, projectId?: string): Promise<Report> => {
    return await invoke('generate-report', { reportType: type, audience, projectId });
  };

  // ... return in context value ...
}
```

---

## Summary & Next Steps

This transformation plan provides:

1. ✅ **Gap Analysis**: Clear identification of what's missing
2. ✅ **Target Architecture**: Complete system design with agents, event bus, scheduler
3. ✅ **Data Model**: 10 new SQL tables with migrations
4. ✅ **Agent Prompts**: Detailed system prompts and JSON schemas for each agent
5. ✅ **Backend Code**: Event bus, agents, scheduler implementations
6. ✅ **Frontend UI**: New pages for projects, tasks, risks, decisions
7. ✅ **Reports**: 3 example reports (team/client/exec) with different tones
8. ✅ **Roadmap**: 5-phase rollout over 16 weeks

### Immediate Next Steps:
1. Review and approve this transformation plan
2. Set up development branch: `git checkout -b feature/ai-pm-transformation`
3. Begin Phase 1: Run database migrations
4. Implement event bus package
5. Build Parser Agent
6. Test basic extraction flow

### Key Success Metrics:
- **Week 3**: 80% task extraction accuracy
- **Week 6**: 95% on-time nudge delivery
- **Week 9**: 100% automated report generation
- **Week 12**: Jira sync with <5% conflicts
- **Week 16**: Full SAP integration operational

**Questions? Let's discuss which phase to start with!**
