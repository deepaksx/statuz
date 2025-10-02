# Phase 2: Intelligence - Implementation Plan

**Status**: IN PROGRESS 🔄
**Start Date**: January 2025
**Target**: Week 6 of Transformation Roadmap

---

## Overview

Phase 2 focuses on making AIPM **actively intelligent** by:
1. Integrating the Parser Agent into the message flow
2. Automatically extracting and storing tasks/risks from WhatsApp
3. Creating basic UI to visualize projects and tasks
4. Setting up the foundation for automated planning and tracking

---

## Goals

### Primary Objectives
- ✅ Auto-extract tasks from WhatsApp messages
- ✅ Store extracted entities in database
- ✅ Display projects and tasks in UI
- ✅ End-to-end test: WhatsApp message → UI display

### Secondary Objectives
- ⏳ Create Planner Agent (validation, enrichment)
- ⏳ Create Tracker Agent (deadline monitoring)
- ⏳ Implement nudge scheduling

---

## Implementation Tasks

### 1. Build Infrastructure (Current)
**Status**: IN PROGRESS

- [ ] Fix build system for new packages
- [ ] Build @aipm/event-bus
- [ ] Build @aipm/agents
- [ ] Verify TypeScript compilation
- [ ] Test imports across packages

**Blockers**:
- TypeScript not in package-level node_modules
- Need to use npx tsc or install globally

**Resolution**:
- Use `npx tsc` for building
- Or run npm install in each package subdirectory

### 2. Database Integration
**Status**: PENDING

Files to modify:
- `packages/db/src/database.ts`

Tasks:
- [ ] Import methods from database-extensions.ts
- [ ] Add getProjects(), insertProject()
- [ ] Add getTasks(), insertTask(), updateTask()
- [ ] Add getRisks(), insertRisk()
- [ ] Add getPendingNudges(), insertNudge(), markNudgeAsSent()
- [ ] Add getConflicts()
- [ ] Call MigrationRunner in init()
- [ ] Test migration execution

### 3. BackgroundService Integration
**Status**: PENDING

Files to modify:
- `packages/background/src/service.ts`

Tasks:
- [ ] Import event-bus
- [ ] Import ParserAgent
- [ ] Initialize ParserAgent in constructor
- [ ] Setup event bus listeners
- [ ] Call parserAgent.parseMessage() in processMessage()
- [ ] Subscribe to 'task:created' events
- [ ] Store extracted tasks in database
- [ ] Subscribe to 'risk:identified' events
- [ ] Store extracted risks in database

**Code snippets needed**:
```typescript
import { eventBus } from '@aipm/event-bus';
import { ParserAgent } from '@aipm/agents';

// In constructor
this.parserAgent = new ParserAgent(this.config.geminiApiKey);
this.setupEventBusListeners();

// Event listeners
private setupEventBusListeners() {
  eventBus.subscribe('task:created', async (payload) => {
    const { entity, sourceMessage } = payload.data;
    await this.db.insertTask({
      id: this.generateId(),
      projectId: group.id, // Map to project
      title: entity.title,
      // ... other fields
    });
  });
}

// In processMessage
if (this.parserAgent && group.isWatched) {
  await this.parserAgent.parseMessage(message, {
    groupName: group.name,
    projectName: group.name
  });
}
```

### 4. IPC Handlers
**Status**: PENDING

Files to modify:
- `apps/desktop/src/main.ts`

Tasks:
- [ ] Add 'get-projects' handler
- [ ] Add 'create-project' handler
- [ ] Add 'get-tasks' handler
- [ ] Add 'create-task' handler
- [ ] Add 'update-task' handler
- [ ] Add 'get-risks' handler
- [ ] Add 'get-decisions' handler

**Code snippet**:
```typescript
case 'get-projects':
  return await this.backgroundService.getProjects(message.payload);

case 'get-tasks':
  return await this.backgroundService.getTasks(message.payload);

case 'create-task':
  return await this.backgroundService.createTask(message.payload);

case 'update-task':
  return await this.backgroundService.updateTask(message.payload);
```

### 5. App Context Updates
**Status**: PENDING

Files to modify:
- `apps/renderer/src/contexts/AppContext.tsx`

Tasks:
- [ ] Add getProjects() method
- [ ] Add createProject() method
- [ ] Add getTasks() method
- [ ] Add createTask() method
- [ ] Add updateTask() method
- [ ] Add getRisks() method
- [ ] Update AppContextType interface

**Code snippet**:
```typescript
const getProjects = async (): Promise<Project[]> => {
  return await invoke('get-projects', {});
};

const getTasks = async (filter?: any): Promise<Task[]> => {
  return await invoke('get-tasks', filter || {});
};
```

