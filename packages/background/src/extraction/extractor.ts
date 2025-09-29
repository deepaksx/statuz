import { nanoid } from 'nanoid';
import type { Message, Signal, ProjectContext, MilestoneStatus } from '@statuz/shared';

export class MessageExtractor {
  private context: ProjectContext | null = null;

  setContext(context: ProjectContext) {
    this.context = context;
  }

  extractSignals(message: Message): Signal[] {
    if (!this.context) {
      return [];
    }

    const signals: Signal[] = [];
    const text = message.text.toLowerCase();

    // Extract milestone updates
    const milestoneSignals = this.extractMilestoneUpdates(message, text);
    signals.push(...milestoneSignals);

    // Extract todos
    const todoSignals = this.extractTodos(message, text);
    signals.push(...todoSignals);

    // Extract risks
    const riskSignals = this.extractRisks(message, text);
    signals.push(...riskSignals);

    // Extract decisions
    const decisionSignals = this.extractDecisions(message, text);
    signals.push(...decisionSignals);

    // Extract blockers
    const blockerSignals = this.extractBlockers(message, text);
    signals.push(...blockerSignals);

    return signals;
  }

  private extractMilestoneUpdates(message: Message, text: string): Signal[] {
    const signals: Signal[] = [];

    if (!this.context) return signals;

    // Look for milestone references
    for (const milestone of this.context.milestones) {
      const milestoneKeywords = [
        milestone.id.toLowerCase(),
        milestone.title.toLowerCase(),
        ...milestone.title.toLowerCase().split(/\s+/)
      ];

      const isMentioned = milestoneKeywords.some(keyword =>
        keyword.length > 2 && text.includes(keyword)
      );

      if (isMentioned) {
        const status = this.extractStatus(text);
        const percentComplete = this.extractPercentComplete(text);
        const dueDate = this.extractDueDate(text);
        const owner = this.extractOwner(text);
        const blockingIssue = this.extractBlockingIssue(text);

        signals.push({
          id: nanoid(),
          messageId: message.id,
          kind: 'MILESTONE_UPDATE',
          createdAt: Date.now(),
          payload: {
            milestoneId: milestone.id,
            mentionedText: this.extractRelevantSnippet(message.text, milestoneKeywords),
            status,
            percentComplete,
            dueDate,
            owner,
            blockingIssue
          }
        });
      }
    }

    // Look for general project terms from glossary
    for (const [term, definition] of Object.entries(this.context.glossary)) {
      if (text.includes(term.toLowerCase())) {
        const status = this.extractStatus(text);
        if (status) {
          signals.push({
            id: nanoid(),
            messageId: message.id,
            kind: 'MILESTONE_UPDATE',
            createdAt: Date.now(),
            payload: {
              mentionedText: this.extractRelevantSnippet(message.text, [term]),
              status
            }
          });
        }
      }
    }

    return signals;
  }

  private extractTodos(message: Message, text: string): Signal[] {
    const signals: Signal[] = [];

    // Common todo patterns
    const todoPatterns = [
      /(?:todo|to do|task|action item|action|need to|must|should)[:]\s*(.+)/gi,
      /(?:@\w+)\s+(?:please|can you|could you)\s+(.+)/gi,
      /(?:follow up|followup)\s+(?:on|with)\s+(.+)/gi,
      /(?:reminder|remind)\s+(?:to|about)\s+(.+)/gi
    ];

    for (const pattern of todoPatterns) {
      let match;
      while ((match = pattern.exec(message.text)) !== null) {
        const description = match[1]?.trim();
        if (description && description.length > 5) {
          const owner = this.extractOwner(text);
          const dueDate = this.extractDueDate(text);
          const priority = this.extractPriority(text);

          signals.push({
            id: nanoid(),
            messageId: message.id,
            kind: 'TODO',
            createdAt: Date.now(),
            payload: {
              description,
              owner,
              dueDate,
              priority
            }
          });
        }
      }
    }

    return signals;
  }

