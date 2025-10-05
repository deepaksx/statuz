import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Eye, EyeOff, Users, MessageSquare, ChevronDown, ChevronUp, Calendar, User, ArrowDown, Upload, FileText, Edit, Save, X, Info, BarChart3, TrendingUp, AlertTriangle, CheckCircle, Cpu, CheckSquare, Bot, Send, UserPlus, Plus, Copy, Check, Trash2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { format } from 'date-fns';
import clsx from 'clsx';
import { ChatHistoryUpload } from '../components/ChatHistoryUpload';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

interface GroupHistory {
  messages: any[];
  totalMessages: number;
  currentPage: number;
  isLoading: boolean;
}

export function Groups() {
  const {
    groups,
    loading,
    refreshGroups,
    updateGroupWatchStatus,
    getGroupContext,
    updateGroupContext,
    deleteGroupContext,
    generateGroupReport,
    getGroupMembers,
    getMessages,
    deleteGroupHistory,
    extractProjectData,
    config,
    chatWithAI,
    sendMessage,
    invoke
  } = useApp();

  const [searchParams] = useSearchParams();

  const [filter, setFilter] = useState<'all' | 'watched' | 'unwatched'>('watched');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupHistory, setGroupHistory] = useState<Record<string, GroupHistory>>({});
  const [showUploadModal, setShowUploadModal] = useState<{ groupId: string; groupName: string } | null>(null);
  const [, setHighlightedGroupId] = useState<string | null>(null);
  const [showContextModal, setShowContextModal] = useState<{ groupId: string; groupName: string; currentContext?: string } | null>(null);
  const [contextText, setContextText] = useState('');
  const [showReportModal, setShowReportModal] = useState<{ groupId: string; groupName: string } | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showChatModal, setShowChatModal] = useState<{ groupId: string; groupName: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ type: 'user' | 'ai'; content: string; timestamp: number }>>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showMembersModal, setShowMembersModal] = useState<{ groupId: string; groupName: string } | null>(null);
  const [groupMembers, setGroupMembers] = useState<Array<{ author: string; authorName: string; messageCount: number; lastSeen: number; role?: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupId, setNewGroupId] = useState('');
  const [showSendMessageModal, setShowSendMessageModal] = useState<{ groupId: string; groupName: string } | null>(null);
  const [messageToSend, setMessageToSend] = useState('');
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);

  // Handle group highlighting from URL parameters
  useEffect(() => {
    const highlightParam = searchParams.get('highlight');
    if (highlightParam) {
      setHighlightedGroupId(highlightParam);
      // Clear highlight after 3 seconds
      setTimeout(() => setHighlightedGroupId(null), 3000);
    }
  }, [searchParams]);

  useEffect(() => {
    // Load groups immediately for browser mode
    refreshGroups();
  }, []);

  // Initialize API key only once on mount
  useEffect(() => {
    const savedGeminiApiKey = localStorage.getItem('statuz_geminiApiKey') || config?.geminiApiKey || '';
    if (savedGeminiApiKey) {
      console.log('Groups - Loading API key from localStorage/config');
      setGeminiApiKey(savedGeminiApiKey);
    }
  }, []); // Only run once on mount


  const filteredGroups = groups.filter(group => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'watched' && group.isWatched) ||
      (filter === 'unwatched' && !group.isWatched);

    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const watchedCount = groups.filter(g => g.isWatched).length;

  const formatMessageTimestamp = (timestamp: number) => {
    const date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return format(date, 'MMM dd, yyyy HH:mm:ss');
  };

  const loadGroupHistory = async (groupId: string, page: number = 0) => {
    const limit = 10000;

    // Set loading state
    setGroupHistory(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        isLoading: true,
        currentPage: page
      }
    }));

    try {
      // Use IPC to fetch messages from Electron backend
      console.log(`Loading group history for ${groupId}, page ${page}, limit ${limit}`);
      const messages = await getMessages(groupId, undefined, limit);
      console.log(`Loaded ${messages?.length || 0} messages for group ${groupId}`);

      // Estimate total messages (we can improve this later)
      const totalMessages = messages?.length || 0;

      setGroupHistory(prev => ({
        ...prev,
        [groupId]: {
          messages: messages || [],
          totalMessages,
          currentPage: page,
          isLoading: false
        }
      }));
    } catch (error) {
      console.error('Failed to load group history:', error);
      setGroupHistory(prev => ({
        ...prev,
        [groupId]: {
          ...prev[groupId],
          isLoading: false
        }
      }));
    }
  };


  const toggleGroupExpansion = async (groupId: string) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null);
    } else {
      setExpandedGroup(groupId);
      if (!groupHistory[groupId]) {
        await loadGroupHistory(groupId);
      }
    }
  };

  const loadMoreMessages = async (groupId: string) => {
    const history = groupHistory[groupId];
    if (history) {
      await loadGroupHistory(groupId, history.currentPage + 1);
    }
  };

  const handleUploadSuccess = async () => {
    console.log('Upload success callback triggered');
    // Don't refresh from WhatsApp, just reload from database
    try {
      // Wait a moment for database to update
      await new Promise(resolve => setTimeout(resolve, 500));
      // Force refresh from database
      await refreshGroups();
      console.log('Groups refreshed after upload');
    } catch (error) {
      console.error('Failed to refresh groups after upload:', error);
    }
    // Refresh current group history if expanded
    if (expandedGroup && showUploadModal?.groupId === expandedGroup) {
      loadGroupHistory(expandedGroup, 0);
    }
    setShowUploadModal(null);
  };

  const handleDeleteHistory = async (groupId: string, groupName: string) => {
    const confirmMessage = `⚠️ WARNING: This will delete ALL data for "${groupName}":\n\n` +
      `• All messages\n` +
      `• All projects\n` +
      `• All tasks (including Epic/Story/Task/Subtask)\n` +
      `• All risks\n` +
      `• All decisions\n` +
      `• All dependencies\n\n` +
      `This action CANNOT be undone!\n\n` +
      `You can re-upload chat history to extract everything fresh.\n\n` +
      `Continue with deletion?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      toast.loading('Deleting all group data...', { duration: Infinity });
      const result = await deleteGroupHistory(groupId);
      toast.dismiss();

      // Show detailed deletion summary
      const summary = `✅ Successfully deleted all data:\n` +
        `📧 Messages: ${result.deletedMessages}\n` +
        `📁 Projects: ${result.deletedProjects}\n` +
        `✅ Tasks: ${result.deletedTasks}\n` +
        `⚠️ Risks: ${result.deletedRisks}\n` +
        `🎯 Decisions: ${result.deletedDecisions}\n` +
        `🔗 Dependencies: ${result.deletedDependencies}\n` +
        `\n🗑️ Total: ${result.totalDeleted} items deleted`;

      toast.success(summary, { duration: 5000 });

      if (expandedGroup === groupId) {
        setExpandedGroup(null);
        setGroupHistory(prev => {
          const newHistory = { ...prev };
          delete newHistory[groupId];
          return newHistory;
        });
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to delete group data');
      console.error('Delete history error:', error);
    }
  };

  const handleExtractProjectData = async (groupId: string, groupName: string) => {
    const confirmMessage = `Extract project data for "${groupName}"?\n\n` +
      `This will analyze all uploaded messages and create:\n` +
      `• Stories (User Stories)\n` +
      `• Tasks and Subtasks\n` +
      `• Risks\n` +
      `• Decisions\n\n` +
      `This may take a minute depending on the amount of data.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      toast.loading('Analyzing messages and extracting project data...', { duration: Infinity });
      const result = await extractProjectData(groupId);
      toast.dismiss();

      // Show extraction summary
      const summary = `✅ Project data extracted successfully:\n` +
        `📖 Stories: ${result.storiesCreated}\n` +
        `✅ Tasks: ${result.tasksCreated}\n` +
        `⚠️ Risks: ${result.risksCreated}\n` +
        `🎯 Decisions: ${result.decisionsCreated}`;

      toast.success(summary, { duration: 5000 });
    } catch (error) {
      toast.dismiss();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to extract project data: ${errorMessage}`);
      console.error('Extract project data error:', error);
    }
  };

  const maskAuthor = (author: string, authorName: string) => {
    return authorName || author;
  };

  const handleEditContext = async (groupId: string, groupName: string) => {
    try {
      const contextData = await getGroupContext(groupId);
      setContextText(contextData.context || '');
      setShowContextModal({ groupId, groupName, currentContext: contextData.context || '' });
    } catch (error) {
      console.error('Failed to load group context:', error);
      setContextText('');
      setShowContextModal({ groupId, groupName, currentContext: '' });
    }
  };

  const handleSaveContext = async () => {
    if (!showContextModal) return;

    try {
      await updateGroupContext(showContextModal.groupId, contextText);
      setShowContextModal(null);
      setContextText('');
    } catch (error) {
      console.error('Failed to save context:', error);
    }
  };

  const handleDeleteContext = async () => {
    if (!showContextModal) return;

    const confirmed = confirm('Are you sure you want to delete the context for this group?');
    if (confirmed) {
      try {
        await deleteGroupContext(showContextModal.groupId);
        setShowContextModal(null);
        setContextText('');
      } catch (error) {
        console.error('Failed to delete context:', error);
      }
    }
  };

  const handleGenerateReport = async (groupId: string, groupName: string) => {
    setShowReportModal({ groupId, groupName });
    setGeneratingReport(true);
    setReportData(null);

    try {
      const result = await generateGroupReport(groupId, 30); // 30 days
      setReportData(result);
    } catch (error) {
      console.error('Failed to generate report:', error);
      setReportData({
        error: 'Failed to generate report. Please try again.'
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleOpenAiChat = (groupId: string, groupName: string) => {
    setShowChatModal({ groupId, groupName });
    setChatMessages([]);
    setCurrentQuestion('');
    // Get Gemini API key from localStorage first, then fallback to config
    const savedGeminiApiKey = localStorage.getItem('statuz_geminiApiKey') || config?.geminiApiKey || '';
    console.log('AI Chat - Loading API key:');
    console.log('localStorage geminiApiKey:', localStorage.getItem('statuz_geminiApiKey'));
    console.log('config geminiApiKey:', config?.geminiApiKey);
    console.log('Final savedGeminiApiKey:', savedGeminiApiKey);
    setGeminiApiKey(savedGeminiApiKey);
  };

  const handleToggleAutoResponse = async (groupId: string, currentlyEnabled: boolean) => {
    try {
      const newStatus = !currentlyEnabled;
      await invoke('update-group-auto-response', { groupId, enabled: newStatus, trigger: 'NXSYS_AI' });
      toast.success(newStatus ? 'Auto-response enabled' : 'Auto-response disabled');
    } catch (error) {
      console.error('Failed to toggle auto-response:', error);
      toast.error('Failed to update auto-response');
    }
  };

  const handleSendQuestion = async () => {
    if (!currentQuestion.trim() || !showChatModal) return;

    console.log('AI Chat - Sending question with API key:', geminiApiKey ? 'API key present' : 'No API key');

    const userMessage = {
      type: 'user' as const,
      content: currentQuestion,
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentQuestion('');
    setIsAiResponding(true);

    try {
      console.log('AI Chat - Calling chatWithAI for group:', showChatModal.groupId);
      const result = await chatWithAI(showChatModal.groupId, userMessage.content, geminiApiKey);

      const aiMessage = {
        type: 'ai' as const,
        content: result.answer,
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send question:', error);
      const errorText = error instanceof Error ? error.message : String(error);
      const errorMessage = {
        type: 'ai' as const,
        content: `Error: ${errorText}`,
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAiResponding(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
    }
  };

  const handleOpenGroupMembers = async (groupId: string, groupName: string) => {
    setShowMembersModal({ groupId, groupName });
    setLoadingMembers(true);
    setGroupMembers([]);

    try {
      // Fetch group members from Electron backend
      const members = await getGroupMembers(groupId);

      // Try to load existing roles from group context
      try {
        const contextData = await getGroupContext(groupId);
        if (contextData.context) {
          console.log('Loading existing context:', contextData.context);
          const context = contextData.context;

          // Look for the ## Team Roles section
          const rolesSectionMatch = context.match(/## Team Roles\n(.*?)(?=\n##|$)/s);
          if (rolesSectionMatch) {
            const rolesText = rolesSectionMatch[1].trim();
            console.log('Found roles section:', rolesText);

            // Parse each line in the format "Name: Role"
            const roleLines = rolesText.split('\n');
            roleLines.forEach(line => {
              const roleMatch = line.match(/^(.+?):\s*(.+)$/);
              if (roleMatch) {
                const [, memberName, memberRole] = roleMatch;
                console.log(`Found role: ${memberName.trim()} -> ${memberRole.trim()}`);

                // Find the member and assign the role
                const member = members.find(m =>
                  m.authorName.trim() === memberName.trim() ||
                  m.author.trim() === memberName.trim()
                );
                if (member) {
                  member.role = memberRole.trim();
                  console.log(`Assigned role ${memberRole.trim()} to ${member.authorName}`);
                } else {
                  console.log(`Could not find member for: ${memberName.trim()}`);
                }
              }
            });
          } else {
            console.log('No ## Team Roles section found in context');
          }
        }
      } catch (error) {
        console.log('No existing context found, starting fresh:', error);
      }

      setGroupMembers(members);
    } catch (error) {
      console.error('Failed to load group members:', error);
      setGroupMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSaveMemberRoles = async () => {
    if (!showMembersModal) return;

    try {
      console.log('Saving member roles for group:', showMembersModal.groupId);
      console.log('Group members:', groupMembers);

      // Create role assignments text to append to group context
      const roleAssignments = groupMembers
        .filter(member => member.role && member.role.trim())
        .map(member => `${member.authorName}: ${member.role}`)
        .join('\n');

      console.log('Role assignments:', roleAssignments);

      if (roleAssignments) {
        // Get existing context
        let existingContext = '';
        try {
          const contextData = await getGroupContext(showMembersModal.groupId);
          existingContext = contextData.context || '';
          console.log('Existing context:', existingContext);
        } catch (error) {
          console.log('No existing context, creating new one');
        }

        // Remove existing ## Team Roles section if it exists
        const rolesSectionRegex = /## Team Roles\n[^#]*/g;
        const contextWithoutRoles = existingContext.replace(rolesSectionRegex, '').trim();

        // Update context with role assignments
        const updatedContext = contextWithoutRoles +
          (contextWithoutRoles ? '\n\n' : '') +
          '## Team Roles\n' + roleAssignments;

        console.log('Updated context:', updatedContext);
        await updateGroupContext(showMembersModal.groupId, updatedContext);
        console.log('Context saved successfully');
        toast.success(`Saved roles for ${roleAssignments.split('\n').length} team members`);
      } else {
        console.log('No roles to save');
        toast.error('No roles to save. Please assign roles to team members first.');
      }

      setShowMembersModal(null);
      setGroupMembers([]);
    } catch (error) {
      console.error('Failed to save member roles:', error);
      toast.error('Failed to save member roles. Please try again.');
    }
  };

  const handleMemberRoleChange = (memberIndex: number, newRole: string) => {
    setGroupMembers(prev => prev.map((member, index) =>
      index === memberIndex ? { ...member, role: newRole } : member
    ));
  };

  const handleAddGroup = async () => {
    if (!newGroupName.trim() || !newGroupId.trim()) {
      toast.error('Please enter both group name and ID');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newGroupId.trim(),
          name: newGroupName.trim(),
          isWatched: true
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Group added successfully!');
        setShowAddGroupModal(false);
        setNewGroupName('');
        setNewGroupId('');
        refreshGroups();
      } else {
        toast.error(result.error || 'Failed to add group');
      }
    } catch (error) {
      console.error('Failed to add group:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const handleSendMessageClick = () => {
    if (!messageToSend.trim()) {
      toast.error('Please enter a message');
      return;
    }
    setShowConfirmSend(true);
  };

  const handleConfirmSendMessage = async () => {
    if (!showSendMessageModal) return;

    setSendingMessage(true);
    setShowConfirmSend(false);

    try {
      await sendMessage(showSendMessageModal.groupId, messageToSend);
      setShowSendMessageModal(null);
      setMessageToSend('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCancelSend = () => {
    setShowConfirmSend(false);
  };

  const handleCopyMessage = async (messageContent: string, messageIndex: number) => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopiedMessageIndex(messageIndex);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-600">
            Manage WhatsApp groups and view their complete message history
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddGroupModal(true)}
            className="btn btn-secondary btn-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Group
          </button>
          <button
            onClick={refreshGroups}
            disabled={loading.groups}
            className="btn btn-primary btn-md"
          >
            <RefreshCw className={clsx('h-4 w-4 mr-2', loading.groups && 'animate-spin')} />
            Refresh Groups
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
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
              <Eye className="h-8 w-8 text-green-600" />
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
                  ? 'bg-blue-100 text-blue-700'
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
                  ? 'bg-blue-100 text-blue-700'
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
                  ? 'bg-blue-100 text-blue-700'
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Groups List with History */}
      <div className="space-y-4">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => {
            const history = groupHistory[group.id];
            const isExpanded = expandedGroup === group.id;

            return (
              <div key={group.id} className="card">
                {/* Group Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleGroupExpansion(group.id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{group.name}</h3>
                        <div className="flex items-center space-x-2">
                          {group.isWatched && (
                            <span className="badge badge-success">Watched</span>
                          )}
                          {group.hasHistoryUploaded && (
                            <span className="badge badge-info" title="Chat history uploaded">
                              <FileText className="h-3 w-3 mr-1" />
                              History
                            </span>
                          )}
                          {group.context && (
                            <span className="badge badge-primary" title="Group context available">
                              <Info className="h-3 w-3 mr-1" />
                              Context
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 font-mono text-xs">{group.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {history && history.messages && history.messages.length > 0 && (
                      <span className="text-sm text-gray-500">
                        {history.messages.length} messages
                      </span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUploadModal({ groupId: group.id, groupName: group.name });
                      }}
                      className="btn btn-sm btn-secondary"
                      title="Upload chat history"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Upload History
                    </button>

                    {group.hasHistoryUploaded && group.isWatched && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExtractProjectData(group.id, group.name);
                        }}
                        className="btn btn-sm btn-primary"
                        title="Extract project data using AI"
                      >
                        <Cpu className="h-4 w-4 mr-1" />
                        Extract
                      </button>
                    )}

                    {group.hasHistoryUploaded && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistory(group.id, group.name);
                        }}
                        className="btn btn-sm btn-error"
                        title="Delete chat history"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete History
                      </button>
                    )}

                    {group.isWatched && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditContext(group.id, group.name);
                        }}
                        className="btn btn-sm btn-secondary"
                        title="Edit group context"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Context
                      </button>
                    )}

                    {group.isWatched && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenGroupMembers(group.id, group.name);
                        }}
                        className="btn btn-sm btn-secondary"
                        title="Manage group members and assign roles"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Members
                      </button>
                    )}

                    {group.isWatched && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateReport(group.id, group.name);
                        }}
                        className="btn btn-sm btn-secondary"
                        title="Generate AI-powered project status report"
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Report
                      </button>
                    )}

                    {group.isWatched && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAiChat(group.id, group.name);
                        }}
                        className="btn btn-sm btn-primary"
                        title="Chat with AI about this project"
                      >
                        <Bot className="h-4 w-4 mr-1" />
                        AI Chat
                      </button>
                    )}

                    {group.isWatched && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAutoResponse(group.id, group.autoResponseEnabled || false);
                        }}
                        className={clsx(
                          'btn btn-sm',
                          group.autoResponseEnabled ? 'btn-success' : 'btn-secondary'
                        )}
                        title={group.autoResponseEnabled ? 'Auto-response enabled' : 'Enable auto-response'}
                      >
                        <Cpu className="h-4 w-4 mr-1" />
                        Auto-AI
                      </button>
                    )}

                    {group.isWatched && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSendMessageModal({ groupId: group.id, groupName: group.name });
                        }}
                        className="btn btn-sm btn-success"
                        title="Send message to this group"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Send Message
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateGroupWatchStatus(group.id, !group.isWatched);
                      }}
                      className={clsx(
                        'btn btn-sm',
                        group.isWatched ? 'btn-secondary' : 'btn-primary'
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

                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded History */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {history?.isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading message history...</span>
                      </div>
                    ) : history?.messages?.length > 0 ? (
                      <div className="p-4 space-y-4">

                        {/* Message History */}
                        <div>
                          <h4 className="font-medium text-gray-800 mb-3">Message History</h4>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {history.messages.map((message) => (
                              <div key={message.id} className="border border-gray-200 rounded-lg p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <User className="h-4 w-4 text-gray-400" />
                                    <span className="font-medium text-gray-900">
                                      {maskAuthor(message.author, message.authorName)}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {formatMessageTimestamp(message.timestamp)}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-gray-700 whitespace-pre-wrap text-sm">
                                  {message.text}
                                </div>

                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  <div className="text-xs text-gray-500 font-mono">
                                    ID: {message.id}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Load More Button */}
                          {history.messages.length < history.totalMessages && (
                            <div className="mt-4 text-center">
                              <button
                                onClick={() => loadMoreMessages(group.id)}
                                disabled={history.isLoading}
                                className="btn btn-secondary btn-sm"
                              >
                                {history.isLoading ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Loading...
                                  </>
                                ) : (
                                  <>
                                    <ArrowDown className="h-4 w-4 mr-2" />
                                    Load More Messages ({history.messages.length} of {history.totalMessages})
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
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
          })
        ) : (
          <div className="card">
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
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="card border-blue-200 bg-blue-50">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
          </div>
          <div>
            <h4 className="font-medium text-blue-800">Privacy & History</h4>
            <p className="text-sm text-blue-700 mt-1">
              Click on any group to view its complete message history. Only watched groups will be monitored for project activity.
              Message content is processed locally and never sent to external services unless you explicitly enable LLM processing.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <ChatHistoryUpload
          groupId={showUploadModal.groupId}
          groupName={showUploadModal.groupName}
          onUploadSuccess={handleUploadSuccess}
          onClose={() => setShowUploadModal(null)}
        />
      )}

      {/* Context Edit Modal */}
      {showContextModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Edit Group Context</h3>
                <p className="text-sm text-gray-600 mt-1">{showContextModal.groupName}</p>
              </div>
              <button
                onClick={() => setShowContextModal(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-2">
                    Group Context
                  </label>
                  <textarea
                    id="context"
                    value={contextText}
                    onChange={(e) => setContextText(e.target.value)}
                    placeholder="Enter context for this group (up to 10 pages, ~50,000 characters)..."
                    className="w-full h-80 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    maxLength={50000}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      This context will help you understand the purpose and background of this group.
                    </p>
                    <span className="text-xs text-gray-500">
                      {contextText.length} / 50,000 characters
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div>
                {showContextModal.currentContext && (
                  <button
                    onClick={handleDeleteContext}
                    className="btn btn-sm btn-error"
                  >
                    Delete Context
                  </button>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowContextModal(null)}
                  className="btn btn-sm btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveContext}
                  className="btn btn-sm btn-primary"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save Context
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Project Status Report</h3>
                <p className="text-sm text-gray-600 mt-1">{showReportModal.groupName}</p>
              </div>
              <button
                onClick={() => {
                  setShowReportModal(null);
                  setReportData(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {generatingReport ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Generating Report</h4>
                    <p className="text-gray-600">
                      AI is analyzing group context and message history to generate your project status report...
                    </p>
                  </div>
                </div>
              ) : reportData?.error ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Report Generation Failed</h4>
                    <p className="text-gray-600 mb-4">{reportData.error}</p>
                    <button
                      onClick={() => handleGenerateReport(showReportModal.groupId, showReportModal.groupName)}
                      className="btn btn-primary btn-sm"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : reportData?.report ? (
                <div className="space-y-6">
                  {/* Executive Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <TrendingUp className="h-6 w-6 text-blue-600" />
                      <h4 className="text-lg font-semibold text-blue-900">Project Status Analysis</h4>
                    </div>
                    <div className="text-blue-800 leading-relaxed whitespace-pre-line text-sm">
                      {reportData.report.executiveSummary}
                    </div>
                  </div>

                  {/* Team Activity Breakdown - WHO IS DOING WHAT */}
                  {reportData.report.teamActivityBreakdown && (
                    <div className="card">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Users className="h-5 w-5 text-blue-600 mr-2" />
                        {reportData.report.teamActivityBreakdown.title}
                      </h4>

                      {reportData.report.teamActivityBreakdown.individuals && reportData.report.teamActivityBreakdown.individuals.length > 0 ? (
                        <div className="space-y-4">
                          {reportData.report.teamActivityBreakdown.individuals.map((person: any, index: number) => (
                            <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-gray-900">{person.name}</span>
                                <span className="text-xs text-gray-500">{person.recentActivity}</span>
                              </div>
                              <div className="text-sm text-gray-600 mb-2">Last seen: {person.lastSeen}</div>

                              {person.currentWork && person.currentWork.length > 0 && (
                                <div className="mb-2">
                                  <div className="text-sm font-medium text-gray-700 mb-1">Recent Work:</div>
                                  {person.currentWork.map((work: string, workIndex: number) => (
                                    <div key={workIndex} className="text-sm text-gray-600 ml-2">• {work}</div>
                                  ))}
                                </div>
                              )}

                              {person.keyContributions && person.keyContributions.length > 0 && (
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-1">Key Contributions:</div>
                                  {person.keyContributions.map((contribution: string, contribIndex: number) => (
                                    <div key={contribIndex} className="text-sm text-gray-600 ml-2">• {contribution}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm">No team activity data available</div>
                      )}
                    </div>
                  )}

                  {/* Project Progress - WHERE WE ARE ON TASKS & TARGETS */}
                  {reportData.report.projectProgress && (
                    <div className="card">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        {reportData.report.projectProgress.title}
                      </h4>

                      {reportData.report.projectProgress.progressSummary && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                          <div className="text-sm text-gray-700">{reportData.report.projectProgress.progressSummary}</div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Active Tasks */}
                        {reportData.report.projectProgress.activeTasks && reportData.report.projectProgress.activeTasks.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">Active Tasks ({reportData.report.projectProgress.activeTasks.length})</h5>
                            <div className="space-y-2">
                              {reportData.report.projectProgress.activeTasks.slice(0, 5).map((task: any, index: number) => (
                                <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                  <div className="font-medium text-sm text-yellow-900">{task.assignee}</div>
                                  <div className="text-sm text-yellow-800 mt-1">{task.task}</div>
                                  <div className="text-xs text-yellow-600 mt-1">Last update: {task.lastUpdate}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Completed Tasks */}
                        {reportData.report.projectProgress.completedTasks && reportData.report.projectProgress.completedTasks.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">Completed Tasks ({reportData.report.projectProgress.completedTasks.length})</h5>
                            <div className="space-y-2">
                              {reportData.report.projectProgress.completedTasks.slice(0, 5).map((task: any, index: number) => (
                                <div key={index} className="bg-green-50 border border-green-200 rounded p-3">
                                  <div className="font-medium text-sm text-green-900">{task.completedBy}</div>
                                  <div className="text-sm text-green-800 mt-1">{task.task}</div>
                                  <div className="text-xs text-green-600 mt-1">Completed: {task.date}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Blockers */}
                        {reportData.report.projectProgress.blockers && reportData.report.projectProgress.blockers.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">Current Blockers ({reportData.report.projectProgress.blockers.length})</h5>
                            <div className="space-y-2">
                              {reportData.report.projectProgress.blockers.slice(0, 5).map((blocker: any, index: number) => (
                                <div key={index} className="bg-red-50 border border-red-200 rounded p-3">
                                  <div className="font-medium text-sm text-red-900">{blocker.reportedBy}</div>
                                  <div className="text-sm text-red-800 mt-1">{blocker.issue}</div>
                                  <div className="text-xs text-red-600 mt-1">Reported: {blocker.date}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Upcoming Deadlines */}
                        {reportData.report.projectProgress.upcomingDeadlines && reportData.report.projectProgress.upcomingDeadlines.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">Upcoming Deadlines ({reportData.report.projectProgress.upcomingDeadlines.length})</h5>
                            <div className="space-y-2">
                              {reportData.report.projectProgress.upcomingDeadlines.slice(0, 5).map((deadline: any, index: number) => (
                                <div key={index} className="bg-orange-50 border border-orange-200 rounded p-3">
                                  <div className="font-medium text-sm text-orange-900">{deadline.owner}</div>
                                  <div className="text-sm text-orange-800 mt-1">{deadline.deadline}</div>
                                  <div className="text-xs text-orange-600 mt-1">Mentioned: {deadline.mentioned}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Technical Work */}
                  {reportData.report.technicalWork && (
                    <div className="card">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Cpu className="h-5 w-5 text-purple-600 mr-2" />
                        {reportData.report.technicalWork.title}
                      </h4>

                      {reportData.report.technicalWork.technicalSummary && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                          <div className="text-sm text-gray-700">{reportData.report.technicalWork.technicalSummary}</div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Recent Technical Work */}
                        {reportData.report.technicalWork.recentWork && reportData.report.technicalWork.recentWork.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">Recent Technical Work</h5>
                            <div className="space-y-2">
                              {reportData.report.technicalWork.recentWork.slice(0, 5).map((work: any, index: number) => (
                                <div key={index} className="bg-purple-50 border border-purple-200 rounded p-3">
                                  <div className="font-medium text-sm text-purple-900">{work.engineer}</div>
                                  <div className="text-sm text-purple-800 mt-1">{work.work}</div>
                                  <div className="text-xs text-purple-600 mt-1">{work.date}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* System Updates */}
                        {reportData.report.technicalWork.systemUpdates && reportData.report.technicalWork.systemUpdates.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">System Updates</h5>
                            <div className="space-y-2">
                              {reportData.report.technicalWork.systemUpdates.slice(0, 5).map((update: any, index: number) => (
                                <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3">
                                  <div className="font-medium text-sm text-blue-900">{update.implementedBy}</div>
                                  <div className="text-sm text-blue-800 mt-1">{update.update}</div>
                                  <div className="text-xs text-blue-600 mt-1">{update.date}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Issues Resolved */}
                        {reportData.report.technicalWork.issuesResolved && reportData.report.technicalWork.issuesResolved.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">Issues Resolved</h5>
                            <div className="space-y-2">
                              {reportData.report.technicalWork.issuesResolved.slice(0, 5).map((issue: any, index: number) => (
                                <div key={index} className="bg-green-50 border border-green-200 rounded p-3">
                                  <div className="font-medium text-sm text-green-900">{issue.resolvedBy}</div>
                                  <div className="text-sm text-green-800 mt-1">{issue.issue}</div>
                                  <div className="text-xs text-green-600 mt-1">{issue.date}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Configuration Changes */}
                        {reportData.report.technicalWork.configurationChanges && reportData.report.technicalWork.configurationChanges.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3">Configuration Changes</h5>
                            <div className="space-y-2">
                              {reportData.report.technicalWork.configurationChanges.slice(0, 5).map((change: any, index: number) => (
                                <div key={index} className="bg-gray-50 border border-gray-200 rounded p-3">
                                  <div className="font-medium text-sm text-gray-900">{change.changedBy}</div>
                                  <div className="text-sm text-gray-800 mt-1">{change.change}</div>
                                  <div className="text-xs text-gray-600 mt-1">{change.date}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Critical Updates */}
                  {reportData.report.criticalUpdates && reportData.report.criticalUpdates.length > 0 && (
                    <div className="card">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                        Critical Communications
                      </h4>
                      <div className="space-y-3">
                        {reportData.report.criticalUpdates.slice(0, 10).map((update: any, index: number) => (
                          <div key={index} className="border-l-4 border-red-200 pl-4 py-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-900">{update.author}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">{update.importance}</span>
                                <span className="text-xs text-gray-500">{update.timestamp}</span>
                              </div>
                            </div>
                            <p className="text-gray-700 text-sm">{update.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Items */}
                  {reportData.report.actionItems && (
                    <div className="card">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CheckSquare className="h-5 w-5 text-green-600 mr-2" />
                        Action Items
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Immediate Actions */}
                        {reportData.report.actionItems.immediate && reportData.report.actionItems.immediate.length > 0 && (
                          <div>
                            <h5 className="font-medium text-red-900 mb-3">Immediate ({reportData.report.actionItems.immediate.length})</h5>
                            <div className="space-y-2">
                              {reportData.report.actionItems.immediate.slice(0, 5).map((action: string, index: number) => (
                                <div key={index} className="bg-red-50 border border-red-200 rounded p-3">
                                  <div className="text-sm text-red-800">{action}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* This Week Actions */}
                        {reportData.report.actionItems.thisWeek && reportData.report.actionItems.thisWeek.length > 0 && (
                          <div>
                            <h5 className="font-medium text-yellow-900 mb-3">This Week ({reportData.report.actionItems.thisWeek.length})</h5>
                            <div className="space-y-2">
                              {reportData.report.actionItems.thisWeek.slice(0, 5).map((action: string, index: number) => (
                                <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                  <div className="text-sm text-yellow-800">{action}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Upcoming Actions */}
                        {reportData.report.actionItems.upcoming && reportData.report.actionItems.upcoming.length > 0 && (
                          <div>
                            <h5 className="font-medium text-blue-900 mb-3">Upcoming ({reportData.report.actionItems.upcoming.length})</h5>
                            <div className="space-y-2">
                              {reportData.report.actionItems.upcoming.slice(0, 5).map((action: string, index: number) => (
                                <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3">
                                  <div className="text-sm text-blue-800">{action}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Project Metrics */}
                  {reportData.report.projectMetrics && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <BarChart3 className="h-5 w-5 text-gray-600 mr-2" />
                        Project Metrics
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">{reportData.report.projectMetrics.totalMessages}</div>
                          <div className="text-sm text-gray-500">Total Messages</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">{reportData.report.projectMetrics.activeContributors}</div>
                          <div className="text-sm text-gray-500">Active Contributors</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">{reportData.report.projectMetrics.averageDailyActivity}</div>
                          <div className="text-sm text-gray-500">Avg Daily Activity</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">{reportData.report.projectMetrics.projectVelocity}</div>
                          <div className="text-sm text-gray-500">Project Velocity</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">{reportData.report.projectMetrics.taskCompletionRate}</div>
                          <div className="text-sm text-gray-500">Task Completion</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">{reportData.report.projectMetrics.activeDaysRatio}</div>
                          <div className="text-sm text-gray-500">Active Days</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">{reportData.report.projectMetrics.technicalIssueResolutionRate}</div>
                          <div className="text-sm text-gray-500">Issue Resolution</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Peak Activity</div>
                          <div className="text-sm font-medium text-gray-900">{reportData.report.projectMetrics.peakActivityDate}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Report Metadata */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>
                        Report generated: {reportData.generatedAt ? new Date(reportData.generatedAt).toLocaleString() : 'Unknown'}
                      </span>
                      <span>
                        Analysis period: {reportData.timeframe || 30} days ({reportData.messageCount || 0} messages)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Report Data</h4>
                    <p className="text-gray-600">Unable to display report information</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Bot className="h-5 w-5 text-blue-600 mr-2" />
                  AI Project Assistant
                </h3>
                <p className="text-sm text-gray-600 mt-1">{showChatModal.groupName}</p>
              </div>
              <button
                onClick={() => {
                  setShowChatModal(null);
                  setChatMessages([]);
                  setCurrentQuestion('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* API Key Status */}
            {!geminiApiKey ? (
              <div className="p-4 bg-orange-50 border-b border-orange-200">
                <div className="flex items-center space-x-3">
                  <Info className="h-5 w-5 text-orange-600" />
                  <div>
                    <h4 className="font-medium text-orange-800">API Key Required</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      Please configure your Google Gemini API key in Settings to use AI chat.
                      <br />
                      Go to <strong>Settings → LLM Provider → Google Gemini</strong> and enter your API key.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-green-50 border-b border-green-200">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <h4 className="font-medium text-green-800">AI Ready</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Gemini API key configured. Ready to answer questions about your project.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {chatMessages.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h4>
                  <p className="text-gray-600 mb-4">
                    Ask me anything about this project. I can analyze the group context, message history,
                    team activity, project progress, and more.
                  </p>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>• "What's the current project status?"</p>
                    <p>• "Who's working on what?"</p>
                    <p>• "Any blockers or issues?"</p>
                    <p>• "Summary of recent activity"</p>
                  </div>
                </div>
              ) : (
                chatMessages.map((message, index) => (
                  <div key={index} className={clsx(
                    'flex',
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  )}>
                    <div className={clsx(
                      'max-w-3xl px-4 py-3 rounded-lg relative group',
                      message.type === 'user'
                        ? 'bg-blue-600 text-white ml-12'
                        : 'bg-gray-100 text-gray-900 mr-12'
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {message.type === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                          <span className="text-sm font-medium">
                            {message.type === 'user' ? 'You' : 'AI Assistant'}
                          </span>
                          <span className="text-xs opacity-75">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {message.type === 'ai' && (
                          <button
                            onClick={() => handleCopyMessage(message.content, index)}
                            className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="Copy message"
                          >
                            {copiedMessageIndex === index ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-gray-600" />
                            )}
                          </button>
                        )}
                      </div>
                      {message.type === 'ai' ? (
                        <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-900 prose-strong:text-gray-900 prose-ul:text-gray-900 prose-ol:text-gray-900 prose-li:text-gray-900 prose-code:text-gray-900 prose-pre:bg-gray-800 prose-pre:text-gray-100">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap text-white">
                          {message.content}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* AI Typing Indicator */}
              {isAiResponding && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 max-w-3xl px-4 py-3 rounded-lg mr-12">
                    <div className="flex items-center space-x-2 mb-2">
                      <Bot className="h-4 w-4" />
                      <span className="text-sm font-medium">AI Assistant</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-gray-500 ml-2">Analyzing project data...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <textarea
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a question about this project..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    disabled={!geminiApiKey.trim() || isAiResponding}
                  />
                </div>
                <button
                  onClick={handleSendQuestion}
                  disabled={!currentQuestion.trim() || !geminiApiKey.trim() || isAiResponding}
                  className="btn btn-primary btn-md"
                >
                  {isAiResponding ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Group Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <UserPlus className="h-5 w-5 text-blue-600 mr-2" />
                  Group Members
                </h3>
                <p className="text-sm text-gray-600 mt-1">{showMembersModal.groupName}</p>
              </div>
              <button
                onClick={() => {
                  setShowMembersModal(null);
                  setGroupMembers([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {loadingMembers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Loading Members</h4>
                    <p className="text-gray-600">
                      Analyzing group messages to extract participant information...
                    </p>
                  </div>
                </div>
              ) : groupMembers.length > 0 ? (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800">Member Role Assignment</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Assign roles to team members to better understand responsibilities and improve project tracking.
                          These roles will be saved as part of the group context.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupMembers.map((member, index) => (
                      <div key={member.author} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{member.authorName}</h4>
                              <p className="text-sm text-gray-500 font-mono">{member.author}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Messages:</span>
                              <span className="font-medium text-gray-900 ml-2">{member.messageCount}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Last seen:</span>
                              <span className="font-medium text-gray-900 ml-2">
                                {formatMessageTimestamp(member.lastSeen)}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label htmlFor={`role-${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                              Role/Responsibility
                            </label>
                            <input
                              id={`role-${index}`}
                              type="text"
                              value={member.role || ''}
                              onChange={(e) => handleMemberRoleChange(index, e.target.value)}
                              placeholder="e.g., Project Manager, Developer, Designer..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                    <div className="text-sm text-gray-600">
                      <p>Total members: <span className="font-medium">{groupMembers.length}</span></p>
                      <p>Members with assigned roles: <span className="font-medium">{groupMembers.filter(m => m.role && m.role.trim()).length}</span></p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Members Found</h4>
                  <p className="text-gray-600">
                    No group members could be found. Make sure there are messages in this group.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!loadingMembers && groupMembers.length > 0 && (
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <div>
                  <p className="text-sm text-gray-600">
                    Roles will be saved to the group context and can be modified later.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowMembersModal(null);
                      setGroupMembers([]);
                    }}
                    className="btn btn-sm btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMemberRoles}
                    className="btn btn-sm btn-primary"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save Roles
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {showAddGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Group</h3>
              <button
                onClick={() => {
                  setShowAddGroupModal(false);
                  setNewGroupName('');
                  setNewGroupId('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  id="groupName"
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Project Alpha Team"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="groupId" className="block text-sm font-medium text-gray-700 mb-2">
                  Group ID *
                </label>
                <input
                  id="groupId"
                  type="text"
                  value={newGroupId}
                  onChange={(e) => setNewGroupId(e.target.value)}
                  placeholder="e.g., project_alpha or 1234567890@g.us"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter a unique identifier for this group. Use WhatsApp group ID format (e.g., 1234567890@g.us) or any custom ID.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Quick Start</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      After adding the group, you can upload WhatsApp chat history to populate messages.
                      The group will be automatically watched for monitoring.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowAddGroupModal(false);
                  setNewGroupName('');
                  setNewGroupId('');
                }}
                className="btn btn-sm btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGroup}
                disabled={!newGroupName.trim() || !newGroupId.trim()}
                className="btn btn-sm btn-primary"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {showSendMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Send Message</h3>
                <p className="text-sm text-gray-600 mt-1">{showSendMessageModal.groupName}</p>
              </div>
              <button
                onClick={() => {
                  setShowSendMessageModal(null);
                  setMessageToSend('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={sendingMessage}
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Message
                  </label>
                  <textarea
                    id="message"
                    value={messageToSend}
                    onChange={(e) => setMessageToSend(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={sendingMessage}
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Confirmation Required</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        You will be asked to confirm before sending this message to the WhatsApp group.
                        This ensures no accidental messages are sent.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowSendMessageModal(null);
                  setMessageToSend('');
                }}
                className="btn btn-sm btn-secondary"
                disabled={sendingMessage}
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessageClick}
                disabled={!messageToSend.trim() || sendingMessage}
                className="btn btn-sm btn-success"
              >
                {sendingMessage ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmSend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Send Message</h3>
                  <p className="text-sm text-gray-600 mt-1">Are you sure you want to send this message?</p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="text-sm">
                  <div className="font-medium text-gray-700 mb-1">Group:</div>
                  <div className="text-gray-900 mb-3">{showSendMessageModal?.groupName}</div>

                  <div className="font-medium text-gray-700 mb-1">Message:</div>
                  <div className="text-gray-900 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {messageToSend}
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-700">
                    This message will be sent to the WhatsApp group immediately and cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={handleCancelSend}
                  className="btn btn-sm btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSendMessage}
                  className="btn btn-sm btn-success"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Yes, Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}