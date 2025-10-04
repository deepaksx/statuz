import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import type { Task, Project } from '@aipm/shared';

export default function Tasks() {
  const { getTasks, updateTask, getProjects } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | 'all'>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [selectedProject]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsData, tasksData] = await Promise.all([
        getProjects(),
        getTasks()
      ]);
      setProjects(projectsData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const filter = selectedProject === 'all' ? {} : { projectId: selectedProject };
      const tasksData = await getTasks(filter);
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateTask(taskId, { status: newStatus });
      // Update local state
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 2: return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 3: return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 4: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Critical';
      case 2: return 'High';
      case 3: return 'Normal';
      case 4: return 'Low';
      default: return 'Unknown';
    }
  };

  const formatDeadline = (timestamp?: number) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (diffDays < 0) {
      return { text: `${dateStr} (Overdue)`, color: 'text-red-400' };
    } else if (diffDays === 0) {
      return { text: `${dateStr} (Today)`, color: 'text-yellow-400' };
    } else if (diffDays === 1) {
      return { text: `${dateStr} (Tomorrow)`, color: 'text-yellow-400' };
    } else if (diffDays <= 7) {
      return { text: `${dateStr} (${diffDays}d)`, color: 'text-orange-400' };
    }
    return { text: dateStr, color: 'text-gray-400' };
  };

  const getWorkItemTypeColor = (type?: string) => {
    switch (type) {
      case 'epic': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'story': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'task': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'subtask': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getWorkItemTypeLabel = (type?: string) => {
    if (!type) return 'Task';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const deadline = formatDeadline(task.deadline);
    const [showRecommendation, setShowRecommendation] = useState(false);

    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500/50 transition-colors mb-3">
        {/* Header with Work Item Type */}
        <div className="flex items-start gap-2 mb-2">
          {/* Work Item Type Badge */}
          <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getWorkItemTypeColor(task.workItemType)}`}>
            {getWorkItemTypeLabel(task.workItemType)}
            {task.storyPoints && task.workItemType === 'story' && (
              <span className="ml-1">({task.storyPoints})</span>
            )}
          </span>

          {/* Title */}
          <h3 className="text-sm font-medium text-white flex-1">{task.title}</h3>

          {/* Priority */}
          {task.priority && (
            <span className={`px-2 py-0.5 text-xs rounded border ${getPriorityColor(task.priority)}`}>
              {getPriorityLabel(task.priority)}
            </span>
          )}
        </div>

        {/* SAP Badges */}
        {(task.sapModule || task.sapTcode || task.sapTransportRequest) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.sapModule && (
              <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded">
                📦 {task.sapModule}
              </span>
            )}
            {task.sapTcode && (
              <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded">
                🔧 {task.sapTcode}
              </span>
            )}
            {task.sapTransportRequest && (
              <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                🚚 {task.sapTransportRequest}
              </span>
            )}
          </div>
        )}

        {/* Description */}
        {task.description && (
          <p className="text-xs text-gray-400 mb-3 line-clamp-2">{task.description}</p>
        )}

        {/* Meta Info */}
        <div className="space-y-2">
          {/* Project */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>{getProjectName(task.projectId)}</span>
          </div>

          {/* Owner */}
          {task.ownerAlias && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{task.ownerAlias}</span>
            </div>
          )}

          {/* Deadline */}
          {deadline && (
            <div className="flex items-center gap-2 text-xs">
              <svg className={`w-3 h-3 ${deadline.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className={deadline.color}>{deadline.text}</span>
            </div>
          )}

          {/* Confidence Score */}
          {task.confidenceScore && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>AI Confidence: {Math.round(task.confidenceScore * 100)}%</span>
            </div>
          )}
        </div>

        {/* AI Recommendation */}
        {task.aiRecommendation && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <button
              onClick={() => setShowRecommendation(!showRecommendation)}
              className="flex items-center justify-between w-full text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="font-medium">🤖 AI Recommendation</span>
              </span>
              <svg
                className={`w-3 h-3 transition-transform ${showRecommendation ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showRecommendation && (
              <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-gray-300">
                {task.aiRecommendation}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 pt-3 border-t border-gray-700">
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
            className="w-full bg-gray-900 text-white text-xs rounded px-2 py-1 border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
    );
  };

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter(t => t.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Task Board</h1>
        <p className="text-gray-400 mb-4">Tasks extracted from WhatsApp messages</p>

        {/* Project Filter */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400">Filter by project:</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-gray-400 mb-4">No tasks found</div>
          <div className="text-sm text-gray-500 text-center max-w-md">
            Tasks are automatically extracted from WhatsApp messages using AI.
            <br />
            Try sending a message like: "Alice will complete the API integration by Friday"
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* To Do Column */}
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-300">To Do</h2>
              <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded">
                {getTasksByStatus('todo').length}
              </span>
            </div>
            <div className="space-y-3">
              {getTasksByStatus('todo').map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-300">In Progress</h2>
              <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded">
                {getTasksByStatus('in_progress').length}
              </span>
            </div>
            <div className="space-y-3">
              {getTasksByStatus('in_progress').map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>

          {/* Blocked Column */}
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-300">Blocked</h2>
              <span className="bg-red-500/20 text-red-300 text-xs px-2 py-1 rounded">
                {getTasksByStatus('blocked').length}
              </span>
            </div>
            <div className="space-y-3">
              {getTasksByStatus('blocked').map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>

          {/* Done Column */}
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-300">Done</h2>
              <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded">
                {getTasksByStatus('done').length}
              </span>
            </div>
            <div className="space-y-3">
              {getTasksByStatus('done').map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
