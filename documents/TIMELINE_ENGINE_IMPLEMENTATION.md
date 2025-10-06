# Timeline Engine Implementation Guide

**Status:** Partially Complete
**Version:** 2.6.1+timeline
**Last Updated:** 2025-10-06

---

## ✅ Completed So Far

1. **Timeline Types** (`packages/background/src/types/timeline.ts`) - ✅ DONE
   - All interfaces defined for TimelineState, deltas, requests, responses

2. **Database Migration** (`packages/db/src/migrations/001_add_timeline_tables.sql`) - ✅ DONE
   - event_log table
   - task_history table
   - Added timelineUpdatedAt, timelineVersion, lastAiReasoning to projects

3. **Timeline Engine Core** (`packages/background/src/timeline-engine.ts`) - ✅ DONE
   - Queue management with debouncing
   - Circuit breaker and rate limiting
   - Event processing logic
   - State management

4. **AI Service Update** (`packages/background/src/ai-service.ts`) - ✅ DONE
   - Added `generateTimelineUpdate()` method
   - Extracted `validateAndCleanGantt()` for reuse
   - JSON response parsing and validation

---

## 🔧 Remaining Implementation Tasks

### Task 1: Update Database Layer

**File:** `packages/db/src/database.ts`

Add these methods to the Database class:

```typescript
/**
 * Insert event log entry
 */
async insertEventLog(entry: EventLogEntry): Promise<void> {
  const stmt = this.db.prepare(`
    INSERT INTO event_log (id, groupId, source, payload, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(entry.id, entry.groupId, entry.source, entry.payload, entry.createdAt);
}

/**
 * Get event log for a group
 */
async getEventLog(groupId: string, limit: number = 100): Promise<EventLogEntry[]> {
  const stmt = this.db.prepare(`
    SELECT * FROM event_log
    WHERE groupId = ?
    ORDER BY createdAt DESC
    LIMIT ?
  `);
  return stmt.all(groupId, limit) as EventLogEntry[];
}

/**
 * Insert task history entry
 */
async insertTaskHistory(entry: TaskHistoryEntry): Promise<void> {
  const stmt = this.db.prepare(`
    INSERT INTO task_history (id, taskId, change, at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(entry.id, entry.taskId, entry.change, entry.at);
}

/**
 * Get task history
 */
async getTaskHistory(taskId: string, limit: number = 50): Promise<TaskHistoryEntry[]> {
  const stmt = this.db.prepare(`
    SELECT * FROM task_history
    WHERE taskId = ?
    ORDER BY at DESC
    LIMIT ?
  `);
  return stmt.all(taskId, limit) as TaskHistoryEntry[];
}

/**
 * Save milestone
 */
async saveMilestone(milestone: any): Promise<void> {
  const stmt = this.db.prepare(`
    INSERT INTO milestones (id, groupId, projectId, title, description, dueDate, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    milestone.id,
    milestone.groupId,
    milestone.projectId,
    milestone.title,
    milestone.description,
    milestone.dueDate,
    milestone.status,
    milestone.createdAt
  );
}

/**
 * Update milestone
 */
async updateMilestone(id: string, updates: any): Promise<void> {
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);

  const stmt = this.db.prepare(`
    UPDATE milestones
    SET ${fields}
    WHERE id = ?
  `);
  stmt.run(...values, id);
}
```

**Import Required Types:**
```typescript
import type { EventLogEntry, TaskHistoryEntry } from '../background/src/types/timeline';
```

---

### Task 2: Update Background Service

**File:** `packages/background/src/service.ts`

#### 2a. Add Timeline Engine Instance

```typescript
// At top of file
import { TimelineEngine } from './timeline-engine';
import type { TimelineState } from './types/timeline';

// In BackgroundService class
export class BackgroundService {
  // ... existing properties
  private timelineEngine!: TimelineEngine;

  constructor(db: Database, eventBus: EventBus) {
    // ... existing code
    this.timelineEngine = new TimelineEngine(this.db, this.aiService);
  }

  async initialize() {
    // ... existing code
    await this.timelineEngine.initialize();
  }
}
```

#### 2b. Add Timeline Methods

```typescript
/**
 * Get timeline state for a group
 */
