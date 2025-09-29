import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SnapshotGenerator } from './generator';
import type { StatuzDatabase } from '@statuz/db';
import type { Signal, Milestone } from '@statuz/shared';

// Mock database
const mockDb = {
  getLastSnapshotTime: vi.fn(),
  setLastSnapshotTime: vi.fn(),
  getSignals: vi.fn(),
  getMilestones: vi.fn(),
  upsertMilestone: vi.fn(),
  auditLog: vi.fn(),
} as unknown as StatuzDatabase;

describe('SnapshotGenerator', () => {
  let generator: SnapshotGenerator;
  let sampleMilestones: Milestone[];
  let sampleSignals: Signal[];

  beforeEach(() => {
    vi.clearAllMocks();
    generator = new SnapshotGenerator(mockDb);

    sampleMilestones = [
      {
        id: 'MTO_STRATEGY_50',
        title: 'MTO Strategy Implementation',
        description: 'Test milestone',
        owner: 'John Smith',
        dueDate: '2024-10-30',
        acceptanceCriteria: 'Test criteria',
        status: 'IN_PROGRESS',
        lastUpdateTs: Date.now() - 86400000 // 1 day ago
      },
      {
        id: 'RAR_SETUP',
        title: 'RAR Setup',
        description: 'Revenue accounting setup',
        owner: 'Sarah Johnson',
        dueDate: '2024-11-15',
        acceptanceCriteria: 'RAR functional',
        status: 'NOT_STARTED',
        lastUpdateTs: Date.now() - 172800000 // 2 days ago
      }
    ];

    sampleSignals = [
      {
        id: 'signal_001',
        messageId: 'msg_001',
        kind: 'MILESTONE_UPDATE',
        createdAt: Date.now(),
        payload: {
          milestoneId: 'MTO_STRATEGY_50',
          mentionedText: 'MTO Strategy 50 is 70% complete',
          status: 'IN_PROGRESS',
          percentComplete: 70
        }
      },
      {
        id: 'signal_002',
        messageId: 'msg_002',
        kind: 'TODO',
        createdAt: Date.now(),
        payload: {
          description: 'Review design documentation',
          owner: 'John Smith',
          priority: 'HIGH'
        }
      },
      {
        id: 'signal_003',
        messageId: 'msg_003',
        kind: 'RISK',
        createdAt: Date.now(),
        payload: {
          title: 'Database migration risk',
          likelihood: 'MEDIUM',
          impact: 'HIGH'
        }
      },
      {
        id: 'signal_004',
        messageId: 'msg_004',
        kind: 'DECISION',
        createdAt: Date.now(),
        payload: {
          summary: 'Use microservices architecture',
          decidedBy: 'Architecture Team'
        }
      }
    ];

    // Setup mocks
    (mockDb.getLastSnapshotTime as any).mockReturnValue(0);
    (mockDb.getSignals as any).mockReturnValue(sampleSignals);
    (mockDb.getMilestones as any).mockReturnValue(sampleMilestones);
    (mockDb.upsertMilestone as any).mockReturnValue(undefined);
    (mockDb.auditLog as any).mockReturnValue(undefined);
    (mockDb.setLastSnapshotTime as any).mockReturnValue(undefined);
  });

  describe('generateSnapshot', () => {
    it('should generate a complete snapshot report', async () => {
      const report = await generator.generateSnapshot();

      expect(report).toBeDefined();
      expect(report.generatedAt).toBeGreaterThan(0);
      expect(report.executiveSummary).toBeDefined();
      expect(report.milestones).toHaveLength(2);
      expect(report.actionItems).toHaveLength(1);
      expect(report.decisions).toHaveLength(1);
    });

    it('should update milestone statuses based on signals', async () => {
      const doneSignal: Signal = {
        id: 'signal_done',
        messageId: 'msg_done',
        kind: 'MILESTONE_UPDATE',
        createdAt: Date.now(),
        payload: {
          milestoneId: 'RAR_SETUP',
          mentionedText: 'RAR setup is done',
          status: 'DONE'
        }
      };

      (mockDb.getSignals as any).mockReturnValue([...sampleSignals, doneSignal]);

      const report = await generator.generateSnapshot();

      expect(mockDb.upsertMilestone).toHaveBeenCalled();
      const updatedMilestone = report.milestones.find(m => m.id === 'RAR_SETUP');
      expect(updatedMilestone?.status).toBe('DONE');
    });

    it('should generate executive summary with progress', async () => {
      const report = await generator.generateSnapshot();

      expect(report.executiveSummary.progress).toContain('0/2 milestones completed');
      expect(report.executiveSummary.risks).toContain('Database migration risk');
      expect(report.executiveSummary.upcomingDeadlines).toBeDefined();
    });

    it('should extract action items from TODO signals', async () => {
      const report = await generator.generateSnapshot();

      expect(report.actionItems).toHaveLength(1);
      expect(report.actionItems[0].description).toBe('Review design documentation');
      expect(report.actionItems[0].owner).toBe('John Smith');
      expect(report.actionItems[0].priority).toBe('HIGH');
    });

    it('should extract decisions from DECISION signals', async () => {
      const report = await generator.generateSnapshot();

      expect(report.decisions).toHaveLength(1);
      expect(report.decisions[0].summary).toBe('Use microservices architecture');
      expect(report.decisions[0].decidedBy).toBe('Architecture Team');
    });

    it('should identify upcoming deadlines', async () => {
      // Create milestones with near-future deadlines
      const nearDeadlineMilestone: Milestone = {
        ...sampleMilestones[0],
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        status: 'IN_PROGRESS'
      };

      (mockDb.getMilestones as any).mockReturnValue([nearDeadlineMilestone]);

      const report = await generator.generateSnapshot();

      expect(report.executiveSummary.upcomingDeadlines).toHaveLength(1);
      expect(report.executiveSummary.upcomingDeadlines[0].milestoneId).toBe('MTO_STRATEGY_50');
    });

    it('should mark milestones as at-risk when deadline is near', async () => {
      // Create milestone with very near deadline
      const atRiskMilestone: Milestone = {
        ...sampleMilestones[0],
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        status: 'IN_PROGRESS'
      };

      (mockDb.getMilestones as any).mockReturnValue([atRiskMilestone]);

      // Add a risk signal for this milestone
      const riskSignal: Signal = {
        id: 'risk_signal',
        messageId: 'msg_risk',
        kind: 'RISK',
        createdAt: Date.now(),
        payload: {
          title: 'Timeline concern',
          relatedMilestoneId: 'MTO_STRATEGY_50',
          impact: 'HIGH'
        }
      };

      (mockDb.getSignals as any).mockReturnValue([riskSignal]);

      const report = await generator.generateSnapshot();

      const milestone = report.milestones.find(m => m.id === 'MTO_STRATEGY_50');
      expect(milestone?.status).toBe('AT_RISK');
    });
  });

  describe('formatAsMarkdown', () => {
    it('should format report as markdown', async () => {
      const report = await generator.generateSnapshot();
      const markdown = generator.formatAsMarkdown(report);

      expect(markdown).toContain('# Project Status Report');
      expect(markdown).toContain('## Executive Summary');
      expect(markdown).toContain('## Milestones');
      expect(markdown).toContain('| ID | Title | Owner | Due Date | Status | Last Update |');
      expect(markdown).toContain('## Action Items');
      expect(markdown).toContain('## Decisions');
    });

    it('should include milestone table with proper formatting', async () => {
      const report = await generator.generateSnapshot();
      const markdown = generator.formatAsMarkdown(report);

      expect(markdown).toContain('MTO_STRATEGY_50');
      expect(markdown).toContain('MTO Strategy Implementation');
      expect(markdown).toContain('John Smith');
      expect(markdown).toContain('IN_PROGRESS');
    });

    it('should group action items by owner', async () => {
      // Add more TODO signals with different owners
      const todoSignals: Signal[] = [
        {
          id: 'todo_1',
          messageId: 'msg_todo_1',
          kind: 'TODO',
          createdAt: Date.now(),
          payload: {
            description: 'Task 1',
            owner: 'John Smith',
            priority: 'HIGH'
          }
        },
        {
          id: 'todo_2',
          messageId: 'msg_todo_2',
          kind: 'TODO',
          createdAt: Date.now(),
          payload: {
            description: 'Task 2',
            owner: 'Sarah Johnson',
            priority: 'MEDIUM'
          }
        }
      ];

      (mockDb.getSignals as any).mockReturnValue(todoSignals);

      const report = await generator.generateSnapshot();
      const markdown = generator.formatAsMarkdown(report);

      expect(markdown).toContain('### John Smith');
      expect(markdown).toContain('### Sarah Johnson');
      expect(markdown).toContain('Task 1');
      expect(markdown).toContain('Task 2');
    });
  });

  describe('edge cases', () => {
    it('should handle empty signals gracefully', async () => {
      (mockDb.getSignals as any).mockReturnValue([]);

      const report = await generator.generateSnapshot();

      expect(report.actionItems).toHaveLength(0);
      expect(report.decisions).toHaveLength(0);
      expect(report.executiveSummary.risks).toHaveLength(0);
    });

    it('should handle milestones without related signals', async () => {
      (mockDb.getSignals as any).mockReturnValue([]);

      const report = await generator.generateSnapshot();

      expect(report.milestones).toHaveLength(2);
      expect(report.milestones[0].lastUpdateNote).toBeUndefined();
    });

    it('should calculate completion rate correctly', async () => {
      // Mark one milestone as done
      const completedMilestones = [
        { ...sampleMilestones[0], status: 'DONE' as const },
        sampleMilestones[1]
      ];

      (mockDb.getMilestones as any).mockReturnValue(completedMilestones);

      const report = await generator.generateSnapshot();

      expect(report.executiveSummary.progress).toContain('1/2 milestones completed (50%)');
    });
  });
});