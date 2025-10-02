-- Migration 005: Add dependencies table
-- Purpose: Track task dependencies and sequencing

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

CREATE INDEX IF NOT EXISTS idx_dependencies_task ON dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_depends ON dependencies(depends_on_task_id);