async getTimelineState(groupId: string): Promise<TimelineState | null> {
  return await this.timelineEngine.getState(groupId);
}

/**
 * Force immediate timeline refresh
 */
async forceTimelineRefresh(groupId: string): Promise<void> {
  await this.timelineEngine.forceRefresh(groupId);
}

/**
 * Get timeline history
 */
async getTimelineHistory(groupId: string, limit?: number): Promise<any[]> {
  return await this.timelineEngine.getHistory(groupId, limit);
}
```

#### 2c. Update Context Save Handler

Find the `saveGroupContext()` method and add event emission:

```typescript
async saveGroupContext(groupId: string, context: string): Promise<void> {
  await this.db.saveGroupContext(groupId, context);

  // NEW: Emit context delta to timeline engine
  await this.timelineEngine.onContextDelta({
    groupId,
    fullContext: context,
    timestamp: Date.now()
  });
}
```

---

### Task 3: Update WhatsApp Service

**File:** `packages/background/src/whatsapp-service.ts`

#### 3a. Import Timeline Types

```typescript
import type { MessageDelta } from './types/timeline';
```

#### 3b. Emit Message Deltas

Find the `on('message')` handler and add:

```typescript
client.on('message', async (message) => {
  const chat = await message.getChat();

  if (chat.isGroup) {
    // ... existing save logic ...

    // NEW: Emit message delta to timeline engine
    const delta: MessageDelta = {
      groupId: chat.id._serialized,
      author: message.author || message.from,
      authorName: message._data.notifyName || undefined,
      text: message.body,
      timestamp: message.timestamp * 1000, // Convert to ms
      isFromMe: message.fromMe
    };

    eventBus.emit('timeline:messageDelta', delta);
  }
});
```

#### 3c. Emit History Deltas on Connection

Find the connection/initialization logic and add history replay:

```typescript
client.on('ready', async () => {
  console.log('WhatsApp client ready');

  // Emit historical messages as deltas
  const chats = await client.getChats();
  for (const chat of chats) {
    if (chat.isGroup) {
      const messages = await chat.fetchMessages({ limit: 100 });

      for (const message of messages.reverse()) {
        const delta: MessageDelta = {
          groupId: chat.id._serialized,
          author: message.author || message.from,
          authorName: message._data.notifyName || undefined,
          text: message.body,
          timestamp: message.timestamp * 1000,
          isFromMe: message.fromMe
        };

        eventBus.emit('timeline:messageDelta', delta);
      }
    }
  }
});
```

---

### Task 4: Connect Event Bus

**File:** `packages/background/src/service.ts` (in initialize method)

```typescript
async initialize() {
  // ... existing code ...

  // Subscribe timeline engine to event bus
  this.eventBus.on('timeline:messageDelta', async (delta: MessageDelta) => {
    await this.timelineEngine.onMessageDelta(delta);
  });

  this.eventBus.on('timeline:contextDelta', async (delta: ContextDelta) => {
    await this.timelineEngine.onContextDelta(delta);
  });
}
```

---

### Task 5: Add IPC Handlers

**File:** `apps/desktop/src/main.ts`

Add these handlers in the IPC registration section:

```typescript
// Timeline IPC Handlers
ipcMain.handle('timeline:getState', async (_, groupId: string) => {
  return await backgroundService.getTimelineState(groupId);
});

ipcMain.handle('timeline:forceRefresh', async (_, groupId: string) => {
  await backgroundService.forceTimelineRefresh(groupId);
  return { success: true };
});

ipcMain.handle('timeline:getHistory', async (_, groupId: string, limit?: number) => {
  return await backgroundService.getTimelineHistory(groupId, limit);
});
```

---

### Task 6: Update Projects UI

**File:** `apps/renderer/src/pages/Projects.tsx`

#### 6a. Add Live Status Indicator

```typescript
import { RefreshCw } from 'lucide-react';

// In component
const [liveProjects, setLiveProjects] = useState<Set<string>>(new Set());

// Check if project is "live" (updated in last 15s)
const isLive = (project: Project) => {
  if (!project.timelineUpdatedAt) return false;
  return Date.now() - project.timelineUpdatedAt < 15000;
};

