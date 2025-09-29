export type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'AT_RISK' | 'BLOCKED' | 'DONE';

export type SignalKind = 'MILESTONE_UPDATE' | 'TODO' | 'RISK' | 'DECISION' | 'BLOCKER' | 'INFO';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export type LikelihoodImpact = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SignalBase {
  id: string;
  messageId: string;
  createdAt: number;
}

export interface MilestoneUpdateSignal extends SignalBase {
  kind: 'MILESTONE_UPDATE';
  payload: {
    milestoneId?: string;
    mentionedText: string;
    status?: MilestoneStatus;
    percentComplete?: number;
    owner?: string;
    dueDate?: string;
    blockingIssue?: string;
    evidence?: string;
  };
}

export interface TodoSignal extends SignalBase {
  kind: 'TODO';
  payload: {
    description: string;
    owner?: string;
    dueDate?: string;
    priority?: Priority;
    relatedMilestoneId?: string;
  };
}

export interface RiskSignal extends SignalBase {
  kind: 'RISK';
  payload: {
    title: string;
    likelihood?: LikelihoodImpact;
    impact?: LikelihoodImpact;
    mitigation?: string;
    relatedMilestoneId?: string;
  };
}

export interface DecisionSignal extends SignalBase {
  kind: 'DECISION';
  payload: {
    summary: string;
    decidedBy?: string;
    decisionDate?: string;
    relatedMilestoneId?: string;
  };
}

export interface BlockerSignal extends SignalBase {
  kind: 'BLOCKER';
  payload: {
    title: string;
    description: string;
    owner?: string;
    relatedMilestoneId?: string;
  };
}

export interface InfoSignal extends SignalBase {
  kind: 'INFO';
  payload: {
    summary: string;
    relatedMilestoneId?: string;
  };
}

export type Signal = MilestoneUpdateSignal | TodoSignal | RiskSignal | DecisionSignal | BlockerSignal | InfoSignal;

export interface Group {
  id: string;
  name: string;
  isWatched: boolean;
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
  status: 'DISCONNECTED' | 'QR_REQUIRED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';
  qrCode?: string;
  error?: string;
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
  llmProvider: 'anthropic' | 'openai' | 'none';
  apiKey?: string;
  dataDirectory: string;
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