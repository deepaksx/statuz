import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import toast from 'react-hot-toast';
import type {
  WhatsAppConnectionState,
  Group,
  Message,
  Milestone,
  AppConfig,
  SnapshotReport,
  Project,
  Task,
  Risk,
  ConflictResolution
} from '@aipm/shared';
// Demo data removed - app now requires live backend

interface AppContextType {
  // Connection state
  connectionState: WhatsAppConnectionState;

  // Data
  groups: Group[];
  messages: Message[];
  milestones: Milestone[];
  config: AppConfig | null;
  stats: any;

  // Loading states
  loading: {
    groups: boolean;
    messages: boolean;
    milestones: boolean;
    snapshot: boolean;
  };

  // Actions
  refreshGroups: () => Promise<void>;
  updateGroupWatchStatus: (groupId: string, isWatched: boolean) => Promise<void>;
  loadMessages: (groupId?: string, since?: number, limit?: number) => Promise<void>;
  getMessages: (groupId?: string, since?: number, limit?: number) => Promise<any[]>;
  loadMilestones: () => Promise<void>;
  generateSnapshot: (since?: number) => Promise<SnapshotReport | null>;
  exportSnapshot: (report: SnapshotReport, format: 'json' | 'markdown') => Promise<string | null>;
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
  refreshStats: () => Promise<void>;
  getGroupContext: (groupId: string) => Promise<{ context: string; contextUpdatedAt: number | null }>;
  updateGroupContext: (groupId: string, context: string) => Promise<void>;
  deleteGroupContext: (groupId: string) => Promise<void>;
  generateGroupReport: (groupId: string, timeframe?: number) => Promise<any>;
  getGroupMembers: (groupId: string) => Promise<any[]>;
  uploadChatHistory: (groupId: string, content: string) => Promise<{
    success: boolean;
    messagesProcessed: number;
    messagesInserted: number;
  }>;
  extractProjectData: (groupId: string) => Promise<{
    success: boolean;
    storiesCreated: number;
    tasksCreated: number;
    risksCreated: number;
    decisionsCreated: number;
  }>;
  deleteGroupHistory: (groupId: string) => Promise<{
    success: boolean;
    deletedMessages: number;
    deletedProjects: number;
    deletedTasks: number;
    deletedRisks: number;
    deletedDecisions: number;
    deletedDependencies: number;
    totalDeleted: number;
  }>;
  chatWithAI: (groupId: string, question: string, apiKey?: string) => Promise<{ answer: string; tokensUsed?: number }>;
  testAIConnection: (apiKey?: string) => Promise<boolean>;
  setGeminiApiKey: (apiKey: string) => Promise<void>;
  sendMessage: (groupId: string, message: string) => Promise<boolean>;
  invoke: (type: string, payload?: any) => Promise<any>;

  // ==================== AIPM PROJECT MANAGEMENT ====================
  getProjects: (filter?: { status?: string }) => Promise<Project[]>;
  createProject: (project: Partial<Project>) => Promise<{ id: string }>;
  getTasks: (filter?: { projectId?: string; status?: string; ownerPhone?: string }) => Promise<Task[]>;
  createTask: (task: Partial<Task>) => Promise<{ id: string }>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<{ success: boolean }>;
  getRisks: (filter?: { projectId?: string }) => Promise<Risk[]>;
  getConflicts: () => Promise<ConflictResolution[]>;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [connectionState, setConnectionState] = useState<WhatsAppConnectionState>({
    status: typeof window !== 'undefined' && !window.electronAPI ? 'CONNECTED' : 'DISCONNECTED',
    message: typeof window !== 'undefined' && !window.electronAPI ? 'Live backend connected • Real-time updates enabled' : undefined
  });
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [stats, setStats] = useState<any>(null);

  const [loading, setLoading] = useState({
    groups: false,
    messages: false,
    milestones: false,
    snapshot: false
  });