  private extractRisks(message: Message, text: string): Signal[] {
    const signals: Signal[] = [];

    const riskKeywords = ['risk', 'concern', 'issue', 'problem', 'challenge', 'blocker', 'delay'];
    const hasRiskKeyword = riskKeywords.some(keyword => text.includes(keyword));

    if (hasRiskKeyword) {
      const riskPatterns = [
        /(?:risk|concern|issue|problem)[:]\s*(.+)/gi,
        /(?:worried|concerned)\s+(?:about|that)\s+(.+)/gi,
        /(?:might|could|may)\s+(?:cause|lead to|result in)\s+(.+)/gi
      ];

      for (const pattern of riskPatterns) {
        let match;
        while ((match = pattern.exec(message.text)) !== null) {
          const title = match[1]?.trim();
          if (title && title.length > 10) {
            const likelihood = this.extractLikelihood(text);
            const impact = this.extractImpact(text);
            const mitigation = this.extractMitigation(text);

            signals.push({
              id: nanoid(),
              messageId: message.id,
              kind: 'RISK',
              createdAt: Date.now(),
              payload: {
                title,
                likelihood,
                impact,
                mitigation
              }
            });
          }
        }
      }
    }

    return signals;
  }

  private extractDecisions(message: Message, text: string): Signal[] {
    const signals: Signal[] = [];

    const decisionKeywords = ['decided', 'decision', 'agreed', 'approved', 'resolved', 'concluded'];
    const hasDecisionKeyword = decisionKeywords.some(keyword => text.includes(keyword));

    if (hasDecisionKeyword) {
      const decisionPatterns = [
        /(?:decided|decision|agreed|approved)[:]\s*(.+)/gi,
        /(?:we|team|management)\s+(?:decided|agreed|approved)\s+(?:to|that)\s+(.+)/gi
      ];

      for (const pattern of decisionPatterns) {
        let match;
        while ((match = pattern.exec(message.text)) !== null) {
          const summary = match[1]?.trim();
          if (summary && summary.length > 10) {
            const decidedBy = this.extractDecisionMaker(text);
            const decisionDate = this.extractDueDate(text);

            signals.push({
              id: nanoid(),
              messageId: message.id,
              kind: 'DECISION',
              createdAt: Date.now(),
              payload: {
                summary,
                decidedBy,
                decisionDate
              }
            });
          }
        }
      }
    }

    return signals;
  }

