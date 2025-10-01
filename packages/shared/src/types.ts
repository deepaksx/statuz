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