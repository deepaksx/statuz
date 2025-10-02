-- Migration 004: Add decisions table
-- Purpose: Decision log with rationale and impact tracking

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

CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
