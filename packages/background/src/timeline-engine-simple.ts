/**
 * Timeline Engine - Simplified Version
 *
 * Continuously fuses context updates and WhatsApp messages into a living Gantt chart.
 * Uses background service methods instead of direct database calls.
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
  EventLogEntry,
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
    console.log(`⚙️  Debounce: ${DEBOUNCE_WINDOW_MS}ms, Rate limit: ${RATE_LIMIT_MS}ms`);
    console.log('✅ Timeline Engine initialized');
  }

  /**
   * Handle context delta (project context update)
   */
  async onContextDelta(delta: ContextDelta): Promise<void> {
    console.log(`📝 Context delta received for group ${delta.groupId}`);
    await this.logEvent({
      id: nanoid(),
      groupId: delta.groupId,
      source: 'context',
      payload: JSON.stringify(delta),
      createdAt: Date.now()
    });

    this.enqueue(delta.groupId, {
      type: 'context',
      data: delta,
      enqueuedAt: Date.now()
    });
  }

  /**
   * Handle message delta (WhatsApp message)
   */
  async onMessageDelta(delta: MessageDelta): Promise<void> {
    if (delta.isFromMe) return; // Skip self messages

    console.log(`💬 Message delta received for group ${delta.groupId}`);
    await this.logEvent({
      id: nanoid(),
      groupId: delta.groupId,
      source: 'whatsapp',
      payload: JSON.stringify(delta),
      createdAt: Date.now()
    });

    this.enqueue(delta.groupId, {
      type: 'message',
      data: delta,
      enqueuedAt: Date.now()
    });
  }

  /**
   * Force immediate timeline refresh (bypass debounce)
   */
  async forceRefresh(groupId: string): Promise<void> {
    console.log(`🔄 Force refresh requested for group ${groupId}`);

    // Clear existing timer
    const timer = this.timers.get(groupId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(groupId);
    }

    // Process immediately
    await this.processQueue(groupId);
  }

  /**
   * Get current timeline state for a group
   */
  async getState(groupId: string): Promise<TimelineState | null> {
    try {
      // Get projects for this group
      const allProjects = await this.db.getProjects();
      const projects = allProjects.filter((p: any) => p.whatsappGroupId === groupId);

      if (projects.length === 0) {
        return null;
      }

      const project = projects[0];

      return {
        groupId,
        projectId: project.id,
        tasks: [], // Tasks would be extracted from the Gantt chart
        milestones: [], // Milestones would be extracted from the Gantt chart
        ganttMermaid: project.ganttChart || '',
        lastAiReasoning: project.lastAiReasoning || '',
        lastUpdated: project.timelineUpdatedAt || project.updatedAt || Date.now(),
        version: project.timelineVersion || 0
      };
    } catch (error) {
      console.error(`Failed to get timeline state for group ${groupId}:`, error);
      return null;
    }
  }

  /**
   * Get timeline processing history
   */
  async getHistory(groupId: string, limit = 50): Promise<any[]> {
    return await this.db.getEventLog(groupId, limit);
  }

  /**
   * Enqueue an event and schedule processing
   */
  private enqueue(groupId: string, event: QueuedEvent): void {
    if (!this.queues.has(groupId)) {
      this.queues.set(groupId, []);
    }

    const queue = this.queues.get(groupId)!;
    queue.push(event);

    // Trim message events to MAX_MESSAGE_DELTAS
    const messageEvents = queue.filter(e => e.type === 'message');
    if (messageEvents.length > MAX_MESSAGE_DELTAS) {
      const toRemove = messageEvents.slice(0, messageEvents.length - MAX_MESSAGE_DELTAS);
      toRemove.forEach(evt => {
        const idx = queue.indexOf(evt);
        if (idx >= 0) queue.splice(idx, 1);
      });
    }

    // Reset debounce timer
    const existingTimer = this.timers.get(groupId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const newTimer = setTimeout(() => {
      this.processQueue(groupId).catch(err => {
        console.error(`❌ Timeline processing error for group ${groupId}:`, err);
      });
    }, DEBOUNCE_WINDOW_MS);

    this.timers.set(groupId, newTimer);
  }

  /**
   * Process queued events for a group
   */
  private async processQueue(groupId: string): Promise<void> {
    // Prevent concurrent processing
    if (this.processing.has(groupId)) {
      console.log(`⏸️  Group ${groupId} already processing, skipping`);
      return;
    }

    const queue = this.queues.get(groupId);
    if (!queue || queue.length === 0) {
      console.log(`⏭️  No events queued for group ${groupId}`);
      return;
    }

    // Check circuit breaker
    if (this.isCircuitBreakerActive(groupId)) {
      console.warn(`🔴 Circuit breaker active for group ${groupId}, skipping processing`);
      return;
    }

    // Check rate limit
    const metrics = this.getMetrics(groupId);
    const timeSinceLastCall = Date.now() - metrics.lastAiCallAt;
    if (metrics.lastAiCallAt > 0 && timeSinceLastCall < RATE_LIMIT_MS) {
      const waitTime = RATE_LIMIT_MS - timeSinceLastCall;
      console.log(`⏱️  Rate limit: waiting ${waitTime}ms for group ${groupId}`);
      setTimeout(() => this.processQueue(groupId), waitTime);
      return;
    }

    this.processing.add(groupId);

    try {
      console.log(`🔄 Processing ${queue.length} events for group ${groupId}`);

      // Get context
      const contextResult = await this.db.getGroupContext(groupId);
      if (!contextResult || !contextResult.context) {
        console.warn(`⚠️  No context set for group ${groupId}, skipping`);
        this.queues.set(groupId, []);
        this.processing.delete(groupId);
        return;
      }

      // Extract message deltas from queue
      const messageDeltas = queue
        .filter(e => e.type === 'message')
        .map(e => e.data as MessageDelta)
        .slice(-MAX_MESSAGE_DELTAS);

      // Get projects for this group
      const allProjects = await this.db.getProjects();
      const projects = allProjects.filter((p: any) => p.whatsappGroupId === groupId);

      if (projects.length === 0) {
        console.warn(`⚠️  No project found for group ${groupId}, skipping`);
        this.queues.set(groupId, []);
        this.processing.delete(groupId);
        return;
      }

      const project = projects[0];

      // Get groups to get the group name
      const groups = await this.db.getGroups();
      const group = groups.find((g: any) => g.id === groupId);

      // Get tasks for the project
      const tasks = await this.db.getTasks({ projectId: project.id });

      console.log(`🤖 Calling AI for timeline update...`);
      console.log(`   Context: ${contextResult.context.substring(0, 100)}...`);
      console.log(`   Messages: ${messageDeltas.length} deltas`);

      // Call AI to generate timeline update
      const result = await this.aiService.generateGanttChart({
        context: contextResult.context,
        groupName: group?.name || 'Project',
        tasks,
        projects: [project]
      });

      if (result && result.mermaidSyntax) {
        // Update project with new Gantt chart
        await this.db.updateProject(project.id, {
          ganttChart: result.mermaidSyntax,
          timelineUpdatedAt: Date.now(),
          timelineVersion: (project.timelineVersion || 0) + 1,
          updatedAt: Date.now()
        });

        console.log(`✅ Timeline updated for group ${groupId}`);
        console.log(`   Version: ${(project.timelineVersion || 0) + 1}`);
      }

      // Clear queue
      this.queues.set(groupId, []);

      // Update metrics
      metrics.lastAiCallAt = Date.now();
      metrics.consecutiveFailures = 0;
      metrics.totalProcessed++;

      // Emit update event
      this.emit('timeline:updated', { groupId });

    } catch (error) {
      console.error(`❌ Timeline update failed for group ${groupId}:`, error);

      // Update failure metrics
      metrics.consecutiveFailures++;
      metrics.lastFailureAt = Date.now();

      // Check if circuit breaker should activate
      if (metrics.consecutiveFailures >= MAX_AI_FAILURES) {
        console.error(`🔴 Circuit breaker activated for group ${groupId} after ${MAX_AI_FAILURES} failures`);
        metrics.circuitBreakerUntil = Date.now() + BACKOFF_DURATION_MS;
      }
    } finally {
      this.processing.delete(groupId);
    }
  }

  /**
   * Check if circuit breaker is active
   */
  private isCircuitBreakerActive(groupId: string): boolean {
    const metrics = this.getMetrics(groupId);
    if (metrics.circuitBreakerUntil && Date.now() < metrics.circuitBreakerUntil) {
      return true;
    }
    // Reset if backoff period expired
    if (metrics.circuitBreakerUntil && Date.now() >= metrics.circuitBreakerUntil) {
      metrics.circuitBreakerUntil = undefined;
      metrics.consecutiveFailures = 0;
      console.log(`✅ Circuit breaker reset for group ${groupId}`);
    }
    return false;
  }

  /**
   * Get or create metrics for a group
   */
  private getMetrics(groupId: string): ProcessingMetrics {
    if (!this.metrics.has(groupId)) {
      this.metrics.set(groupId, {
        lastAiCallAt: 0,
        consecutiveFailures: 0,
        totalProcessed: 0
      });
    }
    return this.metrics.get(groupId)!;
  }

  /**
   * Log event to database
   */
  private async logEvent(entry: EventLogEntry): Promise<void> {
    try {
      await this.db.insertEventLog(entry);
    } catch (error) {
      console.error('Failed to log event:', error);
    }
  }
}
