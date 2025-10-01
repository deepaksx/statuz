import { useEffect, useState } from 'react';
import { MessageSquare, Calendar, User, Users, ChevronRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatDistanceToNow, format } from 'date-fns';

interface GroupMessages {
  messages: any[];
  totalMessages: number;
  currentPage: number;
  isLoading: boolean;
}

export function Messages() {
  const {
    groups
  } = useApp();

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [groupMessages, setGroupMessages] = useState<Record<string, GroupMessages>>({});
  const [searchTerm, setSearchTerm] = useState('');


  const watchedGroups = groups.filter(g => g.isWatched);
  const filteredGroups = watchedGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  // Load message previews for watched groups on mount
  useEffect(() => {
    if (watchedGroups.length > 0) {
      watchedGroups.forEach(async (group) => {
        try {
          const messagesResponse = await fetch(`http://localhost:3001/api/messages?groupId=${group.id}&limit=1&offset=0`);
          const messages = await messagesResponse.json();

          if (messages.length > 0) {
            setGroupMessages(prev => ({
              ...prev,
              [group.id]: {
                messages: messages,
                totalMessages: 0,
                currentPage: 0,
                isLoading: false
              }
            }));
          }
        } catch (error) {
          console.error(`Failed to load preview for group ${group.id}:`, error);
        }
      });
    }
  }, []); // Empty dependency array - only run once on mount

  const loadGroupMessages = async (groupId: string, page: number = 0) => {
    const limit = 10000;
    const offset = page * limit;

    setGroupMessages(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        isLoading: true,
        currentPage: page
      }
    }));

    try {
      const messagesResponse = await fetch(`http://localhost:3001/api/messages?groupId=${groupId}&limit=${limit}&offset=${offset}`);
      const messages = await messagesResponse.json();

      const countResponse = await fetch(`http://localhost:3001/api/messages/count?groupId=${groupId}`);
      const countData = await countResponse.json();
      const totalMessages = countData.count;

      setGroupMessages(prev => ({
        ...prev,
        [groupId]: {
          messages: page === 0 ? messages : [...(prev[groupId]?.messages || []), ...messages],
          totalMessages,
          currentPage: page,
          isLoading: false
        }
      }));
    } catch (error) {
      console.error('Failed to load group messages:', error);
      setGroupMessages(prev => ({
        ...prev,
        [groupId]: {
          ...prev[groupId],
          isLoading: false
        }
      }));
    }
  };

  const selectGroup = async (groupId: string) => {
    setSelectedGroupId(groupId);
    if (!groupMessages[groupId] || groupMessages[groupId].messages.length <= 1) {
      await loadGroupMessages(groupId);
    }
  };

  const loadMoreMessages = async (groupId: string) => {
    const messages = groupMessages[groupId];
    if (messages) {
      await loadGroupMessages(groupId, messages.currentPage + 1);
    }
  };

  const maskAuthor = (author: string, authorName: string) => {
    return authorName || author;
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    if (isToday) {
      return format(date, 'HH:mm');
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  const formatMessageDate = (timestamp: number) => {
    const date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);

    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return format(date, 'EEEE, MMMM dd, yyyy');
  };

  const groupMessagesByDate = (messages: any[]) => {
    const grouped: Record<string, any[]> = {};

    messages.forEach(message => {
      const timestamp = message.timestamp > 1000000000000 ? message.timestamp : message.timestamp * 1000;
      const date = new Date(timestamp);

      if (!isNaN(date.getTime())) {
        const dateKey = format(date, 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(message);
      }
    });

    return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
  };

  const goBackToGroups = () => {
    setSelectedGroupId('');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {selectedGroup && (
            <button
              onClick={goBackToGroups}
              className="btn btn-secondary btn-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedGroup ? selectedGroup.name : 'Messages'}
            </h1>
            <p className="text-gray-600">
              {selectedGroup
                ? 'Complete message history with timestamps'
                : 'View messages from watched WhatsApp groups'
              }
            </p>
          </div>
        </div>
      </div>

      {!selectedGroup ? (
        /* Groups List View */
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">Watched Groups</div>
                  <div className="text-2xl font-bold text-gray-900">{watchedGroups.length}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <MessageSquare className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">Total Messages</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Object.values(groupMessages).reduce((sum, gm) => sum + (gm.messages?.length || 0), 0)}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">Active Today</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {filteredGroups.filter(g => groupMessages[g.id]?.messages?.some(m =>
                      new Date(m.timestamp).toDateString() === new Date().toDateString()
                    )).length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="card">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search watched groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Watched Groups List */}
          <div className="card">
            {filteredGroups.length > 0 ? (
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900 mb-4">
                  Watched Groups ({filteredGroups.length})
                </h3>
                {filteredGroups.map((group) => {
                  const messages = groupMessages[group.id];
                  const latestMessage = messages?.messages?.[0];

                  return (
                    <div
                      key={group.id}
                      onClick={() => selectGroup(group.id)}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Users className="h-6 w-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900 truncate">{group.name}</h4>
                            <span className="badge badge-success">Watched</span>
                          </div>
                          {latestMessage ? (
                            <>
                              <p className="text-sm text-gray-600 truncate">
                                {maskAuthor(latestMessage.author, latestMessage.authorName)}: {latestMessage.text}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(latestMessage.timestamp > 1000000000000 ? latestMessage.timestamp : latestMessage.timestamp * 1000), { addSuffix: true })}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">Click to load messages</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {messages && (
                          <span className="text-sm font-medium text-gray-500">
                            {messages.messages.length} messages
                          </span>
                        )}
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : watchedGroups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No watched groups</h3>
                <p className="text-gray-500">
                  Add some groups to your watch list in the <span className="font-medium">Groups</span> section to see their messages here.
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No groups found</h3>
                <p className="text-gray-500">
                  Try adjusting your search terms to find the group you're looking for.
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Selected Group Messages View */
        <div className="card">
          {groupMessages[selectedGroupId]?.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading message history...</span>
            </div>
          ) : groupMessages[selectedGroupId]?.messages?.length > 0 ? (
            <div className="space-y-6">
              {/* Messages Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div>
                  <h3 className="font-medium text-gray-900">Message History</h3>
                  <p className="text-sm text-gray-500">
                    {groupMessages[selectedGroupId].messages.length} messages loaded
                  </p>
                </div>
                <button
                  onClick={() => loadGroupMessages(selectedGroupId, 0)}
                  className="btn btn-secondary btn-sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>
              </div>

              {/* Messages by Date */}
              <div className="space-y-6 max-h-[70vh] overflow-y-auto">
                {groupMessagesByDate(groupMessages[selectedGroupId].messages).map(([dateKey, dayMessages]) => (
                  <div key={dateKey}>
                    {/* Date Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 py-2 mb-4">
                      <h4 className="font-medium text-gray-800">
                        {formatMessageDate(dayMessages[0].timestamp)}
                      </h4>
                    </div>

                    {/* Messages for this date */}
                    <div className="space-y-3 pl-4">
                      {dayMessages.map((message) => (
                        <div key={message.id} className="flex items-start space-x-3">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-gray-500" />
                            </div>
                          </div>

                          {/* Message Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline space-x-2 mb-1">
                              <span className="font-medium text-gray-900 text-sm">
                                {maskAuthor(message.author, message.authorName)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatMessageTime(message.timestamp)}
                              </span>
                            </div>

                            <div className="text-gray-700 text-sm whitespace-pre-wrap">
                              {message.text}
                            </div>

                            <div className="mt-1">
                              <span className="text-xs text-gray-400 font-mono">
                                ID: {message.id}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Messages */}
              {groupMessages[selectedGroupId].messages.length < groupMessages[selectedGroupId].totalMessages && (
                <div className="pt-4 border-t border-gray-200 text-center">
                  <button
                    onClick={() => loadMoreMessages(selectedGroupId)}
                    disabled={groupMessages[selectedGroupId].isLoading}
                    className="btn btn-secondary btn-md"
                  >
                    {groupMessages[selectedGroupId].isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Load More Messages
                        ({groupMessages[selectedGroupId].messages.length} of {groupMessages[selectedGroupId].totalMessages})
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages found</h3>
              <p className="text-gray-500">
                This group doesn't have any message history yet.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}