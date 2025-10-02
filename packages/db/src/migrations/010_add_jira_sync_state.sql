-- Migration 010: Add jira_sync_state table
-- Purpose: Track Jira synchronization status

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

CREATE INDEX IF NOT EXISTS idx_jira_sync_entity ON jira_sync_state(entity_type, local_id);
CREATE INDEX IF NOT EXISTS idx_jira_sync_key ON jira_sync_state(jira_key);