// Poll for live status
useEffect(() => {
  const interval = setInterval(() => {
    const live = new Set<string>();
    projects.forEach(p => {
      if (isLive(p)) live.add(p.id);
    });
    setLiveProjects(live);
  }, 2000);

  return () => clearInterval(interval);
}, [projects]);
```

#### 6b. Add Live Badge to Project Cards

```tsx
{/* In project card header, after project name */}
{liveProjects.has(project.id) && (
  <span className="ml-2 px-2 py-1 text-xs bg-green-500 text-white rounded-full flex items-center gap-1">
    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
    Live
  </span>
)}
```

#### 6b. Add Refresh Button

```tsx
const handleForceRefresh = async (groupId: string) => {
  try {
    await window.electron.invoke('timeline:forceRefresh', groupId);
    // Wait a moment then reload
    setTimeout(() => loadProjects(), 1000);
  } catch (error) {
    console.error('Failed to refresh timeline:', error);
  }
};

// In project card, near Gantt section
<button
  onClick={() => handleForceRefresh(project.whatsappGroupId)}
  className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
>
  <RefreshCw className="h-3 w-3" />
  Refresh Timeline
</button>
```

---

### Task 7: Run Database Migration

**File:** `packages/db/src/database.ts`

Add migration runner to initialize:

```typescript
import { MigrationRunner } from './migrate';
import sqlite3 from 'sqlite3';

