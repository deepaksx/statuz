-- Migration 011: Add SCRUM hierarchy and SAP-specific fields
-- Purpose: Transform flat tasks into Epic -> Story -> Task -> Subtask hierarchy with SAP context

-- Add work item type for SCRUM hierarchy
ALTER TABLE tasks ADD COLUMN work_item_type TEXT NOT NULL DEFAULT 'task';
-- epic|story|task|subtask

-- Add story points for agile estimation
ALTER TABLE tasks ADD COLUMN story_points INTEGER;

-- Add sprint information
ALTER TABLE tasks ADD COLUMN sprint_id TEXT;
ALTER TABLE tasks ADD COLUMN sprint_name TEXT;

-- Add acceptance criteria (JSON array)
ALTER TABLE tasks ADD COLUMN acceptance_criteria TEXT;

-- Add SAP-specific fields
ALTER TABLE tasks ADD COLUMN sap_module TEXT;
-- FI|CO|MM|SD|PP|QM|PM|HR|ABAP|BASIS|BW|etc
ALTER TABLE tasks ADD COLUMN sap_tcode TEXT;
-- Transaction codes like VA01, ME21N, etc
ALTER TABLE tasks ADD COLUMN sap_object_type TEXT;
-- Program, Report, Function Module, Class, Table, etc
ALTER TABLE tasks ADD COLUMN sap_transport_request TEXT;
-- TR number like P01K905013

-- Add AI recommendation fields
ALTER TABLE tasks ADD COLUMN ai_recommendation TEXT;
-- AI-generated suggestion for resolution
ALTER TABLE tasks ADD COLUMN ai_risk_assessment TEXT;
-- AI analysis of risks
ALTER TABLE tasks ADD COLUMN ai_similar_issues TEXT;
-- JSON array of similar issues with solutions
ALTER TABLE tasks ADD COLUMN ai_confidence_level TEXT DEFAULT 'medium';
-- low|medium|high - AI's confidence in its analysis

-- Add project management fields
ALTER TABLE tasks ADD COLUMN dependencies_count INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN blockers_count INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN progress_percentage INTEGER DEFAULT 0;

-- Create index for hierarchy traversal
CREATE INDEX IF NOT EXISTS idx_tasks_work_item_type ON tasks(work_item_type);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint ON tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sap_module ON tasks(sap_module);

-- Create a view for easy Epic -> Story -> Task -> Subtask navigation
CREATE VIEW IF NOT EXISTS task_hierarchy AS
WITH RECURSIVE task_tree AS (
  -- Base case: Epic level (work_item_type = 'epic', no parent)
  SELECT
    id,
    project_id,
    parent_task_id,
    title,
    work_item_type,
    status,
    priority,
    story_points,
    progress_percentage,
    owner_phone,
    owner_alias,
    sap_module,
    sap_tcode,
    ai_recommendation,
    1 as depth,
    id as epic_id,
    CAST(NULL AS TEXT) as story_id,
    CAST(NULL AS TEXT) as task_id,
    title as path
  FROM tasks
  WHERE work_item_type = 'epic' AND parent_task_id IS NULL

  UNION ALL

  -- Recursive case: Children at each level
  SELECT
    t.id,
    t.project_id,
    t.parent_task_id,
    t.title,
    t.work_item_type,
    t.status,
    t.priority,
    t.story_points,
    t.progress_percentage,
    t.owner_phone,
    t.owner_alias,
    t.sap_module,
    t.sap_tcode,
    t.ai_recommendation,
    tt.depth + 1,
    tt.epic_id,
    CASE WHEN t.work_item_type = 'story' THEN t.id ELSE tt.story_id END,
    CASE WHEN t.work_item_type = 'task' THEN t.id ELSE tt.task_id END,
    tt.path || ' > ' || t.title
  FROM tasks t
  INNER JOIN task_tree tt ON t.parent_task_id = tt.id
)
SELECT * FROM task_tree;
