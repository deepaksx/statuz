-- Migration 001: Add projects table
-- Purpose: Store project information with SLA tiers and budget tracking

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,                    -- UUID
  name TEXT NOT NULL,                     -- "SAP S/4HANA Implementation"
  code TEXT UNIQUE,                       -- "SAP-001"
  client_name TEXT,                       -- "Acme Corp"
  whatsapp_group_id TEXT,                 -- Link to groups table
  status TEXT NOT NULL DEFAULT 'active',  -- active|on_hold|completed|cancelled
  priority INTEGER NOT NULL DEFAULT 3,    -- 1=critical, 2=high, 3=medium, 4=low
  sla_tier TEXT,                          -- platinum|gold|silver|bronze
  start_date INTEGER,                     -- Unix timestamp
  target_end_date INTEGER,                -- Unix timestamp
  actual_end_date INTEGER,
  budget_hours REAL,
  consumed_hours REAL DEFAULT 0,
  project_manager TEXT,                   -- Phone number or alias
  technical_lead TEXT,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (whatsapp_group_id) REFERENCES groups(id)
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_group ON projects(whatsapp_group_id);