// In Database constructor or init method
async initialize() {
  // Run migrations
  const migrationRunner = new MigrationRunner(this.db as unknown as sqlite3.Database);
  await migrationRunner.runMigrations();
}
```

**Note:** You may need to adapt the migration runner to work with better-sqlite3 instead of sqlite3. Consider using:

```typescript
// Alternative: Manual migration check
async runMigrations() {
  // Create migrations table
  this.db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `);

  // Check if migration 001 applied
  const applied = this.db.prepare('SELECT id FROM _migrations WHERE id = 1').get();

  if (!applied) {
    // Read and execute migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', '001_add_timeline_tables.sql'),
      'utf8'
    );

    this.db.exec(migrationSQL);

    // Mark as applied
    this.db.prepare('INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)')
      .run(1, 'add_timeline_tables', Date.now());

    console.log('✅ Migration 001 applied: Timeline tables created');
  }
}
```

---

### Task 8: Update Shared Types Export

**File:** `packages/shared/src/types.ts`

Add to existing exports:

```typescript
// Re-export timeline types for use in renderer
export interface Project {
  // ... existing fields
  timelineUpdatedAt?: number;
  timelineVersion?: number;
  lastAiReasoning?: string;
}
```

---

### Task 9: Rebuild and Test

```bash
# 1. Build all packages
cd C:\Dev\Statuz
npm run build:all

# 2. Run migration manually if needed
# (check database.ts initialize method)

# 3. Start app
START_WITH_LOGS.bat

# 4. Test timeline engine:
# - Set context for a group
# - Send some WhatsApp messages
# - Wait 8-10 seconds (debounce window)
# - Check terminal for timeline processing logs
# - Verify Gantt chart updates in Projects page
# - Check for "Live" badge
# - Test Force Refresh button
```

---

## 🧪 Testing Checklist

- [ ] Context update triggers timeline processing
- [ ] WhatsApp messages trigger timeline processing
- [ ] Debouncing works (multiple events coalesced)
- [ ] Rate limiting prevents excessive AI calls
- [ ] Circuit breaker activates after 3 failures
- [ ] Tasks are created/updated idempotently
- [ ] Gantt chart syntax is validated
- [ ] Invalid tasks are filtered out
- [ ] "Live" badge appears within 15s of update
- [ ] Force Refresh button works
- [ ] Event log is populated
- [ ] Task history is recorded
- [ ] Member resolution works (assignees mapped)

---

## 🚨 Known Issues & Limitations

1. **Migration Runner Compatibility**
   - Current migrate.ts uses sqlite3, but app uses better-sqlite3
   - Solution: Use manual migration logic shown above

2. **Type Imports**
   - Timeline types in packages/background not exported to shared
   - Solution: Either move types to shared or use explicit imports

3. **Event Bus Timing**
   - Need to ensure event bus is initialized before timeline engine subscribes
   - Solution: Check initialization order in service.ts

4. **WhatsApp History Replay**
   - Replaying 100 messages per group on startup may trigger immediate processing
   - Solution: May want to skip history replay initially or add a startup flag

---

## 📝 Configuration Tunables

Located in `packages/background/src/timeline-engine.ts`:

```typescript
const DEBOUNCE_WINDOW_MS = 8000;      // Time to wait before processing (8s)
const MAX_MESSAGE_DELTAS = 50;        // Max messages to include in AI prompt
const MAX_AI_FAILURES = 3;            // Circuit breaker threshold
const BACKOFF_DURATION_MS = 60000;    // Backoff period (1 min)
const RATE_LIMIT_MS = 5000;           // Min time between AI calls (5s)
```

Adjust these based on:
- AI API rate limits
- Group message frequency
- Desired responsiveness vs. cost tradeoff

---

## 🔍 Debugging

**Timeline Not Updating?**

1. Check terminal logs for:
   ```
   📝 Context delta received for group ...
   💬 Message delta received for group ...
   🔄 Processing N events for group ...
   🤖 Calling AI for timeline update...
   ✅ Timeline updated for group ...
   ```

2. Check circuit breaker status:
   ```
   🔴 Circuit breaker activated for ...
   ```

3. Check event_log table:
   ```sql
   SELECT * FROM event_log ORDER BY createdAt DESC LIMIT 20;
   ```

4. Check processing metrics in engine

**Gantt Chart Not Rendering?**

1. Check for validation warnings:
   ```
   ⚠️ Skipping truncated task: ...
   ⚠️ No valid tasks in Gantt chart
   ```

2. Check projects.ganttChart in database:
   ```sql
   SELECT id, name, ganttChart FROM projects;
   ```

3. Verify Mermaid syntax manually at https://mermaid.live

**AI Errors?**

1. Check API key is set (Settings page)
2. Check network connectivity
3. Check Gemini API quotas/limits
4. Review AI response logs for parse errors

---

## 📊 Performance Considerations

**Expected Load:**
- 1 context update per day per group
- 10-100 messages per day per group (active)
- Debounce reduces to ~5-10 AI calls per day per group

**Database Growth:**
- event_log: ~1000 rows/month for active group
- task_history: ~100 rows/month for active group
- Consider periodic cleanup (keep last 90 days)

**AI Costs:**
- Gemini 2.5 Flash Lite: very low cost
- ~3000 tokens per timeline update
- Est. cost: <$0.01 per day for 10 active groups

---

## 🎯 Future Enhancements

1. **Conflict Resolution**
   - If multiple users edit context simultaneously
   - Use version numbers for optimistic locking

2. **Rollback Support**
   - Keep timeline snapshots
   - Allow reverting to previous state

3. **Manual Task Override**
   - UI to manually edit tasks
   - Flag tasks as "manual" to prevent AI overwrite

4. **Advanced Member Resolution**
   - Fuzzy matching for assignee names
   - Learn from past assignments

5. **Timeline Visualization**
   - Activity feed showing recent changes
   - Task change diff viewer

6. **Batch Processing Mode**
   - Process multiple groups in parallel
   - Useful for initial setup with many groups

---

## ✅ Completion Checklist

Use this to track implementation progress:

- [✅] Timeline types created
- [✅] Database migration created
- [✅] Timeline engine core implemented
- [✅] AI service method added
- [ ] Database methods added (insertEventLog, etc.)
- [ ] Background service wired up
- [ ] WhatsApp service emits deltas
- [ ] Context save emits deltas
- [ ] Event bus subscriptions added
- [ ] IPC handlers registered
- [ ] Projects UI updated with live badge
- [ ] Projects UI refresh button added
- [ ] Database migration executed
- [ ] Full rebuild completed
- [ ] Integration testing done
- [ ] Documentation updated

---

**END OF IMPLEMENTATION GUIDE**

Once all tasks are complete, the Timeline Engine will be fully operational and continuously updating Gantt charts based on context and WhatsApp activity.
