import type { SnapshotReport, Milestone } from '@aipm/shared';
import type { StatuzDatabase } from '@aipm/db';

export class SnapshotGenerator {
  constructor(private db: StatuzDatabase) {}

  async generateSnapshot(since?: number): Promise<SnapshotReport> {
    const now = Date.now();
    // Since signals are removed, we don't need snapshot timing logic

    // Get current milestones
    const milestones = await this.db.getMilestones();

    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(milestones);

    // Empty action items and decisions (previously from signals)
    const actionItems: any[] = [];
    const decisions: any[] = [];


    // Update last snapshot time
    this.db.setLastSnapshotTime(now);

    const report: SnapshotReport = {
      generatedAt: now,
      executiveSummary,
      milestones: milestones.map(m => ({
        id: m.id,
        title: m.title,
        owner: m.owner,
        dueDate: m.dueDate,
        status: m.status,
        lastUpdateNote: undefined
      })),
      actionItems,
      decisions
    };

    this.db.auditLog('SNAPSHOT_GENERATED', `Snapshot generated with ${milestones.length} milestones`);

    return report;
  }




  private generateExecutiveSummary(milestones: Milestone[]) {
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.status === 'DONE').length;
    // Removed at-risk milestones logic as it was signal-dependent

    const progress = totalMilestones > 0
      ? `${completedMilestones}/${totalMilestones} milestones completed (${Math.round(completedMilestones / totalMilestones * 100)}%)`
      : 'No milestones defined';

    const risks: string[] = []; // No longer extracting from signals

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