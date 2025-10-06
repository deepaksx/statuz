# Timeline Engine - Technical Documentation

**Version:** 2.6.1+timeline
**Component:** Living Gantt Chart System
**Last Updated:** 2025-10-06

---

## Overview

The **Timeline Engine** is a central, living Gantt chart system that continuously fuses two data streams:
1. **Stream 1:** Project Context updates (user-edited context per WhatsApp group)
2. **Stream 2:** WhatsApp messages (history + live) implying status changes, tasks, or milestones

**Goal:** Maintain a single canonical Gantt chart + task state that updates in near-real-time based on both context and message activity.

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│                    TIMELINE ENGINE                         │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────┐         ┌─────────────┐                 │
│  │   Context   │         │   Message   │                 │
│  │   Delta     │         │   Delta     │                 │
│  │   Stream    │         │   Stream    │                 │
│  └──────┬──────┘         └──────┬──────┘                 │
│         │                       │                         │
│         └───────┬───────────────┘                         │
│                 ▼                                          │
│       ┌─────────────────┐                                 │
│       │  Event Queue    │                                 │
│       │  (per-group)    │                                 │
│       └────────┬────────┘                                 │
│                │                                           │
│                ▼                                           │
│       ┌─────────────────┐                                 │
│       │   Debounce &    │  (8s window)                    │
│       │   Rate Limit    │                                 │
│       └────────┬────────┘                                 │
│                │                                           │
│                ▼                                           │
│       ┌─────────────────┐                                 │
│       │  AI Processing  │  (Gemini 2.5 Flash Lite)        │
│       │  - Context      │                                 │
│       │  - Tasks        │                                 │
│       │  - Messages     │                                 │
│       │  - Members      │                                 │
│       └────────┬────────┘                                 │
│                │                                           │
│                ▼                                           │
│       ┌─────────────────┐                                 │
│       │   Validation &  │                                 │
│       │   Persistence   │                                 │
│       └────────┬────────┘                                 │
│                │                                           │
│                ▼                                           │
│       ┌─────────────────┐                                 │
│       │  TimelineState  │                                 │
│       │  - Tasks[]      │                                 │
│       │  - Milestones[] │                                 │
│       │  - GanttMermaid │                                 │
│       └─────────────────┘                                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Key Files

1. **packages/background/src/types/timeline.ts** - Type definitions
2. **packages/background/src/timeline-engine.ts** - Core engine
3. **packages/background/src/ai-service.ts** - AI integration
4. **packages/db/src/migrations/001_add_timeline_tables.sql** - Database schema
5. **documents/TIMELINE_ENGINE_IMPLEMENTATION.md** - Implementation guide

## Configuration

| Parameter | Default | Purpose |
|-----------|---------|---------|
| DEBOUNCE_WINDOW_MS | 8000 | Wait time before processing events |
| MAX_MESSAGE_DELTAS | 50 | Max messages in AI prompt |
| MAX_AI_FAILURES | 3 | Circuit breaker threshold |
| BACKOFF_DURATION_MS | 60000 | Backoff period after failures |
| RATE_LIMIT_MS | 5000 | Min time between AI calls |

## Data Flow

1. User edits Context OR WhatsApp message received
2. Delta event emitted to Event Bus
3. Timeline Engine receives event → Queue
4. Debounce window expires → Process
5. Fetch current state from DB
6. Build AI request (context + tasks + messages + members)
7. Call AI (Gemini 2.5 Flash Lite)
8. Parse and validate response
9. Persist to database (idempotent upsert)
10. Emit timeline:updated event → UI updates

## Implementation Status

**Completed:**
- ✅ Timeline types (timeline.ts)
- ✅ Database migration (001_add_timeline_tables.sql)
- ✅ Timeline engine core (timeline-engine.ts)
- ✅ AI service method (generateTimelineUpdate)

**Remaining:**
- ⏳ Database methods (insertEventLog, etc.)
- ⏳ Background service integration
- ⏳ WhatsApp service event emission
- ⏳ Context save event emission
- ⏳ Event bus subscriptions
- ⏳ IPC handlers
- ⏳ Projects UI updates

See **TIMELINE_ENGINE_IMPLEMENTATION.md** for complete step-by-step instructions.

## Testing

**Manual Test:**
1. Set context for a group
2. Send 5-10 WhatsApp messages
3. Wait 8-10 seconds
4. Check logs for processing
5. Verify Gantt chart updated
6. Check "Live" badge

**Expected Logs:**
```
📝 Context delta received for group ...
💬 Message delta received for group ...
🔄 Processing N events for group ...
🤖 Calling AI for timeline update...
✅ Timeline updated for group ...
```

## Troubleshooting

**Timeline not updating?**
1. Check terminal logs for delta events
2. Check circuit breaker status
3. Query event_log table
4. Verify API key set

**Gantt chart blank?**
1. Check validation warnings
2. Verify Mermaid syntax in database
3. Test syntax at https://mermaid.live

**AI errors?**
1. Check API key
2. Check network connectivity
3. Review AI response logs
4. Check Gemini quotas

## Performance

**Expected Load:**
- 1 context update/day/group
- 10-100 messages/day/group
- ~5-10 AI calls/day/group (after debounce)

**Database Growth:**
- event_log: ~1000 rows/month (active group)
- task_history: ~100 rows/month

**AI Costs:**
- Gemini 2.5 Flash Lite: ~$0.001/call
- Est. <$0.01/day for 10 active groups

---

**For full implementation details, see:** `TIMELINE_ENGINE_IMPLEMENTATION.md`
