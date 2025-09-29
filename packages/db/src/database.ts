import sqlite3 from 'sqlite3';
import { CREATE_TABLES, CREATE_INDEXES } from './schema.js';
import type { Group, Message, Signal, Milestone } from '@statuz/shared';

export class StatuzDatabase {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
    this.init();
  }

  private init() {
    this.db.serialize(() => {
      this.db.exec(CREATE_TABLES);
      this.db.exec(CREATE_INDEXES);
      this.auditLog('DATABASE_INIT', 'Database initialized');
    });
  }

  close() {
    this.db.close();
  }

  // Groups
  getGroups(): Group[] {
    const stmt = this.db.prepare('SELECT id, name, is_watched as isWatched FROM groups ORDER BY name');
    return stmt.all() as Group[];
  }

  getWatchedGroups(): Group[] {
    const stmt = this.db.prepare('SELECT id, name, is_watched as isWatched FROM groups WHERE is_watched = 1 ORDER BY name');
    return stmt.all() as Group[];
  }

  upsertGroup(group: Group) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO groups (id, name, is_watched) VALUES (?, ?, ?)');
    stmt.run(group.id, group.name, group.isWatched ? 1 : 0);
    this.auditLog('GROUP_UPSERT', `Group ${group.name} upserted`);
  }

  updateGroupWatchStatus(groupId: string, isWatched: boolean) {
    const stmt = this.db.prepare('UPDATE groups SET is_watched = ? WHERE id = ?');
    const changes = stmt.run(isWatched ? 1 : 0, groupId).changes;
    if (changes > 0) {
      this.auditLog('GROUP_WATCH_UPDATE', `Group ${groupId} watch status: ${isWatched}`);
    }
    return changes > 0;
  }

  // Messages
  insertMessage(message: Message) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO messages (id, group_id, author, author_name, timestamp, text, raw)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const changes = stmt.run(
      message.id,
      message.groupId,
      message.author,
      message.authorName,
      message.timestamp,
      message.text,
      message.raw
    ).changes;

    if (changes > 0) {
      this.auditLog('MESSAGE_INSERT', `Message ${message.id} inserted from group ${message.groupId}`);
    }
    return changes > 0;
  }

  getMessages(groupId?: string, since?: number, limit?: number): Message[] {
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

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Message[];
  }

  // Signals
  insertSignal(signal: Signal) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO signals (id, message_id, kind, payload, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      signal.id,
      signal.messageId,
      signal.kind,
      JSON.stringify(signal.payload),
      signal.createdAt
    );
    this.auditLog('SIGNAL_INSERT', `Signal ${signal.kind} inserted for message ${signal.messageId}`);
  }

  getSignals(kind?: string, since?: number, limit?: number): Signal[] {
    let query = `
      SELECT id, message_id as messageId, kind, payload, created_at as createdAt
      FROM signals
    `;
    const params: any[] = [];

    const conditions: string[] = [];
    if (kind) {
      conditions.push('kind = ?');
      params.push(kind);
    }
    if (since) {
      conditions.push('created_at >= ?');
      params.push(since);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      messageId: row.messageId,
      kind: row.kind,
      payload: JSON.parse(row.payload),
      createdAt: row.createdAt
    })) as Signal[];
  }

  // Milestones
  getMilestones(): Milestone[] {
    const stmt = this.db.prepare(`
      SELECT id, title, description, owner, due_date as dueDate,
             acceptance_criteria as acceptanceCriteria, status, last_update_ts as lastUpdateTs
      FROM milestones ORDER BY due_date
    `);
    return stmt.all() as Milestone[];
  }

  upsertMilestone(milestone: Milestone) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO milestones
      (id, title, description, owner, due_date, acceptance_criteria, status, last_update_ts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      milestone.id,
      milestone.title,
      milestone.description,
      milestone.owner,
      milestone.dueDate,
      milestone.acceptanceCriteria,
      milestone.status,
      milestone.lastUpdateTs
    );
    this.auditLog('MILESTONE_UPSERT', `Milestone ${milestone.title} upserted`);
  }

  updateMilestoneStatus(milestoneId: string, status: string, updateTs: number) {
    const stmt = this.db.prepare('UPDATE milestones SET status = ?, last_update_ts = ? WHERE id = ?');
    const changes = stmt.run(status, updateTs, milestoneId).changes;
    if (changes > 0) {
      this.auditLog('MILESTONE_STATUS_UPDATE', `Milestone ${milestoneId} status updated to ${status}`);
    }
    return changes > 0;
  }

  // Config
  getConfig(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM config WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value || null;
  }

  setConfig(key: string, value: string) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
    stmt.run(key, value);
  }

  // Audit
  auditLog(kind: string, detail: string) {
    const stmt = this.db.prepare('INSERT INTO audit (kind, detail, ts) VALUES (?, ?, ?)');
    stmt.run(kind, detail, Date.now());
  }

  getAuditLogs(limit = 100): Array<{ id: number; kind: string; detail: string; ts: number }> {
    const stmt = this.db.prepare('SELECT id, kind, detail, ts FROM audit ORDER BY ts DESC LIMIT ?');
    return stmt.all(limit) as Array<{ id: number; kind: string; detail: string; ts: number }>;
  }

  // Utility
  getLastSnapshotTime(): number {
    const result = this.getConfig('last_snapshot_time');
    return result ? parseInt(result, 10) : 0;
  }

  setLastSnapshotTime(timestamp: number) {
    this.setConfig('last_snapshot_time', timestamp.toString());
  }

  // Statistics
  getStats() {
    const stmt = this.db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM groups WHERE is_watched = 1) as watchedGroups,
        (SELECT COUNT(*) FROM messages) as totalMessages,
        (SELECT COUNT(*) FROM signals) as totalSignals,
        (SELECT COUNT(*) FROM milestones) as totalMilestones,
        (SELECT COUNT(*) FROM milestones WHERE status = 'DONE') as completedMilestones
    `);
    return stmt.get() as {
      watchedGroups: number;
      totalMessages: number;
      totalSignals: number;
      totalMilestones: number;
      completedMilestones: number;
    };
  }
}