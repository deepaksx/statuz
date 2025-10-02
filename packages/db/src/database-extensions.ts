// Database extensions for AIPM - Project Management features
// This file contains additional methods to be added to StatuzDatabase class

import type {
  Project,
  Task,
  Risk,
  Decision,
  Dependency,
  Stakeholder,
  ExecutionNudge,
  ConflictResolution,
  Report
} from '@aipm/shared';

// Add these methods to the StatuzDatabase class:

// ==================== PROJECT MANAGEMENT ====================

// Projects
export async function getProjects(this: any, filter?: { status?: string }): Promise<Project[]> {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM projects WHERE 1=1';
    const params: any[] = [];

    if (filter?.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }

    query += ' ORDER BY priority ASC, created_at DESC';

    this.db.all(query, params, (err: any, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        clientName: row.client_name,
        whatsappGroupId: row.whatsapp_group_id,
        status: row.status,
        priority: row.priority,
        slaTier: row.sla_tier,
        startDate: row.start_date,
        targetEndDate: row.target_end_date,
        actualEndDate: row.actual_end_date,
        budgetHours: row.budget_hours,
        consumedHours: row.consumed_hours,
        projectManager: row.project_manager,
        technicalLead: row.technical_lead,
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })));
    });
  });
}

export async function insertProject(this: any, project: Partial<Project>): Promise<void> {
  return new Promise((resolve, reject) => {
    this.db.run(`
      INSERT INTO projects (
        id, name, code, client_name, whatsapp_group_id, status, priority,
        sla_tier, start_date, target_end_date, budget_hours, consumed_hours,
        project_manager, technical_lead, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      project.id,
      project.name,
      project.code || null,
      project.clientName || null,
      project.whatsappGroupId || null,
      project.status || 'active',
      project.priority || 3,
      project.slaTier || null,
      project.startDate || null,
      project.targetEndDate || null,
      project.budgetHours || null,
      project.consumedHours || 0,
      project.projectManager || null,
      project.technicalLead || null,
      project.description || null,
      project.createdAt || Date.now(),
      project.updatedAt || Date.now()
    ], (err: any) => {
      if (err) reject(err);
      else {
        this.auditLog('PROJECT_CREATED', `Project ${project.name} created`);
        resolve();
      }
    });
  });
}

// Tasks
export async function getTasks(this: any, filter?: {
  projectId?: string;
  status?: string;
  ownerPhone?: string;
}): Promise<Task[]> {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params: any[] = [];

    if (filter?.projectId) {
      query += ' AND project_id = ?';
      params.push(filter.projectId);
    }
    if (filter?.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter?.ownerPhone) {
      query += ' AND owner_phone = ?';
      params.push(filter.ownerPhone);
    }

    query += ' ORDER BY deadline ASC, priority ASC';

    this.db.all(query, params, (err: any, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows.map((row: any) => ({
        id: row.id,
        projectId: row.project_id,
        parentTaskId: row.parent_task_id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        ownerPhone: row.owner_phone,
        ownerAlias: row.owner_alias,
        createdByPhone: row.created_by_phone,
        createdByAlias: row.created_by_alias,
        estimatedHours: row.estimated_hours,
        actualHours: row.actual_hours,
        deadline: row.deadline,
        completedAt: row.completed_at,
        blockerReason: row.blocker_reason,
        extractedFromMessageId: row.extracted_from_message_id,
        confidenceScore: row.confidence_score,
        tags: row.tags ? JSON.parse(row.tags) : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })));
    });
  });
}

export async function insertTask(this: any, task: Partial<Task>): Promise<void> {
  return new Promise((resolve, reject) => {
    this.db.run(`
      INSERT INTO tasks (
        id, project_id, parent_task_id, title, description, status, priority,
        owner_phone, owner_alias, created_by_phone, created_by_alias,
        estimated_hours, actual_hours, deadline, extracted_from_message_id,
        confidence_score, tags, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      task.id,
      task.projectId,
      task.parentTaskId || null,
      task.title,
      task.description || null,
      task.status || 'todo',
      task.priority || 3,
      task.ownerPhone || null,
      task.ownerAlias || null,
      task.createdByPhone || null,
      task.createdByAlias || null,
      task.estimatedHours || null,
      task.actualHours || 0,
      task.deadline || null,
      task.extractedFromMessageId || null,
      task.confidenceScore || null,
      task.tags ? JSON.stringify(task.tags) : null,
      task.createdAt || Date.now(),
      task.updatedAt || Date.now()
    ], (err: any) => {
      if (err) reject(err);
      else {
        this.auditLog('TASK_CREATED', `Task ${task.title} created`);
        resolve();
      }
    });
  });
}

export async function updateTask(this: any, task: Partial<Task>): Promise<void> {
  return new Promise((resolve, reject) => {
    const updates: string[] = [];
    const params: any[] = [];

    if (task.status !== undefined) {
      updates.push('status = ?');
      params.push(task.status);
      if (task.status === 'done' && !task.completedAt) {
        updates.push('completed_at = ?');
        params.push(Date.now());
      }
    }
    if (task.priority !== undefined) {
      updates.push('priority = ?');
      params.push(task.priority);
    }
    if (task.ownerPhone !== undefined) {
      updates.push('owner_phone = ?');
      params.push(task.ownerPhone);
    }
    if (task.ownerAlias !== undefined) {
      updates.push('owner_alias = ?');
      params.push(task.ownerAlias);
    }
    if (task.deadline !== undefined) {
      updates.push('deadline = ?');
      params.push(task.deadline);
    }
    if (task.blockerReason !== undefined) {
      updates.push('blocker_reason = ?');
      params.push(task.blockerReason);
    }
    if (task.actualHours !== undefined) {
      updates.push('actual_hours = ?');
      params.push(task.actualHours);
    }

    updates.push('updated_at = ?');
    params.push(Date.now());
    params.push(task.id);

    this.db.run(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
      params,
      (err: any) => {
        if (err) reject(err);
        else {
          this.auditLog('TASK_UPDATED', `Task ${task.id} updated`);
          resolve();
        }
      }
    );
  });
}