  private extractBlockers(message: Message, text: string): Signal[] {
    const signals: Signal[] = [];

    const blockerKeywords = ['blocked', 'blocker', 'stuck', 'waiting', 'dependency', 'blocked by'];
    const hasBlockerKeyword = blockerKeywords.some(keyword => text.includes(keyword));

    if (hasBlockerKeyword) {
      const blockerPatterns = [
        /(?:blocked|stuck|waiting)\s+(?:by|on|for)\s+(.+)/gi,
        /(?:dependency|blocker)[:]\s*(.+)/gi,
        /(?:cannot|can't)\s+(?:proceed|continue)\s+(?:because|until)\s+(.+)/gi
      ];

      for (const pattern of blockerPatterns) {
        let match;
        while ((match = pattern.exec(message.text)) !== null) {
          const description = match[1]?.trim();
          if (description && description.length > 5) {
            signals.push({
              id: nanoid(),
              messageId: message.id,
              kind: 'BLOCKER',
              createdAt: Date.now(),
              payload: {
                title: 'Blocker Identified',
                description
              }
            });
          }
        }
      }
    }

    return signals;
  }

  private extractStatus(text: string): MilestoneStatus | undefined {
    const statusMap: Record<string, MilestoneStatus> = {
      'completed': 'DONE',
      'done': 'DONE',
      'finished': 'DONE',
      'delivered': 'DONE',
      'deployed': 'DONE',
      'live': 'DONE',
      'blocked': 'BLOCKED',
      'stuck': 'BLOCKED',
      'waiting': 'BLOCKED',
      'at risk': 'AT_RISK',
      'risk': 'AT_RISK',
      'delayed': 'AT_RISK',
      'behind': 'AT_RISK',
      'in progress': 'IN_PROGRESS',
      'working': 'IN_PROGRESS',
      'developing': 'IN_PROGRESS',
      'ongoing': 'IN_PROGRESS'
    };

    for (const [keyword, status] of Object.entries(statusMap)) {
      if (text.includes(keyword)) {
        return status;
      }
    }

    return undefined;
  }

  private extractPercentComplete(text: string): number | undefined {
    const percentMatch = text.match(/(\d+)%/);
    if (percentMatch) {
      const percent = parseInt(percentMatch[1], 10);
      return percent >= 0 && percent <= 100 ? percent : undefined;
    }
    return undefined;
  }

  private extractDueDate(text: string): string | undefined {
    // Simple date patterns - could be enhanced with a proper date parser
    const datePatterns = [
      /(?:by|due|deadline)\s+(\d{1,2}\/\d{1,2}\/\d{4})/gi,
      /(?:by|due|deadline)\s+(\d{1,2}\s+\w+\s+\d{4})/gi,
      /(?:by|due|deadline)\s+(next\s+\w+)/gi,
      /(?:by|due|deadline)\s+(end\s+of\s+\w+)/gi
    ];

    for (const pattern of datePatterns) {
      const match = pattern.exec(text);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  private extractOwner(text: string): string | undefined {
    // Look for @mentions
    const mentionMatch = text.match(/@(\w+)/);
    if (mentionMatch) {
      return mentionMatch[1];
    }

    // Look for ownership patterns
    const ownerPatterns = [
      /(?:owner|assigned to|responsible)[:]\s*(\w+)/gi,
      /(\w+)\s+(?:is|will be)\s+(?:working on|handling|responsible)/gi
    ];

    for (const pattern of ownerPatterns) {
      const match = pattern.exec(text);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  private extractPriority(text: string): 'LOW' | 'MEDIUM' | 'HIGH' | undefined {
    if (text.includes('urgent') || text.includes('critical') || text.includes('high priority')) {
      return 'HIGH';
    }
    if (text.includes('medium priority') || text.includes('normal')) {
      return 'MEDIUM';
    }
    if (text.includes('low priority') || text.includes('nice to have')) {
      return 'LOW';
    }
    return undefined;
  }

  private extractLikelihood(text: string): 'LOW' | 'MEDIUM' | 'HIGH' | undefined {
    if (text.includes('likely') || text.includes('probable')) {
      return 'HIGH';
    }
    if (text.includes('possible') || text.includes('might')) {
      return 'MEDIUM';
    }
    if (text.includes('unlikely') || text.includes('rare')) {
      return 'LOW';
    }
    return undefined;
  }

  private extractImpact(text: string): 'LOW' | 'MEDIUM' | 'HIGH' | undefined {
    if (text.includes('critical') || text.includes('severe') || text.includes('major')) {
      return 'HIGH';
    }
    if (text.includes('moderate') || text.includes('medium')) {
      return 'MEDIUM';
    }
    if (text.includes('minor') || text.includes('low')) {
      return 'LOW';
    }
    return undefined;
  }

  private extractMitigation(text: string): string | undefined {
    const mitigationPatterns = [
      /(?:mitigation|solution|workaround)[:]\s*(.+)/gi,
      /(?:to mitigate|to resolve|to fix)\s+(.+)/gi
    ];

    for (const pattern of mitigationPatterns) {
      const match = pattern.exec(text);
      if (match) {
        return match[1]?.trim();
      }
    }

    return undefined;
  }

  private extractBlockingIssue(text: string): string | undefined {
    const blockingPatterns = [
      /(?:blocked by|blocked on|waiting for)[:]\s*(.+)/gi,
      /(?:dependency|blocker)[:]\s*(.+)/gi
    ];

    for (const pattern of blockingPatterns) {
      const match = pattern.exec(text);
      if (match) {
        return match[1]?.trim();
      }
    }

    return undefined;
  }

  private extractDecisionMaker(text: string): string | undefined {
    const decisionMakerPatterns = [
      /(?:decided by|approved by)[:]\s*(\w+)/gi,
      /(\w+)\s+(?:decided|approved)/gi
    ];

    for (const pattern of decisionMakerPatterns) {
      const match = pattern.exec(text);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  private extractRelevantSnippet(text: string, keywords: string[]): string {
    // Find the sentence containing the keywords
    const sentences = text.split(/[.!?]/);
    for (const sentence of sentences) {
      if (keywords.some(keyword => sentence.toLowerCase().includes(keyword.toLowerCase()))) {
        return sentence.trim();
      }
    }

    // Fallback to first 100 characters
    return text.substring(0, 100) + (text.length > 100 ? '...' : '');
  }
}