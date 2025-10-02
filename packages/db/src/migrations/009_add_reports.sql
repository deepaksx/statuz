-- Migration 009: Add reports table
-- Purpose: Store generated reports for audit and retrieval

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  report_type TEXT NOT NULL,              -- daily|weekly|monthly|custom
  audience TEXT NOT NULL,                 -- team|client|executive
  project_id TEXT,                        -- NULL = all projects
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  generated_at INTEGER NOT NULL,
  generated_by TEXT,                      -- 'system' or user
  format TEXT NOT NULL,                   -- markdown|json|html
  content TEXT NOT NULL,                  -- The actual report
  summary TEXT,                           -- Brief summary for listing
  sent_to TEXT,                           -- JSON array of recipients
  file_path TEXT,                         -- If exported to file
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_generated ON reports(generated_at);
CREATE INDEX IF NOT EXISTS idx_reports_project ON reports(project_id);
