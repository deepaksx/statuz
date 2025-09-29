export const CREATE_TABLES = `
-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_watched INTEGER NOT NULL DEFAULT 0
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  author TEXT NOT NULL,
  author_name TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  text TEXT NOT NULL,
  raw TEXT NOT NULL,
  FOREIGN KEY (group_id) REFERENCES groups(id)
);

-- Signals table
CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('MILESTONE_UPDATE','TODO','RISK','DECISION','BLOCKER','INFO')),
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- Milestones table
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  owner TEXT NOT NULL,
  due_date TEXT NOT NULL,
  acceptance_criteria TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('NOT_STARTED','IN_PROGRESS','AT_RISK','BLOCKED','DONE')),
  last_update_ts INTEGER NOT NULL
);

-- Config table
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Audit table
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  detail TEXT NOT NULL,
  ts INTEGER NOT NULL
);
`;

export const CREATE_INDEXES = `
-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_signals_message_id ON signals(message_id);
CREATE INDEX IF NOT EXISTS idx_signals_kind ON signals(kind);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit(ts);
`;