  // IPC helper
  const invoke = async (type: string, payload?: any) => {
    try {
      // Check if running in Electron
      if (typeof window !== 'undefined' && window.electronAPI) {
        const response = await window.electronAPI.invoke({ type, payload });
        if (!response.success) {
          throw new Error(response.error);
        }
        return response.data;
      } else {
        // Live backend for browser mode
        return await getLiveData(type, payload);
      }
    } catch (error) {
      console.error(`IPC error (${type}):`, error);
      toast.error(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  // Live backend integration
  const getLiveData = async (type: string, payload?: any) => {
    console.log('Live API request:', type); // Debug log
    const baseUrl = 'http://localhost:3001/api';

    try {
      switch (type) {
        case 'get-connection-state':
          const connRes = await fetch(`${baseUrl}/connection-state`);
          return await connRes.json();

        case 'get-groups':
        case 'refresh-groups':
          const groupsRes = await fetch(`${baseUrl}/groups`);
          return await groupsRes.json();

        case 'get-messages':
          const messagesRes = await fetch(`${baseUrl}/messages`);
          return await messagesRes.json();

        case 'get-milestones':
          const milestonesRes = await fetch(`${baseUrl}/milestones`);
          return await milestonesRes.json();

        case 'get-stats':
          const statsRes = await fetch(`${baseUrl}/stats`);
          return await statsRes.json();

        case 'update-group-watch-status':
          const updateRes = await fetch(`${baseUrl}/groups/${payload.groupId}/watch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isWatched: payload.isWatched })
          });
          return await updateRes.json();

        case 'get-group-context':
          const contextRes = await fetch(`${baseUrl}/groups/${payload.groupId}/context`);
          return await contextRes.json();

        case 'update-group-context':
          const updateContextRes = await fetch(`${baseUrl}/groups/${payload.groupId}/context`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context: payload.context })
          });
          return await updateContextRes.json();

        case 'delete-group-context':
          const deleteContextRes = await fetch(`${baseUrl}/groups/${payload.groupId}/context`, {
            method: 'DELETE'
          });
          return await deleteContextRes.json();

        case 'generate-group-report':
          const reportRes = await fetch(`${baseUrl}/groups/${payload.groupId}/generate-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timeframe: payload.timeframe || 30 })
          });
          return await reportRes.json();

        case 'get-config':
          const configRes = await fetch(`${baseUrl}/config`);
          return await configRes.json();

        case 'update-config':
          const updateConfigRes = await fetch(`${baseUrl}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          return await updateConfigRes.json();

        default:
          return null;
      }

    } catch (error) {
      console.error('Live API error:', error);
      return Promise.resolve(null);
    }
  };
  // Event handlers
  useEffect(() => {
    const handleConnectionStateChanged = (state: WhatsAppConnectionState) => {
      setConnectionState(state);

      if (state.status === 'CONNECTED') {
        toast.success('WhatsApp connected');
        refreshGroups();
      } else if (state.status === 'DISCONNECTED' && state.error) {
        toast.error(`WhatsApp disconnected: ${state.error}`);
      }
    };

    const handleGroupsUpdated = (updatedGroups: Group[]) => {
      setGroups(updatedGroups);
    };

    const handleMessageProcessed = ({ message }: { message: Message }) => {
      // Add new message to the list if it's from a watched group
      const group = groups.find(g => g.id === message.groupId && g.isWatched);
      if (group) {
        setMessages(prev => [message, ...prev.filter(m => m.id !== message.id)]);
      }
    };

    const handleServiceError = ({ message }: { message: string }) => {
      toast.error(`Service error: ${message}`);
    };

    // Register event listeners (only in Electron)
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.on('connection-state-changed', handleConnectionStateChanged);
      window.electronAPI.on('groups-updated', handleGroupsUpdated);
      window.electronAPI.on('message-processed', handleMessageProcessed);
      window.electronAPI.on('service-error', handleServiceError);

      // Cleanup
      return () => {
        window.electronAPI?.removeListener('connection-state-changed', handleConnectionStateChanged);
        window.electronAPI?.removeListener('groups-updated', handleGroupsUpdated);
        window.electronAPI?.removeListener('message-processed', handleMessageProcessed);
        window.electronAPI?.removeListener('service-error', handleServiceError);
      };
    }
  }, []); // Empty dependency array - only run once!

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load initial data
        const [initialConnectionState, initialConfig] = await Promise.all([
          invoke('get-connection-state'),
          invoke('get-config')
        ]);

        setConnectionState(initialConnectionState);
        setConfig(initialConfig);

        // Load other data
        await Promise.all([
          refreshGroups(),
          loadMilestones(),
          refreshStats()
        ]);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  const refreshGroups = async () => {
    setLoading(prev => ({ ...prev, groups: true }));
    try {
      const updatedGroups = await invoke('refresh-groups');
      setGroups(updatedGroups);
    } catch (error) {
      console.error('Failed to refresh groups:', error);
    } finally {
      setLoading(prev => ({ ...prev, groups: false }));
    }
  };

  const updateGroupWatchStatus = async (groupId: string, isWatched: boolean) => {
    try {
      await invoke('update-group-watch-status', { groupId, isWatched });
      setGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, isWatched } : g
      ));
      toast.success(`Group ${isWatched ? 'added to' : 'removed from'} watch list`);
    } catch (error) {
      console.error('Failed to update group watch status:', error);
    }
  };

  const loadMessages = async (groupId?: string, since?: number, limit?: number) => {
    setLoading(prev => ({ ...prev, messages: true }));
    try {
      const loadedMessages = await invoke('get-messages', { groupId, since, limit });
      setMessages(loadedMessages);
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  };

  const getMessages = async (groupId?: string, since?: number, limit?: number) => {
    try {
      const messages = await invoke('get-messages', { groupId, since, limit });
      return messages;
    } catch (error) {
      console.error('Failed to get messages:', error);
      return [];
    }
  };

  const loadMilestones = async () => {
    setLoading(prev => ({ ...prev, milestones: true }));
    try {
      const loadedMilestones = await invoke('get-milestones');
      setMilestones(loadedMilestones);
    } finally {
      setLoading(prev => ({ ...prev, milestones: false }));
    }
  };

  const generateSnapshot = async (since?: number): Promise<SnapshotReport | null> => {
    setLoading(prev => ({ ...prev, snapshot: true }));
    try {
      const report = await invoke('generate-snapshot', { since });
      toast.success('Snapshot generated successfully');
      // Refresh milestones as they might have been updated
      await loadMilestones();
      return report;
    } catch (error) {
      return null;
    } finally {
      setLoading(prev => ({ ...prev, snapshot: false }));
    }
  };

  const exportSnapshot = async (report: SnapshotReport, format: 'json' | 'markdown'): Promise<string | null> => {
    try {
      const content = await invoke('export-snapshot', { report, format });
      return content;
    } catch (error) {
      return null;
    }
  };

  const updateConfig = async (updates: Partial<AppConfig>) => {
    try {
      const newConfig = await invoke('update-config', updates);
      setConfig(newConfig);
      toast.success('Configuration updated');
      return newConfig;
    } catch (error) {
      console.error('Failed to update config:', error);
      throw error;
    }
  };

  const refreshStats = async () => {
    try {
      const newStats = await invoke('get-stats');
      setStats(newStats);
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  };

  const getGroupContext = async (groupId: string) => {
    try {
      const result = await invoke('get-group-context', { groupId });
      return result;
    } catch (error) {
      console.error('Failed to get group context:', error);
      throw error;
    }
  };

  const updateGroupContext = async (groupId: string, context: string) => {
    try {
      await invoke('update-group-context', { groupId, context });
      // Update local state to reflect the change
      setGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, context, contextUpdatedAt: Date.now() } : g
      ));
      toast.success('Group context updated successfully');
    } catch (error) {
      console.error('Failed to update group context:', error);
      throw error;
    }
  };

  const deleteGroupContext = async (groupId: string) => {
    try {
      await invoke('delete-group-context', { groupId });
      // Update local state to reflect the change
      setGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, context: undefined, contextUpdatedAt: undefined } : g
      ));
      toast.success('Group context deleted successfully');
    } catch (error) {
      console.error('Failed to delete group context:', error);
      throw error;
    }
  };

  const generateGroupReport = async (groupId: string, timeframe = 30) => {
    try {
      const result = await invoke('generate-group-report', { groupId, timeframe });
      return result;
    } catch (error) {
      console.error('Failed to generate group report:', error);
      throw error;
    }
  };

  const getGroupMembers = async (groupId: string) => {
    try {
      const members = await invoke('get-group-members', { groupId });
      return members;
    } catch (error) {
      console.error('Failed to get group members:', error);
      throw error;
    }
  };

  const uploadChatHistory = async (groupId: string, content: string) => {
    try {
      const result = await invoke('upload-chat-history', { groupId, content });
      return result;
    } catch (error) {
      console.error('Failed to upload chat history:', error);
      throw error;
    }
  };

  const extractProjectData = async (groupId: string) => {
    try {
      const result = await invoke('extract-project-data', { groupId });
      await refreshGroups(); // Refresh groups to update UI
      return result;
    } catch (error) {
      console.error('Failed to extract project data:', error);
      throw error;
    }
  };

  const deleteGroupHistory = async (groupId: string) => {
    try {
      const result = await invoke('delete-group-history', { groupId });
      await refreshGroups(); // Refresh groups to update UI
      return result;
    } catch (error) {
      console.error('Failed to delete group history:', error);
      throw error;
    }
  };

  const chatWithAI = async (groupId: string, question: string, apiKey?: string) => {
    try {
      const result = await invoke('ai-chat', { groupId, question, apiKey });
      return result;
    } catch (error) {
      console.error('Failed to chat with AI:', error);
      throw error;
    }
  };

  const testAIConnection = async (apiKey?: string) => {
    try {
      const result = await invoke('test-ai-connection', { apiKey });
      return result;
    } catch (error) {
      console.error('Failed to test AI connection:', error);
      return false;
    }
  };

  const setGeminiApiKey = async (apiKey: string) => {
    try {
      await invoke('set-gemini-api-key', { apiKey });
      // Update local config
      setConfig(prev => prev ? { ...prev, geminiApiKey: apiKey } : null);
      toast.success('Gemini API key saved successfully');
    } catch (error) {
      console.error('Failed to set Gemini API key:', error);
      throw error;
    }
  };

  const sendMessage = async (groupId: string, message: string) => {
    try {
      const result = await invoke('send-message', { groupId, message });
      toast.success('Message sent successfully!');
      return result;
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
      throw error;
    }
  };

  // ==================== AIPM PROJECT MANAGEMENT ====================

  const getProjects = async (filter?: { status?: string }): Promise<Project[]> => {
    try {
      const projects = await invoke('get-projects', filter);
      return projects;
    } catch (error) {
      console.error('Failed to get projects:', error);
      return [];
    }
  };

  const createProject = async (project: Partial<Project>): Promise<{ id: string }> => {
    try {
      const result = await invoke('create-project', project);
      toast.success('Project created successfully');
      return result;
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
      throw error;
    }
  };

  const getTasks = async (filter?: { projectId?: string; status?: string; ownerPhone?: string }): Promise<Task[]> => {
    try {
      const tasks = await invoke('get-tasks', filter);
      return tasks;
    } catch (error) {
      console.error('Failed to get tasks:', error);
      return [];
    }
  };

  const createTask = async (task: Partial<Task>): Promise<{ id: string }> => {
    try {
      const result = await invoke('create-task', task);
      toast.success('Task created successfully');
      return result;
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
      throw error;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>): Promise<{ success: boolean }> => {
    try {
      const result = await invoke('update-task', { taskId, updates });
      toast.success('Task updated successfully');
      return result;
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
      throw error;
    }
  };

  const getRisks = async (filter?: { projectId?: string }): Promise<Risk[]> => {
    try {
      const risks = await invoke('get-risks', filter);
      return risks;
    } catch (error) {
      console.error('Failed to get risks:', error);
      return [];
    }
  };

  const getConflicts = async (): Promise<ConflictResolution[]> => {
    try {
      const conflicts = await invoke('get-conflicts');
      return conflicts;
    } catch (error) {
      console.error('Failed to get conflicts:', error);
      return [];
    }
  };

  const value: AppContextType = {
    connectionState,
    groups,
    messages,
    milestones,
    config,
    stats,
    loading,
    refreshGroups,
    updateGroupWatchStatus,
    loadMessages,
    getMessages,
    loadMilestones,
    generateSnapshot,
    exportSnapshot,
    updateConfig,
    refreshStats,
    getGroupContext,
    updateGroupContext,
    deleteGroupContext,
    generateGroupReport,
    getGroupMembers,
    uploadChatHistory,
    extractProjectData,
    deleteGroupHistory,
    chatWithAI,
    testAIConnection,
    setGeminiApiKey,
    sendMessage,
    invoke,
    // AIPM Project Management
    getProjects,
    createProject,
    getTasks,
    createTask,
    updateTask,
    getRisks,
    getConflicts
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}