-- Migration 002: Add tasks table
-- Purpose: Store task information with AI extraction tracking

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

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_phone);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
