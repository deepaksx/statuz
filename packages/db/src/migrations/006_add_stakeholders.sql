-- Migration 006: Add stakeholders table
-- Purpose: Stakeholder management with SLA and escalation tracking

CREATE TABLE IF NOT EXISTS stakeholders (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  alias TEXT,
  role TEXT,                              -- pm|tech_lead|developer|client|sponsor
  email TEXT,
  organization TEXT,
  is_primary_contact INTEGER DEFAULT 0,
  escalation_level INTEGER DEFAULT 1,     -- 1=first contact, 2=manager, 3=exec
  sla_response_hours INTEGER,             -- Expected response time
  timezone TEXT DEFAULT 'Asia/Dubai',
  communication_preference TEXT,          -- whatsapp|email|both
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  UNIQUE(project_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_stakeholders_project ON stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_phone ON stakeholders(phone_number);
