/**
 * Timeline Engine Types
 *
 * Defines the data structures for the living Gantt timeline that fuses
 * context updates and WhatsApp messages into a single canonical state.
 */

export interface TimelineState {
  groupId: string;
  projectId: string;
  tasks: TimelineTask[];
  milestones: TimelineMilestone[];
  ganttMermaid: string;
  lastAiReasoning: string;
  lastUpdated: number; // Unix timestamp
  version: number; // Incremental version for optimistic updates
}

export interface TimelineTask {
  key: string; // Stable identifier (e.g., "task4" or hash of title+assignee)
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 1 | 2 | 3 | 4; // 1=Critical, 2=High, 3=Normal, 4=Low
  assignee: string | null; // Member name/alias
  deadline: string | null; // ISO date (YYYY-MM-DD)
  note?: string; // AI reasoning or source note
}

export interface TimelineMilestone {
  title: string;
  date: string; // ISO date (YYYY-MM-DD)
  status: 'upcoming' | 'in_progress' | 'completed';
  description?: string;
}

export interface ContextDelta {
  groupId: string;
  fullContext: string;
  timestamp: number;
}

export interface MessageDelta {
  groupId: string;
  author: string;
  authorName?: string;
  text: string;
  timestamp: number;
  isFromMe: boolean;
}

export interface TimelineUpdateRequest {
  groupId: string;
  projectContext: string; // Full context text
  currentTasks: TimelineTask[];
  currentMilestones: TimelineMilestone[];
  memberRoster: MemberInfo[];
  messageDeltas: MessageDelta[];
  existingGantt?: string; // Last known good Gantt
}

export interface TimelineUpdateResponse {
  tasks: TimelineTask[];
  milestones: TimelineMilestone[];
  ganttMermaid: string;
  reasoning: string;
  warnings?: string[];
}

export interface MemberInfo {
  memberId: string;
  name: string;
  alias?: string;
  role?: string;
}

export interface EventLogEntry {
  id: string;
  groupId: string;
  source: 'context' | 'whatsapp';
  payload: string; // JSON serialized
  createdAt: number;
}

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  change: string; // JSON serialized change description
  at: number;
}

export interface QueuedEvent {
  type: 'context' | 'message';
  data: ContextDelta | MessageDelta;
  enqueuedAt: number;
}

export interface ProcessingMetrics {
  groupId: string;
  lastProcessedAt: number;
  aiCallCount: number;
  successCount: number;
  failureCount: number;
  lastError?: string;
  inBackoff: boolean;
  backoffUntil?: number;
}
