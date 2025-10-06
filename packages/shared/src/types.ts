export type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'AT_RISK' | 'BLOCKED' | 'DONE';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export type LikelihoodImpact = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Group {
  id: string;
  name: string;
  isWatched: boolean;
  hasHistoryUploaded?: boolean;
  historyUploadedAt?: number;
  context?: string;
  contextUpdatedAt?: number;
  autoResponseEnabled?: boolean;
  autoResponseTrigger?: string;
}

export interface Message {
  id: string;
  groupId: string;
  author: string;
  authorName: string;
  timestamp: number;
  text: string;
  raw: string;
}

export interface Contact {
  phoneNumber: string;
  alias: string;
  role?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  owner: string;
  dueDate: string;
  acceptanceCriteria: string;
  status: MilestoneStatus;
  lastUpdateTs: number;
}

export interface ProjectContext {
  mission: {
    statement: string;
    goals: string[];
  };
  targets: {
    kpis: Array<{
      name: string;
      target: string;
      deadline: string;
    }>;
  };
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    owner: string;
    dueDate: string;
    acceptanceCriteria: string;
  }>;
  glossary: Record<string, string>;
}

export interface WhatsAppConnectionState {
  status: 'DISCONNECTED' | 'QR_REQUIRED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'BROWSER_MODE';
  qrCode?: string;
  error?: string;
  message?: string;
}

export interface SnapshotReport {
  generatedAt: number;
  executiveSummary: {
    progress: string;
    risks: string[];
    upcomingDeadlines: Array<{
      milestoneId: string;
      title: string;
      dueDate: string;
      owner: string;
    }>;
  };
  milestones: Array<{
    id: string;
    title: string;
    owner: string;
    dueDate: string;
    status: MilestoneStatus;
    lastUpdateNote?: string;
  }>;
  actionItems: Array<{
    description: string;
    owner?: string;
    dueDate?: string;
    priority?: Priority;
  }>;
  decisions: Array<{
    summary: string;
    decidedBy?: string;
    decisionDate?: string;
  }>;
}

export interface AppConfig {
  privacyMode: boolean;
  llmProvider: 'anthropic' | 'openai' | 'gemini' | 'none';
  apiKey?: string;
  geminiApiKey?: string;
  dataDirectory: string;
  autoResponseEnabled?: boolean;
  autoResponseTrigger?: string;
}

export interface IpcMessage<T = any> {
  type: string;
  payload?: T;
}

export interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
// ==================== AIPM - PROJECT MANAGEMENT TYPES ====================

export interface Project {
  id: string;
  name: string;
  code?: string;
  clientName?: string;
  whatsappGroupId?: string;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 1 | 2 | 3 | 4; // 1=critical, 4=low
  slaTier?: 'platinum' | 'gold' | 'silver' | 'bronze';
  startDate?: number;
  targetEndDate?: number;
  actualEndDate?: number;
  budgetHours?: number;
  consumedHours?: number;
  projectManager?: string;
  technicalLead?: string;
  description?: string;
  ganttChart?: string; // Mermaid Gantt chart syntax
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  projectId: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
  priority: 1 | 2 | 3 | 4;
  ownerPhone?: string;
  ownerAlias?: string;
  createdByPhone?: string;
  createdByAlias?: string;
  estimatedHours?: number;
  actualHours?: number;
  deadline?: number;
  completedAt?: number;
  blockerReason?: string;
  extractedFromMessageId?: string;
  confidenceScore?: number;
  tags?: string[];
  createdAt: number;
  updatedAt: number;

  // SCRUM fields (v2.3.0)
  workItemType?: 'epic' | 'story' | 'task' | 'subtask';
  storyPoints?: number;
  sprintId?: string;
  sprintName?: string;
  acceptanceCriteria?: string[]; // JSON array
  progressPercentage?: number;
  dependenciesCount?: number;
  blockersCount?: number;