### 6. Project Dashboard UI
**Status**: PENDING

Files to create:
- `apps/renderer/src/pages/ProjectDashboard.tsx`

Features:
- [ ] Display list of active projects
- [ ] Show project stats (tasks, completion %)
- [ ] Color-coded priority indicators
- [ ] SLA tier badges
- [ ] Click to view project details

### 7. Task Board UI
**Status**: PENDING

Files to create:
- `apps/renderer/src/pages/TaskBoard.tsx`

Features:
- [ ] Kanban board with 4 columns: To Do, In Progress, Blocked, Done
- [ ] Drag & drop task cards
- [ ] Task filtering by project
- [ ] Task cards show: title, owner, deadline, priority
- [ ] Click to edit task details

### 8. Navigation Updates
**Status**: PENDING

Files to modify:
- `apps/renderer/src/components/Layout.tsx`
- `apps/renderer/src/App.tsx`

Tasks:
- [ ] Add "Projects" menu item
- [ ] Add "Task Board" menu item
- [ ] Update routing to include new pages

### 9. Testing
**Status**: PENDING

Test scenarios:
- [ ] Send WhatsApp message: "John will complete API by Friday"
- [ ] Verify Parser Agent extracts task
- [ ] Verify task saved to database
- [ ] Verify task appears in UI
- [ ] Verify can update task status via drag-drop
- [ ] Send risk message: "Worried about deadline"
- [ ] Verify risk extracted and displayed

---

## Success Criteria

### Must Have
- ✅ Parser Agent integrated into message processing
- ✅ Tasks auto-extracted from WhatsApp messages
- ✅ Tasks stored in database with confidence scores
- ✅ Tasks visible in UI
- ✅ Can manually update task status

### Nice to Have
- ⏳ Risks auto-extracted
- ⏳ Decisions auto-extracted
- ⏳ Task Board drag-and-drop working
- ⏳ Project Dashboard with stats

### Stretch Goals
- ⏳ Planner Agent validates extractions
- ⏳ Tracker Agent schedules first nudge
- ⏳ Conflict detection for overdue tasks

---

## Technical Decisions

### Build System
- **Decision**: Use `npx tsc` for building packages
- **Rationale**: Avoids need to install TypeScript in each package
- **Alternative**: Install tsc globally (not preferred for portability)

### Project Mapping
- **Decision**: Initially map WhatsApp groups 1:1 to projects
- **Rationale**: Simplest implementation, can enhance later
- **Future**: Allow multiple groups per project

### Confidence Threshold
- **Decision**: Only extract entities with confidence ≥ 0.5
- **Rationale**: Reduces false positives, prefer precision over recall
- **Tunable**: Can adjust threshold based on testing

### Event Bus Pattern
- **Decision**: Async event handling (fire-and-forget)
- **Rationale**: Decouples agents, prevents blocking
- **Trade-off**: Harder to debug, need good logging

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Build system issues | HIGH | HIGH | Use npx, document steps |
| Parser Agent accuracy | MEDIUM | MEDIUM | Start with high confidence threshold |
| UI complexity | MEDIUM | LOW | Start with simple components |
| Database migration failures | HIGH | LOW | Test migrations on empty DB first |

---

## Timeline

### Day 1 (Today)
- [x] Phase 1 complete
- [ ] Fix build system
- [ ] Integrate Parser Agent
- [ ] Add database methods

### Day 2
- [ ] Create IPC handlers
- [ ] Update App Context
- [ ] Create Project Dashboard UI

### Day 3
- [ ] Create Task Board UI
- [ ] End-to-end testing
- [ ] Bug fixes

### Day 4-7
- [ ] Create Planner Agent
- [ ] Create Tracker Agent
- [ ] Implement nudge scheduling
- [ ] Phase 2 complete

---

## Next Immediate Steps

1. ✅ Create this planning document
2. ⏳ Fix build system (use npx tsc)
3. ⏳ Build all packages in order:
   - packages/shared
   - packages/event-bus
   - packages/db
   - packages/agents
   - packages/background
   - apps/desktop
   - apps/renderer
4. ⏳ Integrate Parser Agent into BackgroundService
5. ⏳ Test extraction with dummy message

---

## Code Review Checklist

Before committing Phase 2:
- [ ] All packages build successfully
- [ ] No TypeScript errors
- [ ] Database migrations run successfully
- [ ] Parser Agent extracts tasks correctly
- [ ] UI displays tasks
- [ ] Can update task status
- [ ] Proper error handling in place
- [ ] Console logs for debugging
- [ ] Types exported correctly
- [ ] Documentation updated

---

**Last Updated**: January 2025
**Owner**: Claude Code (Principal AI Architect)
**Status**: Implementation in progress
