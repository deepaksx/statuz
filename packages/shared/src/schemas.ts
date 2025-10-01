import { z } from 'zod';

export const MilestoneStatusSchema = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'BLOCKED', 'DONE']);

export const PrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const LikelihoodImpactSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  isWatched: z.boolean(),
});

export const MessageSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  author: z.string(),
  authorName: z.string(),
  timestamp: z.number(),
  text: z.string(),
  raw: z.string(),
});

export const MilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  owner: z.string(),
  dueDate: z.string(),
  acceptanceCriteria: z.string(),
  status: MilestoneStatusSchema,
  lastUpdateTs: z.number(),
});

export const ProjectContextSchema = z.object({
  mission: z.object({
    statement: z.string(),
    goals: z.array(z.string()),
  }),
  targets: z.object({
    kpis: z.array(z.object({
      name: z.string(),
      target: z.string(),
      deadline: z.string(),
    })),
  }),
  milestones: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    owner: z.string(),
    dueDate: z.string(),
    acceptanceCriteria: z.string(),
  })),
  glossary: z.record(z.string()),
});

export const WhatsAppConnectionStateSchema = z.object({
  status: z.enum(['DISCONNECTED', 'QR_REQUIRED', 'CONNECTING', 'CONNECTED', 'RECONNECTING']),
  qrCode: z.string().optional(),
  error: z.string().optional(),
});

export const SnapshotReportSchema = z.object({
  generatedAt: z.number(),
  executiveSummary: z.object({
    progress: z.string(),
    risks: z.array(z.string()),
    upcomingDeadlines: z.array(z.object({
      milestoneId: z.string(),
      title: z.string(),
      dueDate: z.string(),
      owner: z.string(),
    })),
  }),
  milestones: z.array(z.object({
    id: z.string(),
    title: z.string(),
    owner: z.string(),
    dueDate: z.string(),
    status: MilestoneStatusSchema,
    lastUpdateNote: z.string().optional(),
  })),
  actionItems: z.array(z.object({
    description: z.string(),
    owner: z.string().optional(),
    dueDate: z.string().optional(),
    priority: PrioritySchema.optional(),
  })),
  decisions: z.array(z.object({
    summary: z.string(),
    decidedBy: z.string().optional(),
    decisionDate: z.string().optional(),
  })),
});

export const AppConfigSchema = z.object({
  privacyMode: z.boolean(),
  llmProvider: z.enum(['anthropic', 'openai', 'none']),
  apiKey: z.string().optional(),
  dataDirectory: z.string(),
});

export const IpcMessageSchema = z.object({
  type: z.string(),
  payload: z.any().optional(),
});

export const IpcResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});