  // SAP fields (v2.3.0)
  sapModule?: string; // FI, CO, MM, SD, PP, QM, PM, HR, ABAP, BASIS, BW
  sapTcode?: string; // VA01, ME21N, FB50, etc.
  sapObjectType?: string; // Program, Report, Function, Table
  sapTransportRequest?: string; // P01K905013

  // AI fields (v2.3.0)
  aiRecommendation?: string;
  aiRiskAssessment?: string;
  aiSimilarIssues?: string; // JSON array
  aiConfidenceLevel?: 'low' | 'medium' | 'high';
}

export interface Risk {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  category?: 'technical' | 'resource' | 'schedule' | 'scope' | 'external';
  severity: 'critical' | 'high' | 'medium' | 'low';
  probability: 'very_likely' | 'likely' | 'possible' | 'unlikely';
  impact?: string;
  mitigationPlan?: string;
  ownerPhone?: string;
  ownerAlias?: string;
  status: 'open' | 'monitoring' | 'mitigated' | 'realized' | 'closed';
  identifiedAt: number;
  extractedFromMessageId?: string;
  confidenceScore?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Decision {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  rationale?: string;
  alternativesConsidered?: string[];
  impact?: string;
  decisionMakerPhone?: string;
  decisionMakerAlias?: string;
  stakeholders?: string[];
  status: 'proposed' | 'approved' | 'rejected' | 'implemented';
  decidedAt?: number;
  implementedAt?: number;
  extractedFromMessageId?: string;
  confidenceScore?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Dependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: 'finish_to_start' | 'start_to_start' | 'finish_to_finish';
  lagDays: number;
  status: 'active' | 'resolved' | 'obsolete';
  createdAt: number;
}

export interface Stakeholder {
  id: string;
  projectId: string;
  phoneNumber: string;
  alias?: string;
  role?: 'pm' | 'tech_lead' | 'developer' | 'client' | 'sponsor';
  email?: string;
  organization?: string;
  isPrimaryContact: boolean;
  escalationLevel: number;
  slaResponseHours?: number;
  timezone: string;
  communicationPreference?: 'whatsapp' | 'email' | 'both';
  createdAt: number;
  updatedAt: number;
}

export interface ExecutionNudge {
  id: string;
  nudgeType: 'reminder' | 'escalation' | 'status_request' | 'blocker_alert';
  entityType: 'task' | 'risk' | 'decision' | 'project';
  entityId: string;
  recipientPhone: string;
  messageText: string;
  scheduledAt: number;
  sentAt?: number;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  escalationLevel: number;
  createdAt: number;
}

export interface ConflictResolution {
  id: string;
  conflictType: 'deadline' | 'resource' | 'priority' | 'dependency';
  description: string;
  affectedEntities: Array<{ type: string; id: string }>;
  severity: 'critical' | 'high' | 'medium' | 'low';
  detectedAt: number;
  resolutionOptions?: string[];
  chosenResolution?: string;
  resolvedAt?: number;
  resolvedByPhone?: string;
  status: 'open' | 'resolved' | 'acknowledged' | 'ignored';
  createdAt: number;
  updatedAt: number;
}

export interface Report {
  id: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
  audience: 'team' | 'client' | 'executive';
  projectId?: string;
  periodStart: number;
  periodEnd: number;
  generatedAt: number;
  generatedBy: string;
  format: 'markdown' | 'json' | 'html';
  content: string;
  summary?: string;
  sentTo?: string[];
  filePath?: string;
  createdAt: number;
}

export interface JiraSyncState {
  id: string;
  entityType: 'task' | 'project' | 'risk';
  localId: string;
  jiraKey: string;
  jiraId?: string;
  lastSyncAt?: number;
  syncDirection: 'to_jira' | 'from_jira' | 'bidirectional';
  syncStatus: 'pending' | 'synced' | 'conflict' | 'error';
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}