// Risks
export async function getRisks(this: any, filter?: { projectId?: string }): Promise<Risk[]> {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM risks WHERE 1=1';
    const params: any[] = [];

    if (filter?.projectId) {
      query += ' AND project_id = ?';
      params.push(filter.projectId);
    }

    query += ' ORDER BY severity ASC, identified_at DESC';

    this.db.all(query, params, (err: any, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows.map((row: any) => ({
        id: row.id,
        projectId: row.project_id,
        title: row.title,
        description: row.description,
        category: row.category,
        severity: row.severity,
        probability: row.probability,
        impact: row.impact,
        mitigationPlan: row.mitigation_plan,
        ownerPhone: row.owner_phone,
        ownerAlias: row.owner_alias,
        status: row.status,
        identifiedAt: row.identified_at,
        extractedFromMessageId: row.extracted_from_message_id,
        confidenceScore: row.confidence_score,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })));
    });
  });
}

export async function insertRisk(this: any, risk: Partial<Risk>): Promise<void> {
  return new Promise((resolve, reject) => {
    this.db.run(`
      INSERT INTO risks (
        id, project_id, title, description, category, severity,
        probability, impact, mitigation_plan, owner_phone, owner_alias,
        status, identified_at, extracted_from_message_id, confidence_score,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      risk.id,
      risk.projectId,
      risk.title,
      risk.description || null,
      risk.category || null,
      risk.severity || 'medium',
      risk.probability || 'possible',
      risk.impact || null,
      risk.mitigationPlan || null,
      risk.ownerPhone || null,
      risk.ownerAlias || null,
      risk.status || 'open',
      risk.identifiedAt || Date.now(),
      risk.extractedFromMessageId || null,
      risk.confidenceScore || null,
      risk.createdAt || Date.now(),
      risk.updatedAt || Date.now()
    ], (err: any) => {
      if (err) reject(err);
      else {
        this.auditLog('RISK_IDENTIFIED', `Risk ${risk.title} identified`);
        resolve();
      }
    });
  });
}

// Execution Nudges
export async function getPendingNudges(this: any, beforeTimestamp: number): Promise<ExecutionNudge[]> {
  return new Promise((resolve, reject) => {
    this.db.all(`
      SELECT * FROM execution_nudges
      WHERE status = 'pending'
        AND scheduled_at <= ?
      ORDER BY scheduled_at ASC
    `, [beforeTimestamp], (err: any, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows.map((row: any) => ({
        id: row.id,
        nudgeType: row.nudge_type,
        entityType: row.entity_type,
        entityId: row.entity_id,
        recipientPhone: row.recipient_phone,
        messageText: row.message_text,
        scheduledAt: row.scheduled_at,
        sentAt: row.sent_at,
        status: row.status,
        escalationLevel: row.escalation_level,
        createdAt: row.created_at
      })));
    });
  });
}

export async function insertNudge(this: any, nudge: Partial<ExecutionNudge>): Promise<void> {
  return new Promise((resolve, reject) => {
    this.db.run(`
      INSERT INTO execution_nudges (
        id, nudge_type, entity_type, entity_id, recipient_phone,
        message_text, scheduled_at, status, escalation_level, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nudge.id,
      nudge.nudgeType,
      nudge.entityType,
      nudge.entityId,
      nudge.recipientPhone,
      nudge.messageText,
      nudge.scheduledAt,
      nudge.status || 'pending',
      nudge.escalationLevel || 1,
      nudge.createdAt || Date.now()
    ], (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function markNudgeAsSent(this: any, nudgeId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    this.db.run(`
      UPDATE execution_nudges
      SET status = 'sent', sent_at = ?
      WHERE id = ?
    `, [Date.now(), nudgeId], (err: any) => {
      if (err) reject(err);
      else {
        this.auditLog('NUDGE_SENT', `Nudge ${nudgeId} sent`);
        resolve();
      }
    });
  });
}

// Conflicts
export async function getConflicts(this: any): Promise<ConflictResolution[]> {
  return new Promise((resolve, reject) => {
    this.db.all(`
      SELECT * FROM conflict_resolutions
      WHERE status = 'open'
      ORDER BY severity ASC, detected_at DESC
    `, (err: any, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows.map((row: any) => ({
        id: row.id,
        conflictType: row.conflict_type,
        description: row.description,
        affectedEntities: JSON.parse(row.affected_entities),
        severity: row.severity,
        detectedAt: row.detected_at,
        resolutionOptions: row.resolution_options ? JSON.parse(row.resolution_options) : [],
        chosenResolution: row.chosen_resolution,
        resolvedAt: row.resolved_at,
        resolvedByPhone: row.resolved_by_phone,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })));
    });
  });
}
