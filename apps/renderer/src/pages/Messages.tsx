import { useEffect, useState } from 'react';
import { MessageSquare, Filter, Calendar, User, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

export function Messages() {
  const {
    groups,
    messages,
    loading,
    loadMessages,
    config
  } = useApp();

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [showPrivacyMode, setShowPrivacyMode] = useState(true);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    if (config) {
      setShowPrivacyMode(config.privacyMode);
    }
  }, [config]);

  useEffect(() => {
    loadMessages(selectedGroupId || undefined, undefined, limit);
  }, [selectedGroupId, limit]);

  const watchedGroups = groups.filter(g => g.isWatched);
  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  const filteredMessages = selectedGroupId
    ? messages.filter(m => m.groupId === selectedGroupId)
    : messages;

  const maskAuthor = (author: string, authorName: string) => {
    if (!showPrivacyMode) return authorName || author;

    // Mask phone numbers and names for privacy
    const maskedPhone = author.replace(/\d/g, '*');
    const maskedName = authorName ? authorName.replace(/./g, '*') : 'User';
    return maskedName;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600">
            View messages from watched WhatsApp groups
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowPrivacyMode(!showPrivacyMode)}
            className={clsx(
              'btn btn-sm',
              showPrivacyMode ? 'btn-primary' : 'btn-secondary'
            )}
          >
            {showPrivacyMode ? (
              <>
                <Eye className="h-4 w-4 mr-1" />
                Privacy On
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 mr-1" />
                Privacy Off
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Filter
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Watched Groups</option>
              {watchedGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
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
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="card">
        {loading.messages ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600">Loading messages...</span>
          </div>
        ) : filteredMessages.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">
                {selectedGroup ? selectedGroup.name : 'All Watched Groups'}
              </h3>
              <span className="text-sm text-gray-500">
                {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredMessages.map((message) => {
                const group = groups.find(g => g.id === message.groupId);

                return (
                  <div key={message.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {maskAuthor(message.author, message.authorName)}
                        </span>
                        {group && !selectedGroup && (
                          <span className="badge badge-gray text-xs">
                            {group.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    <div className="text-gray-700 whitespace-pre-wrap">
                      {message.text}
                    </div>

                    {!showPrivacyMode && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500 font-mono">
                          ID: {message.id}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No messages found
            </h3>
            <p className="text-gray-500">
              {watchedGroups.length === 0 ? (
                <>
                  Start by adding some groups to your watch list in the{' '}
                  <span className="font-medium">Groups</span> section.
                </>
              ) : selectedGroup ? (
                `No messages from ${selectedGroup.name} yet.`
              ) : (
                'No messages from watched groups yet.'
              )}
            </p>
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      {showPrivacyMode && (
        <div className="card border-primary-200 bg-primary-50">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Eye className="h-5 w-5 text-primary-600 mt-0.5" />
            </div>
            <div>
              <h4 className="font-medium text-primary-800">Privacy Mode Active</h4>
              <p className="text-sm text-primary-700 mt-1">
                Author names and phone numbers are masked for privacy.
                Click "Privacy Off" to reveal actual names and IDs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}