import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { FileText, Save, AlertCircle, Sparkles } from 'lucide-react';
import type { Group } from '@aipm/shared';

export function Context() {
  const { groups, loading, updateGroupContext } = useApp();
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [contextText, setContextText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Auto-select first group on load
  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0]);
      setContextText(groups[0].context || '');
    }
  }, [groups]);

  // Update context text when group changes
  useEffect(() => {
    if (selectedGroup) {
      setContextText(selectedGroup.context || '');
    }
  }, [selectedGroup]);

  const handleSave = async () => {
    if (!selectedGroup) return;

    try {
      setSaving(true);
      setSaveSuccess(false);
      await updateGroupContext(selectedGroup.id, contextText);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save context:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading.groups) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading groups...</div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-yellow-900 mb-2">No Groups Found</h3>
          <p className="text-sm text-yellow-700">
            Connect to WhatsApp and sync your groups to set context.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">
          Project Context (Epic Definition)
        </h1>
        <p className="text-gray-400">
          Define the Epic/Project context for each WhatsApp group. This guides AI analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Group Selection */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              WhatsApp Groups
            </h2>
            <div className="space-y-2">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedGroup?.id === group.id
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-gray-900 text-gray-400 hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  <div className="font-medium truncate">{group.name}</div>
                  <div className="text-xs mt-1 flex items-center gap-2">
                    {group.context ? (
                      <span className="text-green-400">✓ Context set</span>
                    ) : (
                      <span className="text-yellow-400">⚠ No context</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-300">
                <div className="font-semibold mb-1">What is Context?</div>
                <div className="text-blue-400">
                  Context defines your project's Epic - the high-level strategic goal. AI uses this to understand and organize chat messages into Stories, Tasks, and Subtasks.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Context Editor */}
        <div className="lg:col-span-2">
          {selectedGroup ? (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white mb-1">
                  {selectedGroup.name}
                </h2>
                <p className="text-sm text-gray-400">
                  Define the Epic/Project context for AI analysis
                </p>
              </div>

              {/* Context Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Context (Epic Definition)
                </label>
                <textarea
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  placeholder="Example:&#10;&#10;Project: SAP S/4HANA Implementation for Manufacturing&#10;&#10;Objective: Migrate from SAP ECC to S/4HANA by Q4 2024&#10;&#10;Scope:&#10;- FI/CO module configuration&#10;- MM procurement automation&#10;- PP production planning&#10;- Integration with MES systems&#10;&#10;Key Deliverables:&#10;- Complete data migration with 100% accuracy&#10;- Train 200+ end users&#10;- Achieve <2 second response time&#10;&#10;Critical Success Factors:&#10;- Zero downtime during go-live&#10;- All transport requests properly documented&#10;- Full regression testing in QA environment"
                  className="w-full h-96 bg-gray-900 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none font-mono resize-none"
                  spellCheck={false}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-gray-500">
                    {contextText.length} characters
                  </div>
                  <div className="text-xs text-gray-500">
                    Tip: Be specific about scope, deliverables, and success criteria
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || !contextText.trim()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    saving || !contextText.trim()
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Context'}
                </button>

                {saveSuccess && (
                  <div className="text-sm text-green-400 flex items-center gap-1">
                    <span className="text-green-400">✓</span>
                    Context saved successfully!
                  </div>
                )}
              </div>

              {/* Guidelines */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  💡 Context Writing Guidelines
                </h3>
                <div className="space-y-2 text-xs text-gray-400">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 flex-shrink-0">•</span>
                    <div>
                      <span className="font-medium text-gray-300">Be Specific:</span> Include project name, objectives, scope, and timeline
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 flex-shrink-0">•</span>
                    <div>
                      <span className="font-medium text-gray-300">SAP Details:</span> Mention specific modules (FI, CO, MM, SD, PP), transaction codes, and transport requests
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 flex-shrink-0">•</span>
                    <div>
                      <span className="font-medium text-gray-300">Deliverables:</span> List key milestones, features, and acceptance criteria
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 flex-shrink-0">•</span>
                    <div>
                      <span className="font-medium text-gray-300">Constraints:</span> Note deadlines, budget limits, compliance requirements
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 flex-shrink-0">•</span>
                    <div>
                      <span className="font-medium text-gray-300">Success Criteria:</span> Define what "done" looks like for this project
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
              <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Select a group to view/edit context</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
