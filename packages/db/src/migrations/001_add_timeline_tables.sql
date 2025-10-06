-- Migration 001: Add Timeline Engine Tables
-- Purpose: Support living Gantt timeline with event logging and task history

-- Event log table: tracks all context and message deltas
CREATE TABLE IF NOT EXISTS event_log (
  id TEXT PRIMARY KEY,
  groupId TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('context', 'whatsapp')),
  payload TEXT NOT NULL,
  createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_log_groupId ON event_log(groupId);
CREATE INDEX IF NOT EXISTS idx_event_log_createdAt ON event_log(createdAt);
CREATE INDEX IF NOT EXISTS idx_event_log_source ON event_log(source);

-- Task history table: tracks all task changes over time
CREATE TABLE IF NOT EXISTS task_history (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL,
  change TEXT NOT NULL,
  at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_history_taskId ON task_history(taskId);
CREATE INDEX IF NOT EXISTS idx_task_history_at ON task_history(at);

-- Add timeline tracking columns to projects table
ALTER TABLE projects ADD COLUMN timelineUpdatedAt INTEGER;
ALTER TABLE projects ADD COLUMN timelineVersion INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN lastAiReasoning TEXT;

-- Update existing projects to have initial timeline version
UPDATE projects SET timelineVersion = 0 WHERE timelineVersion IS NULL;
UPDATE projects SET timelineUpdatedAt = updatedAt WHERE timelineUpdatedAt IS NULL;
