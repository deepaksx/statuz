import { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Users,
  MessageSquare,
  Target
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { TestConnection } from '../components/TestConnection';
import type { SnapshotReport } from '@statuz/shared';
import { QRCodeSVG } from 'qrcode.react';

export function Dashboard() {
  const {
    milestones,
    stats,
    connectionState,
    loading,
    generateSnapshot,
    exportSnapshot,
    refreshStats
  } = useApp();

  const [latestReport, setLatestReport] = useState<SnapshotReport | null>(null);

  useEffect(() => {
    refreshStats();
  }, []);

  const handleGenerateSnapshot = async () => {
    const report = await generateSnapshot();
    if (report) {
      setLatestReport(report);
    }
  };

  const handleExportSnapshot = async (format: 'json' | 'markdown') => {
    if (!latestReport) {
      toast.error('No snapshot to export');
      return;
    }

    try {
      const content = await exportSnapshot(latestReport, format);
      if (content) {
        const extension = format === 'json' ? 'json' : 'md';
        const filename = `statuz-report-${new Date().toISOString().split('T')[0]}.${extension}`;

        const result = await window.electronAPI?.showSaveDialog({
          defaultPath: filename,
          filters: [
            { name: format.toUpperCase(), extensions: [extension] }
          ]
        });

        if (!result.canceled && result.filePath) {
          await window.electronAPI?.saveFile(result.filePath, content);
          if (true) {
            toast.success(`Report exported to ${result.filePath}`);
          } else {
            toast.error('Failed to save file');
          }
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE':
        return <span className="badge badge-success">Done</span>;
      case 'IN_PROGRESS':
        return <span className="badge badge-primary">In Progress</span>;
      case 'AT_RISK':
        return <span className="badge badge-warning">At Risk</span>;
      case 'BLOCKED':
        return <span className="badge badge-error">Blocked</span>;
      default:
        return <span className="badge badge-gray">Not Started</span>;
    }
  };

  const upcomingMilestones = milestones
    .filter(m => {
      const dueDate = new Date(m.dueDate);
      const daysToDue = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysToDue > 0 && daysToDue <= 14 && m.status !== 'DONE';
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const completedMilestones = milestones.filter(m => m.status === 'DONE').length;
  const totalMilestones = milestones.length;
  const completionRate = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Test Connection */}
      <TestConnection />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Project status overview and quick actions</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleGenerateSnapshot}
            disabled={loading.snapshot || connectionState.status !== 'CONNECTED'}
            className="btn btn-primary btn-md"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {loading.snapshot ? 'Generating...' : 'Generate Snapshot'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Watched Groups</div>
              <div className="text-2xl font-bold text-gray-900">{stats?.watchedGroups || 0}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MessageSquare className="h-8 w-8 text-success-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Messages</div>
              <div className="text-2xl font-bold text-gray-900">{stats?.totalMessages || 0}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Target className="h-8 w-8 text-warning-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Signals Extracted</div>
              <div className="text-2xl font-bold text-gray-900">{stats?.totalSignals || 0}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-success-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Completion Rate</div>
              <div className="text-2xl font-bold text-gray-900">{completionRate}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Milestones Overview */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Milestones Overview</h3>
            <span className="text-sm text-gray-500">{completedMilestones}/{totalMilestones} completed</span>
          </div>
          <div className="space-y-3">
            {milestones.slice(0, 5).map((milestone) => (
              <div key={milestone.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{milestone.title}</div>
                  <div className="text-sm text-gray-500">{milestone.owner}</div>
                </div>
                <div className="text-right">
                  {getStatusBadge(milestone.status)}
                  <div className="text-xs text-gray-500 mt-1">
                    Due: {new Date(milestone.dueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
            {milestones.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No milestones defined. Add them in the Context section.
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {upcomingMilestones.map((milestone) => {
              const dueDate = new Date(milestone.dueDate);
              const daysToDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isUrgent = daysToDue <= 3;

              return (
                <div key={milestone.id} className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 ${isUrgent ? 'text-error-600' : 'text-warning-600'}`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{milestone.title}</div>
                    <div className="text-sm text-gray-500">{milestone.owner}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${isUrgent ? 'text-error-600' : 'text-warning-600'}`}>
                      {daysToDue} day{daysToDue !== 1 ? 's' : ''}
                    </div>
                    <div className="text-xs text-gray-500">
                      {dueDate.toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
            {upcomingMilestones.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No upcoming deadlines in the next 14 days.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Latest Snapshot */}
      {latestReport && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Latest Snapshot</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => handleExportSnapshot('markdown')}
                className="btn btn-secondary btn-sm"
              >
                <Download className="h-4 w-4 mr-1" />
                Markdown
              </button>
              <button
                onClick={() => handleExportSnapshot('json')}
                className="btn btn-secondary btn-sm"
              >
                <Download className="h-4 w-4 mr-1" />
                JSON
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">Generated</div>
              <div className="font-medium">
                {formatDistanceToNow(new Date(latestReport.generatedAt), { addSuffix: true })}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Executive Summary</div>
              <div className="font-medium">{latestReport.executiveSummary.progress}</div>
              {latestReport.executiveSummary.risks.length > 0 && (
                <div className="mt-2">
                  <div className="text-sm text-error-600 font-medium">Risks Identified:</div>
                  <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                    {latestReport.executiveSummary.risks.map((risk, index) => (
                      <li key={index}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{latestReport.milestones.length}</div>
                <div className="text-sm text-gray-500">Milestones</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{latestReport.actionItems.length}</div>
                <div className="text-sm text-gray-500">Action Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{latestReport.decisions.length}</div>
                <div className="text-sm text-gray-500">Decisions</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Connection Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">WhatsApp Connection</h3>
          <div className="flex items-center space-x-2">
            {connectionState.status === 'CONNECTED' && (
              <div className="flex items-center text-success-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Connected</span>
              </div>
            )}
            {connectionState.status === 'CONNECTING' && (
              <div className="flex items-center text-primary-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                <span className="text-sm font-medium">Connecting...</span>
              </div>
            )}
            {connectionState.status === 'QR_REQUIRED' && (
              <div className="flex items-center text-warning-600">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Scan Required</span>
              </div>
            )}
            {connectionState.status === 'DISCONNECTED' && (
              <div className="flex items-center text-error-600">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Disconnected</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {connectionState.status === 'QR_REQUIRED' && connectionState.qrCode ? (
            <div className="flex flex-col items-center space-y-4 p-6 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900 mb-2">
                  📱 Scan QR Code with WhatsApp
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>1. Open WhatsApp on your phone</div>
                  <div>2. Go to Settings → Linked Devices</div>
                  <div>3. Tap "Link a Device"</div>
                  <div>4. Scan the QR code below</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border-2 border-primary-200">
                <QRCodeSVG value={connectionState.qrCode} size={280} level="M" />
              </div>
              <div className="text-xs text-gray-500 text-center max-w-md">
                QR code refreshes automatically. Keep this window open while scanning.
              </div>
            </div>
          ) : connectionState.status === 'CONNECTED' ? (
            <div className="p-6 bg-success-50 rounded-lg text-center">
              <CheckCircle className="h-12 w-12 text-success-600 mx-auto mb-3" />
              <div className="text-success-900 font-medium">WhatsApp Connected Successfully</div>
              <div className="text-sm text-success-700 mt-1">
                You can now monitor groups and generate reports
              </div>
            </div>
          ) : connectionState.status === 'CONNECTING' ? (
            <div className="p-6 bg-primary-50 rounded-lg text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-3"></div>
              <div className="text-primary-900 font-medium">Connecting to WhatsApp...</div>
              <div className="text-sm text-primary-700 mt-1">
                {connectionState.message || 'Please wait while we establish connection'}
              </div>
            </div>
          ) : (
            <div className="p-6 bg-gray-50 rounded-lg text-center">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <div className="text-gray-900 font-medium">WhatsApp Disconnected</div>
              <div className="text-sm text-gray-600 mt-1">
                {connectionState.message || 'Service will attempt to reconnect automatically'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}