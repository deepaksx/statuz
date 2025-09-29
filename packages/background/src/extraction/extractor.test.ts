import { describe, it, expect, beforeEach } from 'vitest';
import { MessageExtractor } from './extractor';
import type { Message, ProjectContext } from '@statuz/shared';

describe('MessageExtractor', () => {
  let extractor: MessageExtractor;
  let sampleContext: ProjectContext;
  let sampleMessage: Message;

  beforeEach(() => {
    extractor = new MessageExtractor();

    sampleContext = {
      mission: {
        statement: 'Test project',
        goals: ['Goal 1', 'Goal 2']
      },
      targets: {
        kpis: []
      },
      milestones: [
        {
          id: 'MTO_STRATEGY_50',
          title: 'MTO Strategy Implementation',
          description: 'Test milestone',
          owner: 'John Smith',
          dueDate: '2024-10-30',
          acceptanceCriteria: 'Test criteria'
        }
      ],
      glossary: {
        'MIGO': 'Goods Movement',
        'RAR': 'Revenue Accounting & Reporting',
        'FI/CO': 'Financial Accounting & Controlling'
      }
    };

    sampleMessage = {
      id: 'msg_001',
      groupId: 'group_001',
      author: '1234567890@c.us',
      authorName: 'John Smith',
      timestamp: Date.now(),
      text: '',
      raw: '{}'
    };

    extractor.setContext(sampleContext);
  });

  describe('Milestone Updates', () => {
    it('should extract milestone status updates', () => {
      sampleMessage.text = 'MTO Strategy 50 is 70% complete and on track';

      const signals = extractor.extractSignals(sampleMessage);

      expect(signals).toHaveLength(1);
      expect(signals[0].kind).toBe('MILESTONE_UPDATE');
      expect(signals[0].payload.milestoneId).toBe('MTO_STRATEGY_50');
      expect(signals[0].payload.percentComplete).toBe(70);
    });

    it('should extract status keywords', () => {
      sampleMessage.text = 'MTO Strategy implementation is done and deployed';

      const signals = extractor.extractSignals(sampleMessage);

      expect(signals).toHaveLength(1);
      expect(signals[0].kind).toBe('MILESTONE_UPDATE');
      expect(signals[0].payload.status).toBe('DONE');
    });

    it('should extract blocking issues', () => {
      sampleMessage.text = 'MTO Strategy is blocked by missing API documentation';

      const signals = extractor.extractSignals(sampleMessage);

      expect(signals).toHaveLength(1);
      expect(signals[0].kind).toBe('MILESTONE_UPDATE');
      expect(signals[0].payload.status).toBe('BLOCKED');
    });
  });

  describe('Todo Extraction', () => {
    it('should extract todo items with owners', () => {
      sampleMessage.text = '@John please review the design by Friday';

      const signals = extractor.extractSignals(sampleMessage);

      const todoSignals = signals.filter(s => s.kind === 'TODO');
      expect(todoSignals).toHaveLength(1);
      expect(todoSignals[0].payload.owner).toBe('John');
    });

    it('should extract action items', () => {
      sampleMessage.text = 'Action item: Complete testing by end of week';

      const signals = extractor.extractSignals(sampleMessage);

      const todoSignals = signals.filter(s => s.kind === 'TODO');
      expect(todoSignals).toHaveLength(1);
      expect(todoSignals[0].payload.description).toContain('Complete testing');
    });

    it('should extract priority from keywords', () => {
      sampleMessage.text = 'Todo: Fix the urgent security issue ASAP';

      const signals = extractor.extractSignals(sampleMessage);

      const todoSignals = signals.filter(s => s.kind === 'TODO');
      expect(todoSignals).toHaveLength(1);
      expect(todoSignals[0].payload.priority).toBe('HIGH');
    });
  });

  describe('Risk Extraction', () => {
    it('should extract risk mentions', () => {
      sampleMessage.text = 'Risk: Database migration might fail due to data corruption';

      const signals = extractor.extractSignals(sampleMessage);

      const riskSignals = signals.filter(s => s.kind === 'RISK');
      expect(riskSignals).toHaveLength(1);
      expect(riskSignals[0].payload.title).toContain('Database migration might fail');
    });

    it('should extract impact levels', () => {
      sampleMessage.text = 'Major risk identified: system could crash during deployment';

      const signals = extractor.extractSignals(sampleMessage);

      const riskSignals = signals.filter(s => s.kind === 'RISK');
      expect(riskSignals).toHaveLength(1);
      expect(riskSignals[0].payload.impact).toBe('HIGH');
    });
  });

  describe('Decision Extraction', () => {
    it('should extract decision statements', () => {
      sampleMessage.text = 'We decided to use Option A for the integration approach';

      const signals = extractor.extractSignals(sampleMessage);

      const decisionSignals = signals.filter(s => s.kind === 'DECISION');
      expect(decisionSignals).toHaveLength(1);
      expect(decisionSignals[0].payload.summary).toContain('use Option A');
    });

    it('should extract decision makers', () => {
      sampleMessage.text = 'John decided to postpone the release until next week';

      const signals = extractor.extractSignals(sampleMessage);

      const decisionSignals = signals.filter(s => s.kind === 'DECISION');
      expect(decisionSignals).toHaveLength(1);
      expect(decisionSignals[0].payload.decidedBy).toBe('John');
    });
  });

  describe('Blocker Extraction', () => {
    it('should extract blocker information', () => {
      sampleMessage.text = 'We are blocked by waiting for vendor approval';

      const signals = extractor.extractSignals(sampleMessage);

      const blockerSignals = signals.filter(s => s.kind === 'BLOCKER');
      expect(blockerSignals).toHaveLength(1);
      expect(blockerSignals[0].payload.description).toContain('waiting for vendor approval');
    });

    it('should identify dependency blockers', () => {
      sampleMessage.text = 'Cannot proceed because the API is not ready';

      const signals = extractor.extractSignals(sampleMessage);

      const blockerSignals = signals.filter(s => s.kind === 'BLOCKER');
      expect(blockerSignals).toHaveLength(1);
      expect(blockerSignals[0].payload.description).toContain('API is not ready');
    });
  });

  describe('Glossary Integration', () => {
    it('should recognize glossary terms', () => {
      sampleMessage.text = 'MIGO testing is complete and working well';

      const signals = extractor.extractSignals(sampleMessage);

      expect(signals.length).toBeGreaterThan(0);
      const signal = signals.find(s =>
        s.payload.mentionedText?.toLowerCase().includes('migo')
      );
      expect(signal).toBeDefined();
    });

    it('should extract signals for SAP transaction codes', () => {
      sampleMessage.text = 'RAR configuration is done and tested successfully';

      const signals = extractor.extractSignals(sampleMessage);

      const milestoneSignals = signals.filter(s => s.kind === 'MILESTONE_UPDATE');
      expect(milestoneSignals.length).toBeGreaterThan(0);
      expect(milestoneSignals[0].payload.status).toBe('DONE');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty messages', () => {
      sampleMessage.text = '';

      const signals = extractor.extractSignals(sampleMessage);

      expect(signals).toHaveLength(0);
    });

    it('should handle messages without context', () => {
      const extractorWithoutContext = new MessageExtractor();

      const signals = extractorWithoutContext.extractSignals(sampleMessage);

      expect(signals).toHaveLength(0);
    });

    it('should handle special characters in messages', () => {
      sampleMessage.text = 'MTO Strategy 50: 100% ✅ DONE! 🎉';

      const signals = extractor.extractSignals(sampleMessage);

      expect(signals).toHaveLength(1);
      expect(signals[0].payload.percentComplete).toBe(100);
      expect(signals[0].payload.status).toBe('DONE');
    });
  });
});