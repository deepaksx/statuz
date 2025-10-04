import sqlite3 from 'sqlite3';
import { CREATE_TABLES, CREATE_INDEXES } from './schema.js';
import type {
  Group,
  Message,
  Milestone,
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
import { MigrationRunner } from './migrate.js';

export class StatuzDatabase {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        this.init();
      }
    });
  }

  private init() {
    this.db.serialize(() => {
      this.db.exec(CREATE_TABLES, (err) => {
        if (err) console.error('Error creating tables:', err);
      });
      this.db.exec(CREATE_INDEXES, (err) => {
        if (err) console.error('Error creating indexes:', err);
      });

      // Run migrations to add new columns if they don't exist
      this.runMigrations();

      this.auditLog('DATABASE_INIT', 'Database initialized');
    });
  }

  private async runMigrations() {
    // Add has_history_uploaded and history_uploaded_at columns to groups table if they don't exist
    this.db.run(`
      ALTER TABLE groups ADD COLUMN has_history_uploaded INTEGER NOT NULL DEFAULT 0
    `, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Migration error (has_history_uploaded):', err);
      }
    });

    this.db.run(`
      ALTER TABLE groups ADD COLUMN history_uploaded_at INTEGER
    `, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Migration error (history_uploaded_at):', err);
      }
    });

    // Add auto-response columns
    this.db.run(`
      ALTER TABLE groups ADD COLUMN auto_response_enabled INTEGER NOT NULL DEFAULT 0
    `, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Migration error (auto_response_enabled):', err);
      }
    });

    this.db.run(`
      ALTER TABLE groups ADD COLUMN auto_response_trigger TEXT DEFAULT 'NXSYS_AI'
    `, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Migration error (auto_response_trigger):', err);
      }
    });

    // Run Phase 1 migrations for AIPM (projects, tasks, risks, etc.)
    try {
      const migrationRunner = new MigrationRunner(this.db);
      await migrationRunner.runMigrations();
      console.log('✅ AIPM migrations completed successfully');
    } catch (error) {
      console.error('❌ Error running AIPM migrations:', error);
    }
  }

  close() {
    this.db.close((err) => {
      if (err) console.error('Error closing database:', err);
    });
  }

  // Groups
  getGroups(): Promise<Group[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT id, name, is_watched as isWatched,
                   has_history_uploaded as hasHistoryUploaded,
                   history_uploaded_at as historyUploadedAt,
                   auto_response_enabled as autoResponseEnabled,
                   auto_response_trigger as autoResponseTrigger
                   FROM groups ORDER BY name`, (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows.map(r => ({
          ...r,
          autoResponseEnabled: r.autoResponseEnabled === 1
        })) as Group[]);
      });
    });
  }

  getWatchedGroups(): Promise<Group[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT id, name, is_watched as isWatched,
                   has_history_uploaded as hasHistoryUploaded,
                   history_uploaded_at as historyUploadedAt,
                   auto_response_enabled as autoResponseEnabled,
                   auto_response_trigger as autoResponseTrigger
                   FROM groups WHERE is_watched = 1 ORDER BY name`, (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows.map(r => ({
          ...r,
          autoResponseEnabled: r.autoResponseEnabled === 1
        })) as Group[]);
      });
    });
  }

  upsertGroup(group: Group): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use INSERT OR IGNORE first, then UPDATE to preserve watch status and history
      this.db.run('INSERT OR IGNORE INTO groups (id, name, is_watched) VALUES (?, ?, ?)',
        [group.id, group.name, group.isWatched ? 1 : 0],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          // Only update name, preserve is_watched and history columns
          this.db.run('UPDATE groups SET name = ? WHERE id = ?',
            [group.name, group.id],
            (err) => {
              if (err) reject(err);
              else {
                this.auditLog('GROUP_UPSERT', `Group ${group.name} upserted`);
                resolve();
              }
            }
          );
        }
      );
    });
  }

  updateGroupWatchStatus(groupId: string, isWatched: boolean): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run('UPDATE groups SET is_watched = ? WHERE id = ?',
        [isWatched ? 1 : 0, groupId],
        function(err) {
          if (err) reject(err);
          else {
            const changed = this.changes > 0;
            if (changed) {
              resolve(changed);
            } else {
              resolve(false);
            }
          }
        }
      );
    });
  }

  updateGroupHistoryStatus(groupId: string, hasHistory: boolean): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run('UPDATE groups SET has_history_uploaded = ?, history_uploaded_at = ? WHERE id = ?',
        [hasHistory ? 1 : 0, Date.now(), groupId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  updateGroupAutoResponse(groupId: string, enabled: boolean, trigger?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const triggerValue = trigger || 'NXSYS_AI';
      this.db.run('UPDATE groups SET auto_response_enabled = ?, auto_response_trigger = ? WHERE id = ?',
        [enabled ? 1 : 0, triggerValue, groupId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  // Messages
  insertMessage(message: Message): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT OR IGNORE INTO messages (id, group_id, author, author_name, timestamp, text, raw)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [message.id, message.groupId, message.author, message.authorName, message.timestamp, message.text, message.raw],
      function(err) {
        if (err) reject(err);
        else {
          const inserted = this.changes > 0;
          resolve(inserted);
        }
      });
    });
  }

  getMessages(groupId?: string, since?: number, limit?: number): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT id, group_id as groupId, author, author_name as authorName, timestamp, text, raw
        FROM messages
      `;
      const params: any[] = [];

      const conditions: string[] = [];
      if (groupId) {
        conditions.push('group_id = ?');
        params.push(groupId);
      }
      if (since) {
        conditions.push('timestamp >= ?');
        params.push(since);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY timestamp DESC';

      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows as Message[]);
      });
    });
  }

  deleteGroupMessages(groupId: string): Promise<{ deletedCount: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM messages WHERE group_id = ?',
        [groupId],
        function(err) {
          if (err) reject(err);
          else {
            // Also reset the history upload flag for the group
            this.run(
              'UPDATE groups SET has_history_uploaded = 0, history_uploaded_at = NULL WHERE id = ?',
              [groupId],
              (updateErr: Error | null) => {
                if (updateErr) console.warn('Failed to reset history flag:', updateErr);
              }
            );
            resolve({ deletedCount: this.changes });
          }
        }
      );
    });
  }



  // Milestones
  getMilestones(): Promise<Milestone[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT id, title, description, owner, due_date as dueDate,
               acceptance_criteria as acceptanceCriteria, status, last_update_ts as lastUpdateTs
        FROM milestones ORDER BY due_date
      `, (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows as Milestone[]);
      });
    });
  }

  upsertMilestone(milestone: Milestone): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT OR REPLACE INTO milestones
        (id, title, description, owner, due_date, acceptance_criteria, status, last_update_ts)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [milestone.id, milestone.title, milestone.description, milestone.owner, milestone.dueDate,
          milestone.acceptanceCriteria, milestone.status, milestone.lastUpdateTs],
      (err) => {
        if (err) reject(err);
        else {
          this.auditLog('MILESTONE_UPSERT', `Milestone ${milestone.title} upserted`);
          resolve();
        }
      });
    });
  }

  updateMilestoneStatus(milestoneId: string, status: string, updateTs: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run('UPDATE milestones SET status = ?, last_update_ts = ? WHERE id = ?',
        [status, updateTs, milestoneId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  // Config
  getConfig(key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT value FROM config WHERE key = ?', [key], (err, row: any) => {
        if (err) reject(err);
        else resolve(row ? row.value : null);
      });
    });
  }

  setConfig(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, value], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Audit
  auditLog(kind: string, detail: string): void {
    this.db.run('INSERT INTO audit (kind, detail, ts) VALUES (?, ?, ?)', [kind, detail, Date.now()], (err) => {
      if (err) console.error('Error logging audit:', err);
    });
  }

  getAuditLogs(limit = 100): Promise<Array<{ id: number; kind: string; detail: string; ts: number }>> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT id, kind, detail, ts FROM audit ORDER BY ts DESC LIMIT ?', [limit], (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Group Context
  getGroupContext(groupId: string): Promise<{ context: string; contextUpdatedAt: number | null }> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT context, updated_at as contextUpdatedAt FROM group_context WHERE group_id = ?',
        [groupId],
        (err, row: any) => {
          if (err) reject(err);
          else if (row) resolve(row);
          else resolve({ context: '', contextUpdatedAt: null });
        }
      );
    });
  }

  updateGroupContext(groupId: string, context: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('INSERT OR REPLACE INTO group_context (group_id, context, updated_at) VALUES (?, ?, ?)',
        [groupId, context, Date.now()],
        (err) => {
          if (err) reject(err);
          else {
            this.auditLog('GROUP_CONTEXT_UPDATE', `Updated context for group ${groupId}`);
            resolve();
          }
        }
      );
    });
  }

  deleteGroupContext(groupId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM group_context WHERE group_id = ?', [groupId], (err) => {
        if (err) reject(err);
        else {
          this.auditLog('GROUP_CONTEXT_DELETE', `Deleted context for group ${groupId}`);
          resolve();
        }
      });
    });
  }

  // Utility
  getLastSnapshotTime(): Promise<number> {
    return new Promise(async (resolve) => {
      try {
        const result = await this.getConfig('last_snapshot_time');
        resolve(result ? parseInt(result, 10) : 0);
      } catch {
        resolve(0);
      }
    });
  }

  setLastSnapshotTime(timestamp: number): Promise<void> {
    return this.setConfig('last_snapshot_time', timestamp.toString());
  }

  // Contacts Management
  getContacts(): Promise<Array<{ phoneNumber: string; alias: string; role?: string; notes?: string; createdAt: number; updatedAt: number }>> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT phone_number as phoneNumber, alias, role, notes, created_at as createdAt, updated_at as updatedAt FROM contacts ORDER BY alias ASC',
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  getContact(phoneNumber: string): Promise<{ phoneNumber: string; alias: string; role?: string; notes?: string; createdAt: number; updatedAt: number } | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT phone_number as phoneNumber, alias, role, notes, created_at as createdAt, updated_at as updatedAt FROM contacts WHERE phone_number = ?',
        [phoneNumber],
        (err, row: any) => {
          if (err) reject(err);
          else resolve(row || null);
        }
      );
    });
  }

  upsertContact(contact: { phoneNumber: string; alias: string; role?: string; notes?: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      this.db.run(
        `INSERT INTO contacts (phone_number, alias, role, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(phone_number) DO UPDATE SET
           alias = excluded.alias,
           role = excluded.role,
           notes = excluded.notes,
           updated_at = excluded.updated_at`,
        [contact.phoneNumber, contact.alias, contact.role || null, contact.notes || null, now, now],
        (err) => {
          if (err) reject(err);
          else {
            this.auditLog('CONTACT_UPSERT', `Contact ${contact.alias} (${contact.phoneNumber}) upserted`);
            resolve();
          }
        }
      );
    });
  }

  deleteContact(phoneNumber: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM contacts WHERE phone_number = ?',
        [phoneNumber],
        (err) => {
          if (err) reject(err);
          else {
            this.auditLog('CONTACT_DELETE', `Contact ${phoneNumber} deleted`);
            resolve();
          }
        }
      );
    });
  }

  // Get all unique authors from watched groups with their contact info
  getAuthorsFromWatchedGroups(): Promise<Array<{ phoneNumber: string; displayName: string; messageCount: number }>> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT DISTINCT
           m.author as phoneNumber,
           m.author_name as displayName,
           COUNT(*) as messageCount
         FROM messages m
         INNER JOIN groups g ON m.group_id = g.id
         WHERE g.is_watched = 1
         GROUP BY m.author
         ORDER BY COUNT(*) DESC`,
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // Statistics
  getStats(): Promise<{
    watchedGroups: number;
    totalMessages: number;
    totalMilestones: number;
    completedMilestones: number;
  }> {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT
          (SELECT COUNT(*) FROM groups WHERE is_watched = 1) as watchedGroups,
          (SELECT COUNT(*) FROM messages) as totalMessages,
          (SELECT COUNT(*) FROM milestones) as totalMilestones,
          (SELECT COUNT(*) FROM milestones WHERE status = 'DONE') as completedMilestones
      `, (err, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // ==================== AIPM PROJECT MANAGEMENT ====================

  // Projects
  getProjects(filter?: { status?: string }): Promise<Project[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM projects WHERE 1=1';
      const params: any[] = [];

      if (filter?.status) {
        query += ' AND status = ?';
        params.push(filter.status);
      }

      query += ' ORDER BY priority ASC, created_at DESC';

      this.db.all(query, params, (err, rows: any[]) => {
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

  insertProject(project: Partial<Project>): Promise<void> {
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
      ], (err) => {
        if (err) reject(err);
        else {
          this.auditLog('PROJECT_CREATED', `Project ${project.name} created`);
          resolve();
        }
      });
    });
  }

  // Tasks
  getTasks(filter?: {
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

      this.db.all(query, params, (err, rows: any[]) => {
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

  insertTask(task: Partial<Task>): Promise<void> {
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
      ], (err) => {
        if (err) reject(err);
        else {
          this.auditLog('TASK_CREATED', `Task ${task.title} created`);
          resolve();
        }
      });
    });
  }

  updateTask(task: Partial<Task>): Promise<void> {
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
        (err) => {
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
  getRisks(filter?: { projectId?: string }): Promise<Risk[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM risks WHERE 1=1';
      const params: any[] = [];

      if (filter?.projectId) {
        query += ' AND project_id = ?';
        params.push(filter.projectId);
      }

      query += ' ORDER BY severity ASC, identified_at DESC';

      this.db.all(query, params, (err, rows: any[]) => {
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

  insertRisk(risk: Partial<Risk>): Promise<void> {
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
      ], (err) => {
        if (err) reject(err);
        else {
          this.auditLog('RISK_IDENTIFIED', `Risk ${risk.title} identified`);
          resolve();
        }
      });
    });
  }

  // Execution Nudges
  getPendingNudges(beforeTimestamp: number): Promise<ExecutionNudge[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM execution_nudges
        WHERE status = 'pending'
          AND scheduled_at <= ?
        ORDER BY scheduled_at ASC
      `, [beforeTimestamp], (err, rows: any[]) => {
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

  insertNudge(nudge: Partial<ExecutionNudge>): Promise<void> {
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
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  markNudgeAsSent(nudgeId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE execution_nudges
        SET status = 'sent', sent_at = ?
        WHERE id = ?
      `, [Date.now(), nudgeId], (err) => {
        if (err) reject(err);
        else {
          this.auditLog('NUDGE_SENT', `Nudge ${nudgeId} sent`);
          resolve();
        }
      });
    });
  }

  // Conflicts
  getConflicts(): Promise<ConflictResolution[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM conflict_resolutions
        WHERE status = 'open'
        ORDER BY severity ASC, detected_at DESC
      `, (err, rows: any[]) => {
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
}