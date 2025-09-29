import type { SnapshotReport, Signal, Milestone, MilestoneStatus } from '@statuz/shared';
import type { StatuzDatabase } from '@statuz/db';

export class SnapshotGenerator {
  constructor(private db: StatuzDatabase) {}

  async generateSnapshot(since?: number): Promise<SnapshotReport> {
    const now = Date.now();
    const snapshotSince = since || this.db.getLastSnapshotTime();

    // Get all signals since the last snapshot
    const signals = this.db.getSignals(undefined, snapshotSince);

    // Get current milestones
    const milestones = this.db.getMilestones();

    // Update milestone statuses based on signals
    const updatedMilestones = this.updateMilestoneStatuses(milestones, signals);

    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(updatedMilestones, signals);

    // Extract action items from TODO signals
    const actionItems = this.extractActionItems(signals);

    // Extract decisions from DECISION signals
    const decisions = this.extractDecisions(signals);

    // Save updated milestone statuses
    for (const milestone of updatedMilestones) {
      this.db.upsertMilestone(milestone);
    }

    // Update last snapshot time
    this.db.setLastSnapshotTime(now);

    const report: SnapshotReport = {
      generatedAt: now,
      executiveSummary,
      milestones: updatedMilestones.map(m => ({
        id: m.id,
        title: m.title,
        owner: m.owner,
        dueDate: m.dueDate,
        status: m.status,
        lastUpdateNote: this.getLastUpdateNote(m.id, signals)
      })),
      actionItems,
      decisions
    };

    this.db.auditLog('SNAPSHOT_GENERATED', `Snapshot generated with ${signals.length} signals`);

    return report;
  }

  private updateMilestoneStatuses(milestones: Milestone[], signals: Signal[]): Milestone[] {
    const updated = [...milestones];

    for (const milestone of updated) {
      const relevantSignals = signals.filter(signal =>
        this.isSignalRelevantToMilestone(signal, milestone)
      );

      if (relevantSignals.length === 0) continue;

      // Sort signals by creation time (newest first)
      relevantSignals.sort((a, b) => b.createdAt - a.createdAt);

      const newStatus = this.calculateMilestoneStatus(milestone, relevantSignals);
      if (newStatus && newStatus !== milestone.status) {
        milestone.status = newStatus;
        milestone.lastUpdateTs = Date.now();
      }
    }

    return updated;
  }

  private isSignalRelevantToMilestone(signal: Signal, milestone: Milestone): boolean {
    // Direct milestone ID match
    if (signal.kind === 'MILESTONE_UPDATE' && signal.payload.milestoneId === milestone.id) {
      return true;
    }

    // Check if signal mentions milestone in any payload field that could reference it
    const payloadText = JSON.stringify(signal.payload).toLowerCase();
    const milestoneKeywords = [
      milestone.id.toLowerCase(),
      milestone.title.toLowerCase(),
      ...milestone.title.toLowerCase().split(/\s+/)
    ];

    return milestoneKeywords.some(keyword =>
      keyword.length > 2 && payloadText.includes(keyword)
    );
  }

  private calculateMilestoneStatus(milestone: Milestone, signals: Signal[]): MilestoneStatus | null {
    // Check for explicit status updates
    for (const signal of signals) {
      if (signal.kind === 'MILESTONE_UPDATE' && signal.payload.status) {
        return signal.payload.status;
      }
    }

    // Check for blockers
    const hasBlockers = signals.some(signal =>
      signal.kind === 'BLOCKER' || signal.kind === 'RISK'
    );

    // Check due date proximity for at-risk status
    const dueDate = new Date(milestone.dueDate);
    const daysToDue = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

    if (hasBlockers) {
      return 'BLOCKED';
    }

    if (daysToDue < 7 && daysToDue > 0 && milestone.status !== 'DONE') {
      return 'AT_RISK';
    }

    // Check for progress indicators
    const hasProgress = signals.some(signal =>
      signal.kind === 'MILESTONE_UPDATE' ||
      signal.kind === 'TODO' ||
      signal.kind === 'INFO'
    );

    if (hasProgress && milestone.status === 'NOT_STARTED') {
      return 'IN_PROGRESS';
    }

    return null;
  }

  private generateExecutiveSummary(milestones: Milestone[], signals: Signal[]) {
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.status === 'DONE').length;
    const atRiskMilestones = milestones.filter(m => m.status === 'AT_RISK' || m.status === 'BLOCKED');

    const progress = totalMilestones > 0
      ? `${completedMilestones}/${totalMilestones} milestones completed (${Math.round(completedMilestones / totalMilestones * 100)}%)`
      : 'No milestones defined';

    const risks = signals
      .filter(signal => signal.kind === 'RISK' || signal.kind === 'BLOCKER')
      .map(signal => {
        if (signal.kind === 'RISK') {
          return signal.payload.title;
        } else if (signal.kind === 'BLOCKER') {
          return signal.payload.title;
        }
        return '';
      })
      .filter(risk => risk.length > 0);

