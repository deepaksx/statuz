import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import type { Project } from '@aipm/shared';

export default function Projects() {
  const { getProjects, getTasks } = useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; done: number; todo: number; inProgress: number }>>({});

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjects({ status: 'active' });
      setProjects(data);

      // Load task counts for each project
      const counts: Record<string, any> = {};
      for (const project of data) {
        const tasks = await getTasks({ projectId: project.id });
        counts[project.id] = {
          total: tasks.length,
          done: tasks.filter(t => t.status === 'done').length,
          todo: tasks.filter(t => t.status === 'todo').length,
          inProgress: tasks.filter(t => t.status === 'in_progress').length
        };
      }
      setTaskCounts(counts);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
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

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'text-red-400';
      case 2: return 'text-orange-400';
      case 3: return 'text-blue-400';
      case 4: return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getSlaTierColor = (tier?: string) => {
    switch (tier) {
      case 'platinum': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'gold': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'silver': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      case 'bronze': return 'bg-orange-700/20 text-orange-300 border-orange-700/30';
      default: return 'bg-gray-700/20 text-gray-400 border-gray-700/30';
    }
  };

  const getCompletionPercentage = (projectId: string) => {
    const counts = taskCounts[projectId];
    if (!counts || counts.total === 0) return 0;
    return Math.round((counts.done / counts.total) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading projects...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-gray-400 mb-4">No projects found</div>
        <div className="text-sm text-gray-500">
          Projects are automatically created from WhatsApp groups when tasks are extracted
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Projects</h1>
        <p className="text-gray-400">Active projects tracked from WhatsApp groups</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-blue-500/50 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  {project.name}
                </h3>
                {project.code && (
                  <div className="text-xs text-gray-500 font-mono">{project.code}</div>
                )}
              </div>
              {project.slaTier && (
                <span className={`px-2 py-1 text-xs rounded border ${getSlaTierColor(project.slaTier)}`}>
                  {project.slaTier.toUpperCase()}
                </span>
              )}
            </div>

            {/* Description */}
            {project.description && (
              <div className="text-sm text-gray-400 mb-3 p-2 bg-gray-900 rounded border border-gray-700">
                <div className="text-xs text-gray-500 mb-1">Project Description (AI Inferred):</div>
                <div className="text-sm text-gray-300">{project.description}</div>
              </div>
            )}

            {/* Client */}
            {project.clientName && (
              <div className="text-sm text-gray-400 mb-3">
                Client: {project.clientName}
              </div>
            )}

            {/* Priority */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-500">Priority:</span>
              <span className={`text-sm font-medium ${getPriorityColor(project.priority)}`}>
                {getPriorityLabel(project.priority)}
              </span>
            </div>

            {/* Progress */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Progress</span>
                <span>{getCompletionPercentage(project.id)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${getCompletionPercentage(project.id)}%` }}
                />
              </div>
            </div>

            {/* Task Stats */}
            {taskCounts[project.id] && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-xs text-gray-500">To Do</div>
                  <div className="text-lg font-semibold text-blue-400">
                    {taskCounts[project.id].todo}
                  </div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-xs text-gray-500">In Progress</div>
                  <div className="text-lg font-semibold text-yellow-400">
                    {taskCounts[project.id].inProgress}
                  </div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-xs text-gray-500">Done</div>
                  <div className="text-lg font-semibold text-green-400">
                    {taskCounts[project.id].done}
                  </div>
                </div>
              </div>
            )}

            {/* Team */}
            {(project.projectManager || project.technicalLead) && (
              <div className="border-t border-gray-700 pt-3 mt-3">
                {project.projectManager && (
                  <div className="text-xs text-gray-500 mb-1">
                    PM: <span className="text-gray-300">{project.projectManager}</span>
                  </div>
                )}
                {project.technicalLead && (
                  <div className="text-xs text-gray-500">
                    Tech Lead: <span className="text-gray-300">{project.technicalLead}</span>
                  </div>
                )}
              </div>
            )}

            {/* WhatsApp Group Link */}
            {project.whatsappGroupId && (
              <div className="border-t border-gray-700 pt-3 mt-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span>Synced from WhatsApp</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
