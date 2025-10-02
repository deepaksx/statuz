-- Migration 007: Add execution_nudges table
-- Purpose: Automated reminders and escalations

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

CREATE INDEX IF NOT EXISTS idx_nudges_scheduled ON execution_nudges(scheduled_at, status);
CREATE INDEX IF NOT EXISTS idx_nudges_entity ON execution_nudges(entity_type, entity_id);
