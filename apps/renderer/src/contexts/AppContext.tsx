import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import toast from 'react-hot-toast';
import type {
  WhatsAppConnectionState,
  Group,
  Message,
  Signal,
  Milestone,
  ProjectContext,
  AppConfig,
  SnapshotReport
} from '@statuz/shared';

interface AppContextType {
  // Connection state
  connectionState: WhatsAppConnectionState;

  // Data
  groups: Group[];
  messages: Message[];
  signals: Signal[];
  milestones: Milestone[];
  config: AppConfig | null;
  stats: any;

  // Loading states
  loading: {
    groups: boolean;
    messages: boolean;
    signals: boolean;
    milestones: boolean;
    snapshot: boolean;
  };

  // Actions
  refreshGroups: () => Promise<void>;
  updateGroupWatchStatus: (groupId: string, isWatched: boolean) => Promise<void>;
  loadMessages: (groupId?: string, since?: number, limit?: number) => Promise<void>;
  loadSignals: (kind?: string, since?: number, limit?: number) => Promise<void>;
  loadMilestones: () => Promise<void>;
  generateSnapshot: (since?: number) => Promise<SnapshotReport | null>;
  exportSnapshot: (report: SnapshotReport, format: 'json' | 'markdown') => Promise<string | null>;
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
  refreshStats: () => Promise<void>;
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
    status: 'DISCONNECTED'
  });
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [stats, setStats] = useState<any>(null);

  const [loading, setLoading] = useState({
    groups: false,
    messages: false,
    signals: false,
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
        // Mock responses for browser mode
        return getMockData(type, payload);
      }
    } catch (error) {
      console.error(`IPC error (${type}):`, error);
      toast.error(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  // Mock data for browser development (returns immediately)
  const getMockData = (type: string, payload?: any) => {
    console.log('Mock data request:', type); // Debug log

    switch (type) {
      case 'get-connection-state':
        return Promise.resolve({ status: 'DISCONNECTED' });
      case 'get-groups':
      case 'refresh-groups':
        return Promise.resolve([
          { id: 'group_1', name: 'SAP Implementation Team', isWatched: true },
          { id: 'group_2', name: 'Daily Standup', isWatched: false },
          { id: 'group_3', name: 'Project Updates', isWatched: true }
        ]);
      case 'get-messages':
        return Promise.resolve([
          {
            id: 'msg_1',
            groupId: 'group_1',
            author: '1234567890@c.us',
            authorName: 'John Smith',
            timestamp: Date.now() - 3600000,
            text: 'MTO Strategy 50 implementation is 70% complete. On track for October 30th deadline.',
            raw: '{}'
          },
          {
            id: 'msg_2',
            groupId: 'group_1',
            author: '2345678901@c.us',
            authorName: 'Sarah Johnson',
            timestamp: Date.now() - 7200000,
            text: 'RAR setup completed successfully. Revenue recognition rules are working perfectly.',
            raw: '{}'
          }
        ]);
      case 'get-signals':
        return Promise.resolve([
          {
            id: 'signal_1',
            messageId: 'msg_1',
            kind: 'MILESTONE_UPDATE',
            createdAt: Date.now() - 3600000,
            payload: {
              milestoneId: 'MTO_STRATEGY_50',
              mentionedText: 'MTO Strategy 50 implementation is 70% complete',
              status: 'IN_PROGRESS',
              percentComplete: 70
            }
          },
          {
            id: 'signal_2',
            messageId: 'msg_2',
            kind: 'MILESTONE_UPDATE',
            createdAt: Date.now() - 7200000,
            payload: {
              milestoneId: 'RAR_SETUP',
              mentionedText: 'RAR setup completed successfully',
              status: 'DONE'
            }
          }
        ]);
      case 'get-milestones':
        return Promise.resolve([
          {
            id: 'MTO_STRATEGY_50',
            title: 'MTO Strategy Implementation',
            description: 'Configure Make-to-Order strategy with variant configuration',
            owner: 'John Smith',
            dueDate: '2024-10-30',
            acceptanceCriteria: 'All MTO workflows functional',
            status: 'IN_PROGRESS',
            lastUpdateTs: Date.now() - 3600000
          },
          {
            id: 'RAR_SETUP',
            title: 'Revenue Accounting Setup',
            description: 'Implement RAR functionality for subscription billing',
            owner: 'Sarah Johnson',
            dueDate: '2024-11-15',
            acceptanceCriteria: 'RAR module configured and tested',
            status: 'DONE',
            lastUpdateTs: Date.now() - 7200000
          }
        ]);
      case 'get-config':
        return Promise.resolve({
          privacyMode: true,
          llmProvider: 'none',
          dataDirectory: '/mock/data'
        });
      case 'get-stats':
        return Promise.resolve({
          watchedGroups: 2,
          totalMessages: 15,
          totalSignals: 8,
          totalMilestones: 5,
          completedMilestones: 2
        });
      case 'update-group-watch-status':
        return Promise.resolve(true);
      default:
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

    const handleMessageProcessed = ({ message, signals: newSignals }: { message: Message; signals: Signal[] }) => {
      // Add new message to the list if it's from a watched group
      const group = groups.find(g => g.id === message.groupId && g.isWatched);
      if (group) {
        setMessages(prev => [message, ...prev.filter(m => m.id !== message.id)]);
        setSignals(prev => [...newSignals, ...prev]);

        if (newSignals.length > 0) {
          toast.success(`${newSignals.length} signals extracted from new message`);
        }
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
        window.electronAPI.removeListener('connection-state-changed', handleConnectionStateChanged);
        window.electronAPI.removeListener('groups-updated', handleGroupsUpdated);
        window.electronAPI.removeListener('message-processed', handleMessageProcessed);
        window.electronAPI.removeListener('service-error', handleServiceError);
      };
    }
  }, [groups]);

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

  const loadSignals = async (kind?: string, since?: number, limit?: number) => {
    setLoading(prev => ({ ...prev, signals: true }));
    try {
      const loadedSignals = await invoke('get-signals', { kind, since, limit });
      setSignals(loadedSignals);
    } finally {
      setLoading(prev => ({ ...prev, signals: false }));
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
    } catch (error) {
      console.error('Failed to update config:', error);
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

  const value: AppContextType = {
    connectionState,
    groups,
    messages,
    signals,
    milestones,
    config,
    stats,
    loading,
    refreshGroups,
    updateGroupWatchStatus,
    loadMessages,
    loadSignals,
    loadMilestones,
    generateSnapshot,
    exportSnapshot,
    updateConfig,
    refreshStats
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}