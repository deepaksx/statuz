import { useEffect, useState } from 'react';
import { Target, Filter, Calendar, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import type { SignalKind } from '@statuz/shared';

export function Signals() {
  const {
    signals,
    loading,
    loadSignals
  } = useApp();

  const [selectedKind, setSelectedKind] = useState<SignalKind | ''>('');
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    loadSignals(selectedKind || undefined, undefined, limit);
  }, [selectedKind, limit]);

  const getSignalIcon = (kind: SignalKind) => {
    switch (kind) {
      case 'MILESTONE_UPDATE':
        return <Target className="h-4 w-4" />;
      case 'TODO':
        return <CheckCircle className="h-4 w-4" />;
      case 'RISK':
        return <AlertTriangle className="h-4 w-4" />;
      case 'DECISION':
        return <FileText className="h-4 w-4" />;
      case 'BLOCKER':
        return <Clock className="h-4 w-4" />;
      case 'INFO':
        return <FileText className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getSignalBadge = (kind: SignalKind) => {
    switch (kind) {
      case 'MILESTONE_UPDATE':
        return <span className="badge badge-primary">Milestone</span>;
      case 'TODO':
        return <span className="badge badge-success">Todo</span>;
      case 'RISK':
        return <span className="badge badge-error">Risk</span>;
      case 'DECISION':
        return <span className="badge badge-primary">Decision</span>;
      case 'BLOCKER':
        return <span className="badge badge-warning">Blocker</span>;
      case 'INFO':
        return <span className="badge badge-gray">Info</span>;
      default:
        return <span className="badge badge-gray">{kind}</span>;
    }
  };

  const renderSignalPayload = (signal: any) => {
    switch (signal.kind) {
      case 'MILESTONE_UPDATE':
        return (
          <div className="space-y-2">
            <div className="font-medium text-gray-900">
              {signal.payload.mentionedText}
            </div>
            {signal.payload.status && (
              <div className="text-sm text-gray-600">
                Status: <span className="font-medium">{signal.payload.status}</span>
              </div>
            )}
            {signal.payload.percentComplete && (
              <div className="text-sm text-gray-600">
                Progress: <span className="font-medium">{signal.payload.percentComplete}%</span>
              </div>
            )}
            {signal.payload.owner && (
              <div className="text-sm text-gray-600">
                Owner: <span className="font-medium">{signal.payload.owner}</span>
              </div>
            )}
            {signal.payload.dueDate && (
              <div className="text-sm text-gray-600">
                Due: <span className="font-medium">{signal.payload.dueDate}</span>
              </div>
            )}
            {signal.payload.blockingIssue && (
              <div className="text-sm text-error-600">
                Blocking Issue: {signal.payload.blockingIssue}
              </div>
            )}
          </div>
        );

      case 'TODO':
        return (
          <div className="space-y-2">
            <div className="font-medium text-gray-900">
              {signal.payload.description}
            </div>
            {signal.payload.owner && (
              <div className="text-sm text-gray-600">
                Owner: <span className="font-medium">{signal.payload.owner}</span>
              </div>
            )}
            {signal.payload.dueDate && (
              <div className="text-sm text-gray-600">
                Due: <span className="font-medium">{signal.payload.dueDate}</span>
              </div>
            )}
            {signal.payload.priority && (
              <div className="text-sm">
                Priority: <span className={clsx(
                  'font-medium',
                  signal.payload.priority === 'HIGH' && 'text-error-600',
                  signal.payload.priority === 'MEDIUM' && 'text-warning-600',
                  signal.payload.priority === 'LOW' && 'text-success-600'
                )}>{signal.payload.priority}</span>
              </div>
            )}
          </div>
        );

      case 'RISK':
        return (
          <div className="space-y-2">
            <div className="font-medium text-gray-900">
              {signal.payload.title}
            </div>
            {signal.payload.likelihood && (
              <div className="text-sm text-gray-600">
                Likelihood: <span className="font-medium">{signal.payload.likelihood}</span>
              </div>
            )}
            {signal.payload.impact && (
              <div className="text-sm text-gray-600">
                Impact: <span className="font-medium">{signal.payload.impact}</span>
              </div>
            )}
            {signal.payload.mitigation && (
              <div className="text-sm text-gray-600">
                Mitigation: {signal.payload.mitigation}
              </div>
            )}
          </div>
        );

      case 'DECISION':
        return (
          <div className="space-y-2">
            <div className="font-medium text-gray-900">
              {signal.payload.summary}
            </div>
            {signal.payload.decidedBy && (
              <div className="text-sm text-gray-600">
                Decided by: <span className="font-medium">{signal.payload.decidedBy}</span>
              </div>
            )}
            {signal.payload.decisionDate && (
              <div className="text-sm text-gray-600">
                Date: <span className="font-medium">{signal.payload.decisionDate}</span>
              </div>
            )}
          </div>
        );

      case 'BLOCKER':
        return (
          <div className="space-y-2">
            <div className="font-medium text-gray-900">
              {signal.payload.title}
            </div>
            <div className="text-sm text-gray-600">
              {signal.payload.description}
            </div>
            {signal.payload.owner && (
              <div className="text-sm text-gray-600">
                Owner: <span className="font-medium">{signal.payload.owner}</span>
              </div>
            )}
          </div>
        );

      case 'INFO':
        return (
          <div className="font-medium text-gray-900">
            {signal.payload.summary}
          </div>
        );

      default:
        return (
          <div className="font-medium text-gray-900">
            {JSON.stringify(signal.payload, null, 2)}
          </div>
        );
    }
  };

  const signalCounts = signals.reduce((acc, signal) => {
    acc[signal.kind] = (acc[signal.kind] || 0) + 1;
    return acc;
  }, {} as Record<SignalKind, number>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Signals</h1>
          <p className="text-gray-600">
            Project signals extracted from WhatsApp messages
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(signalCounts).map(([kind, count]) => (
          <div key={kind} className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 text-primary-600">
                {getSignalIcon(kind as SignalKind)}
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-500 capitalize">
                  {kind.toLowerCase().replace('_', ' ')}
                </div>
                <div className="text-xl font-bold text-gray-900">{count}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Signal Type
            </label>
            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value as SignalKind | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Types</option>
              <option value="MILESTONE_UPDATE">Milestone Updates</option>
              <option value="TODO">Todos</option>
              <option value="RISK">Risks</option>
              <option value="DECISION">Decisions</option>
              <option value="BLOCKER">Blockers</option>
              <option value="INFO">Info</option>
            </select>
          </div>

          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limit
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>
      </div>

      {/* Signals List */}
      <div className="card">
        {loading.signals ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600">Loading signals...</span>
          </div>
        ) : signals.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">
                {selectedKind ? `${selectedKind.replace('_', ' ')} Signals` : 'All Signals'}
              </h3>
              <span className="text-sm text-gray-500">
                {signals.length} signal{signals.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {signals.map((signal) => (
                <div key={signal.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="text-primary-600">
                        {getSignalIcon(signal.kind)}
                      </div>
                      {getSignalBadge(signal.kind)}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {renderSignalPayload(signal)}

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500 font-mono">
                      Message ID: {signal.messageId}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No signals found
            </h3>
            <p className="text-gray-500">
              Signals will appear here as messages are processed from watched groups.
              Make sure you have some groups in your watch list and project context configured.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}