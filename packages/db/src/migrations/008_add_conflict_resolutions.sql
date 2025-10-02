-- Migration 008: Add conflict_resolutions table
-- Purpose: Track and resolve conflicts (deadline, resource, priority)

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

CREATE INDEX IF NOT EXISTS idx_conflicts_status ON conflict_resolutions(status);
CREATE INDEX IF NOT EXISTS idx_conflicts_detected ON conflict_resolutions(detected_at);
