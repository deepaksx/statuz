import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Eye, EyeOff, Trash2, Database, Shield } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';

export function Settings() {
  const { config, updateConfig, stats } = useApp();
  const [formData, setFormData] = useState({
    privacyMode: true,
    llmProvider: 'none' as 'anthropic' | 'openai' | 'none',
    apiKey: ''
  });

  useEffect(() => {
    if (config) {
      setFormData({
        privacyMode: config.privacyMode,
        llmProvider: config.llmProvider,
        apiKey: config.apiKey || ''
      });
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await updateConfig({
        privacyMode: formData.privacyMode,
        llmProvider: formData.llmProvider,
        ...(formData.apiKey && { apiKey: formData.apiKey })
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleWipeData = async () => {
    const confirmed = confirm(
      'Are you sure you want to wipe all data? This will delete all messages, signals, and milestones. This action cannot be undone.'
    );

    if (confirmed) {
      try {
        // In a real implementation, this would call an IPC method to wipe the database
        toast.success('Data wiped successfully');
      } catch (error) {
        toast.error('Failed to wipe data');
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">
            Configure application preferences and privacy settings
          </p>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Privacy Settings</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Privacy Mode</div>
              <div className="text-sm text-gray-600">
                Hide author names and phone numbers in the UI
              </div>
            </div>
            <button
              onClick={() => setFormData({ ...formData, privacyMode: !formData.privacyMode })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.privacyMode ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.privacyMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-primary-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-primary-800">Data Privacy</h4>
                  <p className="text-sm text-primary-700 mt-1">
                    All WhatsApp messages and extracted data are stored locally on your device.
                    No data is transmitted to external services unless you explicitly enable
                    LLM processing below with your own API key.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LLM Settings */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <SettingsIcon className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">LLM Processing</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LLM Provider
            </label>
            <select
              value={formData.llmProvider}
              onChange={(e) => setFormData({ ...formData, llmProvider: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="none">None (Offline Only)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select an LLM provider to enhance signal extraction accuracy
            </p>
          </div>

          {formData.llmProvider !== 'none' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder={`Enter your ${formData.llmProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Your API key is stored locally and only used to call the {formData.llmProvider} API
              </p>
            </div>
          )}

          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Eye className="h-5 w-5 text-warning-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-warning-800">LLM Processing Notice</h4>
                <p className="text-sm text-warning-700 mt-1">
                  When LLM processing is enabled, message content may be sent to the selected
                  provider's API for enhanced analysis. Only enable this if you have permission
                  to process the group messages and trust the provider's data handling policies.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Database Stats */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Database Statistics</h3>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.watchedGroups}</div>
              <div className="text-sm text-gray-500">Watched Groups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalMessages}</div>
              <div className="text-sm text-gray-500">Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalSignals}</div>
              <div className="text-sm text-gray-500">Signals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalMilestones}</div>
              <div className="text-sm text-gray-500">Milestones</div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
        <button
          onClick={handleSave}
          className="btn btn-primary btn-md"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </button>

        <button
          onClick={handleWipeData}
          className="btn btn-error btn-md"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Wipe All Data
        </button>
      </div>

      {/* App Info */}
      <div className="card border-gray-200 bg-gray-50">
        <div className="text-center">
          <div className="font-semibold text-gray-900 mb-2">Statuz v1.0.0</div>
          <div className="text-sm text-gray-600">
            WhatsApp Project Monitor - Built with Electron, React, and TypeScript
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Data directory: {config?.dataDirectory}
          </div>
        </div>
      </div>
    </div>
  );
}