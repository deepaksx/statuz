import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import type { Task, Project } from '@aipm/shared';
import { ChevronDown, ChevronRight, GitBranch, AlertCircle, CheckCircle2, Circle, Clock } from 'lucide-react';

export default function Backlog() {
  const { getTasks, getProjects } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | 'all'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getWorkItemTypeColor = (type?: string) => {
    switch (type) {
      case 'epic': return 'border-purple-500/50 bg-purple-500/10';
      case 'story': return 'border-blue-500/50 bg-blue-500/10';
      case 'task': return 'border-green-500/50 bg-green-500/10';
      case 'subtask': return 'border-gray-500/50 bg-gray-500/10';
      default: return 'border-gray-500/50 bg-gray-500/10';
    }
  };

  const getWorkItemTypeIcon = (type?: string) => {
    switch (type) {
      case 'epic': return '🎯';
      case 'story': return '📖';
      case 'task': return '✓';
      case 'subtask': return '·';
      default: return '✓';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'blocked': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  // Build hierarchy: Epic → Story → Task → Subtask
  const buildHierarchy = () => {
    const epics = tasks.filter(t => t.workItemType === 'epic');
    const stories = tasks.filter(t => t.workItemType === 'story');
    const regularTasks = tasks.filter(t => !t.workItemType || t.workItemType === 'task');
    const subtasks = tasks.filter(t => t.workItemType === 'subtask');

    const hierarchy: any[] = [];

    // Epics at top level
    epics.forEach(epic => {
      const epicNode: any = {
        task: epic,
        children: []
      };

      // Find stories that belong to this epic (by parent_task_id or same project)
      const epicStories = stories.filter(s =>
        s.parentTaskId === epic.id || (!s.parentTaskId && s.projectId === epic.projectId)
      );

      epicStories.forEach(story => {
        const storyNode: any = {
          task: story,
          children: []
        };

        // Find tasks for this story
        const storyTasks = regularTasks.filter(t =>
          t.parentTaskId === story.id || (!t.parentTaskId && t.projectId === story.projectId)
        );

        storyTasks.forEach(task => {
          const taskNode: any = {
            task: task,
            children: []
          };

          // Find subtasks for this task
          const taskSubtasks = subtasks.filter(st => st.parentTaskId === task.id);
          taskNode.children = taskSubtasks.map(st => ({ task: st, children: [] }));

          storyNode.children.push(taskNode);
        });

        epicNode.children.push(storyNode);
      });

      hierarchy.push(epicNode);
    });

    // Orphaned stories (no epic parent)
    const orphanedStories = stories.filter(s => !s.parentTaskId && !epics.find(e => e.projectId === s.projectId));
    orphanedStories.forEach(story => {
      const storyNode: any = {
        task: story,
        children: []
      };

      const storyTasks = regularTasks.filter(t =>
        t.parentTaskId === story.id || (!t.parentTaskId && t.projectId === story.projectId)
      );

      storyTasks.forEach(task => {
        const taskNode: any = {
          task: task,
          children: []
        };
        const taskSubtasks = subtasks.filter(st => st.parentTaskId === task.id);
        taskNode.children = taskSubtasks.map(st => ({ task: st, children: [] }));
        storyNode.children.push(taskNode);
      });

      hierarchy.push(storyNode);
    });

    // Orphaned tasks (no story/epic parent)
    const orphanedTasks = regularTasks.filter(t =>
      !t.parentTaskId &&
      !stories.find(s => s.projectId === t.projectId) &&
      !epics.find(e => e.projectId === t.projectId)
    );

    orphanedTasks.forEach(task => {
      const taskNode: any = {
        task: task,
        children: []
      };
      const taskSubtasks = subtasks.filter(st => st.parentTaskId === task.id);
      taskNode.children = taskSubtasks.map(st => ({ task: st, children: [] }));
      hierarchy.push(taskNode);
    });

    return hierarchy;
  };

  const renderTaskNode = (node: any, depth: number = 0) => {
    const task = node.task;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedItems.has(task.id);

    return (
      <div key={task.id} className="mb-2">
        {/* Task Row */}
        <div
          className={`flex items-start gap-3 p-3 rounded-lg border ${getWorkItemTypeColor(task.workItemType)} hover:bg-gray-700/30 transition-all`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          {/* Expand/Collapse */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(task.id)}
              className="flex-shrink-0 mt-0.5 text-gray-400 hover:text-white transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-4 flex-shrink-0" />
          )}

          {/* Status Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {getStatusIcon(task.status)}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Title Row */}
            <div className="flex items-start gap-2 mb-2">
              {/* Work Item Type */}
              <span className="flex-shrink-0 text-lg">{getWorkItemTypeIcon(task.workItemType)}</span>

              {/* Title */}
              <h3 className="text-sm font-medium text-white flex-1">{task.title}</h3>

              {/* Story Points */}
              {task.storyPoints && task.workItemType === 'story' && (
                <span className="flex-shrink-0 px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded">
                  {task.storyPoints} pts
                </span>
              )}

              {/* Priority */}
              {task.priority === 1 && (
                <span className="flex-shrink-0 px-2 py-0.5 text-xs bg-red-500/20 text-red-300 border border-red-500/30 rounded">
                  Critical
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
              <p className="text-xs text-gray-400 mb-2 line-clamp-2">{task.description}</p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              {task.ownerAlias && (
                <span className="flex items-center gap-1">
                  👤 {task.ownerAlias}
                </span>
              )}
              {task.dependenciesCount > 0 && (
                <span className="flex items-center gap-1 text-orange-400">
                  <GitBranch className="w-3 h-3" />
                  {task.dependenciesCount} dependencies
                </span>
              )}
              {task.blockersCount > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <AlertCircle className="w-3 h-3" />
                  {task.blockersCount} blockers
                </span>
              )}
              {task.progressPercentage !== undefined && (
                <span className="flex items-center gap-1">
                  📊 {task.progressPercentage}%
                </span>
              )}
            </div>

            {/* AI Recommendation */}
            {task.aiRecommendation && (
              <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-gray-300">
                <div className="flex items-start gap-1">
                  <span className="flex-shrink-0">🤖</span>
                  <span className="flex-1">{task.aiRecommendation}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-2">
            {node.children.map((child: any) => renderTaskNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading backlog...</div>
      </div>
    );
  }

  const hierarchy = buildHierarchy();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">
          SCRUM Backlog
        </h1>
        <p className="text-gray-400 mb-4">
          Hierarchical view: Epic → Story → Task → Subtask
        </p>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Project:</label>
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

          {/* Expand/Collapse All */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const allIds = new Set(tasks.map(t => t.id));
                setExpandedItems(allIds);
              }}
              className="px-3 py-2 text-xs bg-gray-800 text-white rounded border border-gray-700 hover:bg-gray-700 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={() => setExpandedItems(new Set())}
              className="px-3 py-2 text-xs bg-gray-800 text-white rounded border border-gray-700 hover:bg-gray-700 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <span>Epic (3+ months)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">📖</span>
            <span>Story (1-4 weeks)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">✓</span>
            <span>Task (1-5 days)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">·</span>
            <span>Subtask (&lt;1 day)</span>
          </div>
        </div>
      </div>

      {/* Backlog */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-gray-400 mb-4">No work items found</div>
          <div className="text-sm text-gray-500 text-center max-w-md">
            Work items are automatically extracted from WhatsApp messages using AI with SAP expertise.
            <br />
            Upload chat history to see Epic → Story → Task → Subtask hierarchy.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {hierarchy.map((node: any) => renderTaskNode(node, 0))}
        </div>
      )}
    </div>
  );
}
