/**
 * Timeline Engine
 *
 * Continuously fuses context updates and WhatsApp messages into a living Gantt chart.
 * Maintains per-group queues, debounces bursts, and produces stable incremental updates.
 */

import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import type { StatuzDatabase } from '@aipm/db';
import type { AIService } from './ai-service';
import type {
  TimelineState,
  ContextDelta,
  MessageDelta,
  QueuedEvent,
  ProcessingMetrics,
  TimelineTask,
  TimelineMilestone,
  MemberInfo,
  TimelineUpdateRequest,
  EventLogEntry,
  TaskHistoryEntry
} from './types/timeline';

const DEBOUNCE_WINDOW_MS = 8000; // 8 seconds
const MAX_MESSAGE_DELTAS = 50; // Last N messages to include
const MAX_AI_FAILURES = 3; // Circuit breaker threshold
const BACKOFF_DURATION_MS = 60000; // 1 minute backoff
const RATE_LIMIT_MS = 5000; // Minimum 5s between AI calls per group

export class TimelineEngine extends EventEmitter {
  private db: StatuzDatabase;
  private aiService: AIService;
  private queues: Map<string, QueuedEvent[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private metrics: Map<string, ProcessingMetrics> = new Map();
  private processing: Set<string> = new Set();

  constructor(db: StatuzDatabase, aiService: AIService) {
    super();
    this.db = db;
    this.aiService = aiService;
  }

  /**
   * Initialize the timeline engine
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Timeline Engine...');
    // Load existing metrics from database if needed
    console.log('✅ Timeline Engine initialized');
  }

  /**
   * Handle context delta event
   */
  async onContextDelta(delta: ContextDelta): Promise<void> {
    console.log(`📝 Context delta received for group ${delta.groupId}`);

    // Log event to database
    await this.logEvent({
      id: nanoid(),
      groupId: delta.groupId,
      source: 'context',
      payload: JSON.stringify(delta),
      createdAt: delta.timestamp
    });

    // Enqueue for processing
    this.enqueue(delta.groupId, {
      type: 'context',
      data: delta,
      enqueuedAt: Date.now()
    });
  }

  /**
   * Handle message delta event
   */
  async onMessageDelta(delta: MessageDelta): Promise<void> {
    // Skip messages from self to avoid noise
    if (delta.isFromMe) {
      return;
    }

    console.log(`💬 Message delta received for group ${delta.groupId} from ${delta.authorName || delta.author}`);

    // Log event to database
    await this.logEvent({
      id: nanoid(),
      groupId: delta.groupId,
      source: 'whatsapp',
      payload: JSON.stringify(delta),
      createdAt: delta.timestamp
    });

    // Enqueue for processing
    this.enqueue(delta.groupId, {
      type: 'message',
      data: delta,
      enqueuedAt: Date.now()
    });
  }

  /**
   * Enqueue event and schedule debounced processing
   */
  private enqueue(groupId: string, event: QueuedEvent): void {
    // Initialize queue if needed
    if (!this.queues.has(groupId)) {
      this.queues.set(groupId, []);
    }

    const queue = this.queues.get(groupId)!;
    queue.push(event);

    // Clear existing timer
    if (this.timers.has(groupId)) {
      clearTimeout(this.timers.get(groupId)!);
    }

    // Schedule debounced processing
    const timer = setTimeout(() => {
      this.processQueue(groupId);
    }, DEBOUNCE_WINDOW_MS);

    this.timers.set(groupId, timer);
  }

  /**
   * Process queued events for a group
   */
  private async processQueue(groupId: string): Promise<void> {
    // Check if already processing
    if (this.processing.has(groupId)) {
      console.log(`⏸️  Group ${groupId} already processing, will retry later`);
      return;
    }

    // Check circuit breaker
    const metrics = this.getMetrics(groupId);
    if (metrics.inBackoff && metrics.backoffUntil && Date.now() < metrics.backoffUntil) {
      console.warn(`🚫 Group ${groupId} in backoff until ${new Date(metrics.backoffUntil).toISOString()}`);
      this.queues.delete(groupId);
      return;
    }

    // Check rate limit
    if (metrics.lastProcessedAt && Date.now() - metrics.lastProcessedAt < RATE_LIMIT_MS) {
      console.log(`⏱️  Rate limit: waiting before processing ${groupId}`);
      // Reschedule
      const timer = setTimeout(() => this.processQueue(groupId), RATE_LIMIT_MS);
      this.timers.set(groupId, timer);
      return;
    }

    const queue = this.queues.get(groupId);
    if (!queue || queue.length === 0) {
      return;
    }

    try {
      this.processing.add(groupId);
      console.log(`🔄 Processing ${queue.length} events for group ${groupId}...`);

      await this.processTimelineUpdate(groupId, queue);

      // Clear queue and update metrics
      this.queues.delete(groupId);
      metrics.lastProcessedAt = Date.now();
      metrics.successCount++;
      metrics.inBackoff = false;
      metrics.failureCount = 0;
      metrics.lastError = undefined;

    } catch (error) {
      console.error(`❌ Timeline processing failed for ${groupId}:`, error);

      metrics.failureCount++;
      metrics.lastError = error instanceof Error ? error.message : 'Unknown error';

      // Circuit breaker logic
      if (metrics.failureCount >= MAX_AI_FAILURES) {
        metrics.inBackoff = true;
        metrics.backoffUntil = Date.now() + BACKOFF_DURATION_MS;
        console.warn(`🔴 Circuit breaker activated for ${groupId}, backing off for ${BACKOFF_DURATION_MS / 1000}s`);

        // Emit warning event for UI
        this.emit('timeline:error', {
          groupId,
          error: `Timeline updates paused due to repeated failures. Will retry in ${BACKOFF_DURATION_MS / 1000}s.`
        });
      }

      // Keep queue for retry after backoff
    } finally {
      this.processing.delete(groupId);
    }
  }

  /**
   * Core processing logic: fetch data, call AI, validate, persist
   */
  private async processTimelineUpdate(groupId: string, events: QueuedEvent[]): Promise<void> {
    // 1. Fetch current state
    const [project] = await this.db.getProjects({ whatsappGroupId: groupId });
    if (!project) {
      console.warn(`⚠️  No project found for group ${groupId}, skipping timeline update`);
      return;
    }

    // 2. Fetch group context
    const contextData = await this.db.getGroupContext(groupId);
    const context = contextData?.context || '';

    if (!context) {
      console.warn(`⚠️  No context set for group ${groupId}, skipping timeline update`);
      return;
    }

    // 3. Fetch current tasks
    const dbTasks = await this.db.getTasks({ groupId });
    const currentTasks: TimelineTask[] = dbTasks.map((t: any) => ({
      key: t.id,
      title: t.title,
      description: t.description || undefined,
      status: t.status as 'todo' | 'in_progress' | 'done',
      priority: t.priority as 1 | 2 | 3 | 4,
      assignee: t.assignee || null,
      deadline: t.deadline ? new Date(t.deadline).toISOString().split('T')[0] : null,
      note: undefined
    }));

    // 4. Fetch milestones
    const dbMilestones = await this.db.getMilestones({ groupId });
    const currentMilestones: TimelineMilestone[] = dbMilestones.map((m: any) => ({
      title: m.title,
      date: m.dueDate ? new Date(m.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: m.status as 'upcoming' | 'in_progress' | 'completed',
      description: m.description || undefined
    }));

    // 5. Fetch member roster
    const members = await this.db.getGroupMembers(groupId);
    const memberRoster: MemberInfo[] = members.map((m: any) => ({
      memberId: m.memberId,
      name: m.name,
      alias: m.alias || undefined,
      role: m.role || undefined
    }));

    // 6. Extract message deltas from events (last N)
    const messageDeltas: MessageDelta[] = events
      .filter(e => e.type === 'message')
      .map(e => e.data as MessageDelta)
      .slice(-MAX_MESSAGE_DELTAS);

    // 7. Build AI request
    const request: TimelineUpdateRequest = {
      groupId,
      projectContext: context,
      currentTasks,
      currentMilestones,
      memberRoster,
      messageDeltas,
      existingGantt: project.ganttChart || undefined
    };

    // 8. Call AI
    console.log(`🤖 Calling AI for timeline update...`);
    console.log(`   Context length: ${context.length} chars`);
    console.log(`   Current tasks: ${currentTasks.length}`);
    console.log(`   Message deltas: ${messageDeltas.length}`);
    console.log(`   Member roster: ${memberRoster.length}`);

    const aiResponse = await this.aiService.generateTimelineUpdate(request);

    console.log(`✅ AI response received:`);
    console.log(`   Tasks: ${aiResponse.tasks.length}`);
    console.log(`   Milestones: ${aiResponse.milestones.length}`);
    console.log(`   Gantt length: ${aiResponse.ganttMermaid.length} chars`);
    if (aiResponse.warnings && aiResponse.warnings.length > 0) {
      console.warn(`   Warnings: ${aiResponse.warnings.join(', ')}`);
    }

    // 9. Persist updates
    await this.persistTimelineUpdate(groupId, project.id, aiResponse);

    // 10. Emit update event for UI
    this.emit('timeline:updated', {
      groupId,
      projectId: project.id,
      timestamp: Date.now()
    });

    console.log(`✅ Timeline updated for group ${groupId}`);
  }

  /**
   * Persist timeline update to database
   */
  private async persistTimelineUpdate(
    groupId: string,
    projectId: string,
    response: { tasks: TimelineTask[]; milestones: TimelineMilestone[]; ganttMermaid: string; reasoning: string }
  ): Promise<void> {
    const now = Date.now();

    // 1. Update project Gantt and metadata
    await this.db.updateProject(projectId, {
      ganttChart: response.ganttMermaid,
      timelineUpdatedAt: now,
      timelineVersion: (await this.db.getProjectById(projectId))?.timelineVersion || 0 + 1,
      lastAiReasoning: response.reasoning,
      updatedAt: now
    });

    // 2. Upsert tasks (idempotent)
    await this.upsertTasks(groupId, projectId, response.tasks);

    // 3. Upsert milestones
    await this.upsertMilestones(groupId, projectId, response.milestones);
  }

  /**
   * Upsert tasks idempotently based on key (title + assignee hash)
   */
  private async upsertTasks(groupId: string, projectId: string, tasks: TimelineTask[]): Promise<void> {
    const existingTasks = await this.db.getTasks({ groupId });
    const existingByTitle = new Map(existingTasks.map((t: any) => [t.title.toLowerCase(), t]));

    for (const task of tasks) {
      const existing = existingByTitle.get(task.title.toLowerCase());

      if (existing) {
        // Update existing task
        const changes: any = {};
        if (existing.status !== task.status) changes.status = task.status;
        if (existing.priority !== task.priority) changes.priority = task.priority;
        if (existing.assignee !== task.assignee) changes.assignee = task.assignee;
        if (task.deadline && existing.deadline !== new Date(task.deadline).getTime()) {
          changes.deadline = new Date(task.deadline).getTime();
        }
        if (task.description && existing.description !== task.description) {
          changes.description = task.description;
        }

        if (Object.keys(changes).length > 0) {
          await this.db.updateTask(existing.id, { ...changes, updatedAt: Date.now() });

          // Log task history
          await this.logTaskHistory({
            id: nanoid(),
            taskId: existing.id,
            change: JSON.stringify(changes),
            at: Date.now()
          });

          console.log(`  ✏️  Updated task: ${task.title} (${Object.keys(changes).join(', ')})`);
        }
      } else {
        // Create new task
        const newTask = {
          id: nanoid(),
          groupId,
          projectId,
          title: task.title,
          description: task.description || null,
          status: task.status,
          priority: task.priority,
          assignee: task.assignee,
          reporter: null,
          deadline: task.deadline ? new Date(task.deadline).getTime() : null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await this.db.saveTask(newTask);

        // Log task history
        await this.logTaskHistory({
          id: nanoid(),
          taskId: newTask.id,
          change: JSON.stringify({ action: 'created', task: newTask }),
          at: Date.now()
        });

        console.log(`  ✨ Created task: ${task.title}`);
      }
    }
  }

  /**
   * Upsert milestones
   */
  private async upsertMilestones(groupId: string, projectId: string, milestones: TimelineMilestone[]): Promise<void> {
    const existingMilestones = await this.db.getMilestones({ groupId });
    const existingByTitle = new Map(existingMilestones.map((m: any) => [m.title.toLowerCase(), m]));

    for (const milestone of milestones) {
      const existing = existingByTitle.get(milestone.title.toLowerCase());

      if (existing) {
        // Update existing milestone
        const changes: any = {};
        if (existing.status !== milestone.status) changes.status = milestone.status;
        if (milestone.date && existing.dueDate !== new Date(milestone.date).getTime()) {
          changes.dueDate = new Date(milestone.date).getTime();
        }
        if (milestone.description && existing.description !== milestone.description) {
          changes.description = milestone.description;
        }

        if (Object.keys(changes).length > 0) {
          await this.db.updateMilestone(existing.id, changes);
          console.log(`  ✏️  Updated milestone: ${milestone.title}`);
        }
      } else {
        // Create new milestone
        const newMilestone = {
          id: nanoid(),
          groupId,
          projectId,
          title: milestone.title,
          description: milestone.description || null,
          dueDate: milestone.date ? new Date(milestone.date).getTime() : null,
          status: milestone.status,
          createdAt: Date.now()
        };

        await this.db.saveMilestone(newMilestone);
        console.log(`  ✨ Created milestone: ${milestone.title}`);
      }
    }
  }

  /**
   * Force immediate processing (bypass debounce)
   */
  async forceRefresh(groupId: string): Promise<void> {
    console.log(`🔄 Force refresh requested for group ${groupId}`);

    // Clear any existing timer
    if (this.timers.has(groupId)) {
      clearTimeout(this.timers.get(groupId)!);
      this.timers.delete(groupId);
    }

    // Process immediately
    await this.processQueue(groupId);
  }

  /**
   * Get current timeline state
   */
  async getState(groupId: string): Promise<TimelineState | null> {
    const [project] = await this.db.getProjects({ whatsappGroupId: groupId });
    if (!project) {
      return null;
    }

    const tasks = await this.db.getTasks({ groupId });
    const milestones = await this.db.getMilestones({ groupId });

    return {
      groupId,
      projectId: project.id,
      tasks: tasks.map((t: any) => ({
        key: t.id,
        title: t.title,
        description: t.description || undefined,
        status: t.status as 'todo' | 'in_progress' | 'done',
        priority: t.priority as 1 | 2 | 3 | 4,
        assignee: t.assignee || null,
        deadline: t.deadline ? new Date(t.deadline).toISOString().split('T')[0] : null
      })),
      milestones: milestones.map((m: any) => ({
        title: m.title,
        date: m.dueDate ? new Date(m.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: m.status as 'upcoming' | 'in_progress' | 'completed',
        description: m.description || undefined
      })),
      ganttMermaid: project.ganttChart || '',
      lastAiReasoning: project.lastAiReasoning || '',
      lastUpdated: project.timelineUpdatedAt || project.updatedAt || Date.now(),
      version: project.timelineVersion || 0
    };
  }

  /**
   * Get event history
   */
  async getHistory(groupId: string, limit: number = 100): Promise<EventLogEntry[]> {
    return this.db.getEventLog(groupId, limit);
  }

  /**
   * Get processing metrics
   */
  private getMetrics(groupId: string): ProcessingMetrics {
    if (!this.metrics.has(groupId)) {
      this.metrics.set(groupId, {
        groupId,
        lastProcessedAt: 0,
        aiCallCount: 0,
        successCount: 0,
        failureCount: 0,
        inBackoff: false
      });
    }
    return this.metrics.get(groupId)!;
  }

  /**
   * Log event to database
   */
  private async logEvent(entry: EventLogEntry): Promise<void> {
    await this.db.insertEventLog(entry);
  }

  /**
   * Log task history to database
   */
  private async logTaskHistory(entry: TaskHistoryEntry): Promise<void> {
    await this.db.insertTaskHistory(entry);
  }

  /**
   * Shutdown: clear all timers
   */
  shutdown(): void {
    console.log('🛑 Shutting down Timeline Engine...');
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.queues.clear();
    this.processing.clear();
    console.log('✅ Timeline Engine shutdown complete');
  }
}
