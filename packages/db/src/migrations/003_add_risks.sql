-- Migration 003: Add risks table
-- Purpose: Risk register with severity and probability tracking

CREATE TABLE IF NOT EXISTS risks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,                    -- "Database migration delay"
  description TEXT,
  category TEXT,                          -- technical|resource|schedule|scope|external
  severity TEXT NOT NULL DEFAULT 'medium', -- critical|high|medium|low
  probability TEXT NOT NULL DEFAULT 'medium', -- very_likely|likely|possible|unlikely
  impact TEXT,                            -- Description of impact
  mitigation_plan TEXT,                   -- How to mitigate
  owner_phone TEXT,                       -- Risk owner
  owner_alias TEXT,
  status TEXT NOT NULL DEFAULT 'open',    -- open|monitoring|mitigated|realized|closed
  identified_at INTEGER NOT NULL,
  extracted_from_message_id TEXT,
  confidence_score REAL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (extracted_from_message_id) REFERENCES messages(id)
);

CREATE INDEX IF NOT EXISTS idx_risks_project ON risks(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_severity ON risks(severity);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