    const now = Date.now();
    const upcomingDeadlines = milestones
      .filter(m => {
        const dueDate = new Date(m.dueDate);
        const daysToDue = (dueDate.getTime() - now) / (1000 * 60 * 60 * 24);
        return daysToDue > 0 && daysToDue <= 14 && m.status !== 'DONE';
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5)
      .map(m => ({
        milestoneId: m.id,
        title: m.title,
        dueDate: m.dueDate,
        owner: m.owner
      }));

    return {
      progress,
      risks: [...new Set(risks)], // Remove duplicates
      upcomingDeadlines
    };
  }

  private extractActionItems(signals: Signal[]) {
    return signals
      .filter(signal => signal.kind === 'TODO')
      .map(signal => ({
        description: signal.payload.description,
        owner: signal.payload.owner,
        dueDate: signal.payload.dueDate,
        priority: signal.payload.priority
      }))
      .sort((a, b) => {
        // Sort by priority (HIGH > MEDIUM > LOW)
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const aPriority = priorityOrder[a.priority || 'MEDIUM'];
        const bPriority = priorityOrder[b.priority || 'MEDIUM'];
        return bPriority - aPriority;
      });
  }

  private extractDecisions(signals: Signal[]) {
    return signals
      .filter(signal => signal.kind === 'DECISION')
      .map(signal => ({
        summary: signal.payload.summary,
        decidedBy: signal.payload.decidedBy,
        decisionDate: signal.payload.decisionDate
      }))
      .sort((a, b) => {
        // Sort by decision date if available
        if (a.decisionDate && b.decisionDate) {
          return new Date(b.decisionDate).getTime() - new Date(a.decisionDate).getTime();
        }
        return 0;
      });
  }

  private getLastUpdateNote(milestoneId: string, signals: Signal[]): string | undefined {
    const relevantSignals = signals
      .filter(signal => this.isSignalRelevantToMilestone(signal, { id: milestoneId } as Milestone))
      .sort((a, b) => b.createdAt - a.createdAt);

    if (relevantSignals.length === 0) return undefined;

    const latestSignal = relevantSignals[0];

    switch (latestSignal.kind) {
      case 'MILESTONE_UPDATE':
        return latestSignal.payload.mentionedText;
      case 'TODO':
        return `Action: ${latestSignal.payload.description}`;
      case 'RISK':
        return `Risk: ${latestSignal.payload.title}`;
      case 'DECISION':
        return `Decision: ${latestSignal.payload.summary}`;
      case 'BLOCKER':
        return `Blocker: ${latestSignal.payload.title}`;
      default:
        return latestSignal.payload.summary || 'Update received';
    }
  }

  formatAsMarkdown(report: SnapshotReport): string {
    const date = new Date(report.generatedAt).toLocaleString();

    let markdown = `# Project Status Report\n\n*Generated: ${date}*\n\n`;

    // Executive Summary
    markdown += `## Executive Summary\n\n`;
    markdown += `**Progress:** ${report.executiveSummary.progress}\n\n`;

    if (report.executiveSummary.risks.length > 0) {
      markdown += `**Risks & Issues:**\n`;
      for (const risk of report.executiveSummary.risks) {
        markdown += `- ${risk}\n`;
      }
      markdown += `\n`;
    }

    if (report.executiveSummary.upcomingDeadlines.length > 0) {
      markdown += `**Upcoming Deadlines:**\n`;
      for (const deadline of report.executiveSummary.upcomingDeadlines) {
        markdown += `- ${deadline.title} (${deadline.owner}) - Due: ${deadline.dueDate}\n`;
      }
      markdown += `\n`;
    }

    // Milestones
    markdown += `## Milestones\n\n`;
    markdown += `| ID | Title | Owner | Due Date | Status | Last Update |\n`;
    markdown += `|----|-------|-------|----------|--------|-------------|\n`;

    for (const milestone of report.milestones) {
      const lastUpdate = milestone.lastUpdateNote || '-';
      markdown += `| ${milestone.id} | ${milestone.title} | ${milestone.owner} | ${milestone.dueDate} | ${milestone.status} | ${lastUpdate} |\n`;
    }
    markdown += `\n`;

    // Action Items
    if (report.actionItems.length > 0) {
      markdown += `## Action Items\n\n`;

      const actionsByOwner = report.actionItems.reduce((acc, item) => {
        const owner = item.owner || 'Unassigned';
        if (!acc[owner]) acc[owner] = [];
        acc[owner].push(item);
        return acc;
      }, {} as Record<string, typeof report.actionItems>);

      for (const [owner, items] of Object.entries(actionsByOwner)) {
        markdown += `### ${owner}\n\n`;
        for (const item of items) {
          const priority = item.priority ? ` (${item.priority})` : '';
          const dueDate = item.dueDate ? ` - Due: ${item.dueDate}` : '';
          markdown += `- ${item.description}${priority}${dueDate}\n`;
        }
        markdown += `\n`;
      }
    }

    // Decisions
    if (report.decisions.length > 0) {
      markdown += `## Decisions\n\n`;
      for (const decision of report.decisions) {
        const decidedBy = decision.decidedBy ? ` (by ${decision.decidedBy})` : '';
        const decisionDate = decision.decisionDate ? ` - ${decision.decisionDate}` : '';
        markdown += `- ${decision.summary}${decidedBy}${decisionDate}\n`;
      }
      markdown += `\n`;
    }

    return markdown;
  }
}