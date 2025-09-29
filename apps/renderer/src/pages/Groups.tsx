import { useEffect, useState } from 'react';
import { RefreshCw, Eye, EyeOff, Users, QrCode } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import clsx from 'clsx';

export function Groups() {
  const {
    groups,
    connectionState,
    loading,
    refreshGroups,
    updateGroupWatchStatus
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'watched' | 'unwatched'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Load groups immediately for browser mode
    refreshGroups();
  }, []);

  const filteredGroups = groups.filter(group => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'watched' && group.isWatched) ||
      (filter === 'unwatched' && !group.isWatched);

    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const watchedCount = groups.filter(g => g.isWatched).length;

  // In browser mode, show groups regardless of connection status
  const isBrowserMode = typeof window !== 'undefined' && !window.electronAPI;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-600">
            Manage which WhatsApp groups to monitor for project updates
          </p>
        </div>
        <button
          onClick={refreshGroups}
          disabled={loading.groups}
          className="btn btn-primary btn-md"
        >
          <RefreshCw className={clsx('h-4 w-4 mr-2', loading.groups && 'animate-spin')} />
          Refresh Groups
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Groups</div>
              <div className="text-2xl font-bold text-gray-900">{groups.length}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Eye className="h-8 w-8 text-success-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Watched</div>
              <div className="text-2xl font-bold text-gray-900">{watchedCount}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <EyeOff className="h-8 w-8 text-gray-400" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Unwatched</div>
              <div className="text-2xl font-bold text-gray-900">{groups.length - watchedCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                filter === 'all'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              All Groups
            </button>
            <button
              onClick={() => setFilter('watched')}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                filter === 'watched'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              Watched
            </button>
            <button
              onClick={() => setFilter('unwatched')}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                filter === 'unwatched'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              Unwatched
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Groups List */}
      <div className="card">
        <div className="space-y-4">
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{group.name}</h3>
                    <p className="text-sm text-gray-500 font-mono text-xs">{group.id}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {group.isWatched && (
                    <span className="badge badge-success">Watched</span>
                  )}

                  <button
                    onClick={() => updateGroupWatchStatus(group.id, !group.isWatched)}
                    className={clsx(
                      'btn btn-sm',
                      group.isWatched
                        ? 'btn-secondary'
                        : 'btn-primary'
                    )}
                  >
                    {group.isWatched ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-1" />
                        Unwatch
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        Watch
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No groups found' : 'No groups available'}
              </h3>
              <p className="text-gray-500">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Make sure you have joined some WhatsApp groups first'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="card border-primary-200 bg-primary-50">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Eye className="h-5 w-5 text-primary-600 mt-0.5" />
          </div>
          <div>
            <h4 className="font-medium text-primary-800">Privacy Notice</h4>
            <p className="text-sm text-primary-700 mt-1">
              Only groups you mark as "Watched" will be monitored for project updates.
              Message content is processed locally and never sent to external services
              unless you explicitly enable LLM processing in settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}