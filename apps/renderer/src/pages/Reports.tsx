import { useState } from 'react';
import { FileText, Download, AlertTriangle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatDistanceToNow, format } from 'date-fns';

export function Reports() {
  const appContext = useApp();
  const [selectedTimeframe, setSelectedTimeframe] = useState('7'); // days
  const [reportFormat, setReportFormat] = useState<'summary' | 'detailed'>('summary');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);

  // Calculate report data
  const now = new Date();
  const timeframeDays = parseInt(selectedTimeframe);

  // Log available data for debugging
  console.log('Available data:', {
    groups: appContext.groups.length,
    messages: appContext.messages.length,
    milestones: appContext.milestones.length
  });

  // Mock data for display (will be replaced with live backend data later)
  const recentMessages = [];
  const blockers = [];
  const risks = [];

  const generateReport = async () => {
    setIsGenerating(true);

    // Simulate fetching live data (replace with actual API calls later)
    setTimeout(() => {
      const mockReport = {
        generatedAt: now.toISOString(),
        timeframe: `${timeframeDays} days`,
        summary: {
          watchedGroups: 3,
          totalMessages: 150,
          activeBlockers: 2,
          activeRisks: 5,
          milestoneUpdates: 7
        },
        details: {
          blockers: [
            { id: '1', title: 'API Integration Issue', description: 'Third-party service failing', createdAt: now.getTime() - 86400000 }
          ],
          risks: [
            { id: '1', title: 'Budget Overrun', impact: 'High', likelihood: 'Medium', createdAt: now.getTime() - 172800000 }
          ],
          todos: [
            { id: '1', description: 'Review security implementation', owner: 'Mike', priority: 'High', createdAt: now.getTime() - 259200000 }
          ],
          decisions: [
            { id: '1', summary: 'Using Redis for sessions', decidedBy: 'Team Lead', decisionDate: now.toISOString(), createdAt: now.getTime() - 345600000 }
          ],
          milestoneUpdates: [
            { id: '1', text: 'Payment integration 90% complete', status: 'In Progress', percentComplete: 90, createdAt: now.getTime() - 432000000 }
          ]
        },
        groups: [
          { id: 'group1', name: 'Development Team', messageCount: 75 },
          { id: 'group2', name: 'QA Team', messageCount: 45 },
          { id: 'group3', name: 'Management', messageCount: 30 }
        ],
        trends: {
          messagesPerDay: '21.4'
        }
      };

      setGeneratedReport(mockReport);
      setIsGenerating(false);
    }, 2000);
  };

  const exportReport = async (exportFormat: 'json' | 'markdown') => {
    console.log('=== EXPORT REPORT DEBUG ===');
    console.log('Export report called with format:', exportFormat);
    console.log('Generated report exists:', !!generatedReport);
    console.log('Generated report data:', generatedReport);

    if (!generatedReport) {
      console.log('No generated report available for export');
      alert('No report generated yet. Please generate a report first.');
      return;
    }

    let content = '';
    let filename = '';
    let mimeType = '';

    if (exportFormat === 'json') {
      content = JSON.stringify(generatedReport, null, 2);
      filename = `statuz-report-${format(now, 'yyyy-MM-dd-HHmm')}.json`;
      mimeType = 'application/json';
    } else {
      // Generate Markdown report
      content = `# Statuz Project Report

**Generated:** ${format(now, 'PPP p')}
**Timeframe:** ${generatedReport.timeframe}

## Executive Summary

| Metric | Count |
|--------|--------|
| Watched Groups | ${generatedReport.summary.watchedGroups} |
| Messages Analyzed | ${generatedReport.summary.totalMessages} |
| Active Blockers | ${generatedReport.summary.activeBlockers} |
| Active Risks | ${generatedReport.summary.activeRisks} |

## Key Insights

### 🔴 Active Blockers (${generatedReport.details.blockers.length})
${generatedReport.details.blockers.map((b: any) => `- **${b.title}**: ${b.description} _(${formatDistanceToNow(new Date(b.createdAt))} ago)_`).join('\n')}

### ⚠️ Active Risks (${generatedReport.details.risks.length})
${generatedReport.details.risks.map((r: any) => `- **${r.title}** (${r.impact} impact, ${r.likelihood} likelihood) _(${formatDistanceToNow(new Date(r.createdAt))} ago)_`).join('\n')}


### 🎯 Milestone Updates (${generatedReport.details.milestoneUpdates.length})
${generatedReport.details.milestoneUpdates.map((m: any) => `- ${m.text} - Status: ${m.status}${m.percentComplete ? ` (${m.percentComplete}%)` : ''} _(${formatDistanceToNow(new Date(m.createdAt))} ago)_`).join('\n')}

## Group Activity

${generatedReport.groups.map((g: any) => `### ${g.name}
- Messages: ${g.messageCount}`).join('\n\n')}

## Trends & Analytics

- **Messages per day:** ${generatedReport.trends.messagesPerDay}

---
*Generated by Statuz Project Monitor*
`;
      filename = `statuz-report-${format(now, 'yyyy-MM-dd-HHmm')}.md`;
      mimeType = 'text/markdown';
    }

    // Create and download file
    console.log('Creating download with:', { filename, mimeType, contentLength: content.length });
    console.log('Content preview:', content.substring(0, 200));

    try {
      console.log('Creating blob...');
      const blob = new Blob([content], { type: mimeType });
      console.log('Blob created:', blob);

      console.log('Creating object URL...');
      const url = URL.createObjectURL(blob);
      console.log('Object URL created:', url);

      console.log('Creating anchor element...');
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';

      console.log('Appending to document and clicking...');
      document.body.appendChild(a);
      a.click();

      console.log('Cleaning up...');
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      console.log('Download triggered successfully');
      alert(`Download started: ${filename}`);
    } catch (error) {
      console.error('Error during file download:', error);
      alert(`Error during download: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Reports</h1>
          <p className="text-gray-600">
            Generate comprehensive project status reports from messages and milestones
          </p>
        </div>
        <div className="flex space-x-3">
          {generatedReport ? (
            <>
              <button
                onClick={() => exportReport('json')}
                className="btn btn-secondary btn-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </button>
              <button
                onClick={() => exportReport('markdown')}
                className="btn btn-secondary btn-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Markdown
              </button>
            </>
          ) : (
            <span className="text-sm text-gray-500 py-2">
              Generate a report first to enable exports
            </span>
          )}
          <button
            onClick={generateReport}
            disabled={isGenerating}
            className="btn btn-primary btn-md"
          >
            <FileText className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Report Configuration */}
      <div className="card">
        <h3 className="font-medium text-gray-900 mb-4">Report Configuration</h3>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Period
            </label>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <select
              value={reportFormat}
              onChange={(e) => setReportFormat(e.target.value as 'summary' | 'detailed')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="summary">Executive Summary</option>
              <option value="detailed">Detailed Analysis</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{recentMessages.length}</div>
          <div className="text-sm text-gray-600">Messages</div>
          <div className="text-xs text-gray-500">Last {selectedTimeframe} days</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">{blockers.length}</div>
          <div className="text-sm text-gray-600">Active Blockers</div>
          <div className="text-xs text-gray-500">Require attention</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">{risks.length}</div>
          <div className="text-sm text-gray-600">Active Risks</div>
          <div className="text-xs text-gray-500">Monitor closely</div>
        </div>
      </div>


      {/* Generated Report */}
      {generatedReport && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Generated Report</h3>
            <span className="text-sm text-gray-500">
              Generated {formatDistanceToNow(new Date(generatedReport.generatedAt))} ago
            </span>
          </div>

          {/* Executive Summary */}
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Executive Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">{generatedReport.summary.totalMessages}</div>
                  <div className="text-sm text-blue-800">Messages Analyzed</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="text-xl font-bold text-red-600">{generatedReport.summary.activeBlockers}</div>
                  <div className="text-sm text-red-800">Active Blockers</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="text-xl font-bold text-yellow-600">{generatedReport.summary.activeRisks}</div>
                  <div className="text-sm text-yellow-800">Active Risks</div>
                </div>
              </div>
            </div>

            {/* Key Issues */}
            {reportFormat === 'detailed' && (
              <div className="space-y-4">
                {generatedReport.details.blockers.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-800 mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Active Blockers ({generatedReport.details.blockers.length})
                    </h4>
                    <div className="space-y-2">
                      {generatedReport.details.blockers.map((blocker: any) => (
                        <div key={blocker.id} className="bg-red-50 border-l-4 border-red-400 p-3">
                          <div className="font-medium text-red-800">{blocker.title}</div>
                          <div className="text-sm text-red-600">{blocker.description}</div>
                          <div className="text-xs text-red-500 mt-1">
                            {formatDistanceToNow(new Date(blocker.createdAt))} ago
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {generatedReport.details.risks.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Active Risks ({generatedReport.details.risks.length})
                    </h4>
                    <div className="space-y-2">
                      {generatedReport.details.risks.map((risk: any) => (
                        <div key={risk.id} className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                          <div className="font-medium text-yellow-800">{risk.title}</div>
                          <div className="text-sm text-yellow-600">
                            Impact: {risk.impact}, Likelihood: {risk.likelihood}
                          </div>
                          <div className="text-xs text-yellow-500 mt-1">
                            {formatDistanceToNow(new Date(risk.createdAt))} ago
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Trends */}
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Trends & Analytics</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-lg font-semibold text-gray-900">
                    {generatedReport.trends.messagesPerDay}
                  </div>
                  <div className="text-sm text-gray-600">Messages per day</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isGenerating && (
        <div className="card">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Generating comprehensive report...</span>
          </div>
        </div>
      )}
    </div>
  );
}