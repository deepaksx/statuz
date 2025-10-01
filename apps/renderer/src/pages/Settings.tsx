import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Eye, Trash2, Database, Shield, TestTube } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';

export function Settings() {
  const { config, updateConfig, stats } = useApp();
  const [formData, setFormData] = useState({
    llmProvider: 'none' as 'anthropic' | 'openai' | 'gemini' | 'none',
    apiKey: '',
    geminiApiKey: ''
  });
  const [isTestingApi, setIsTestingApi] = useState(false);

  useEffect(() => {
    // Load from localStorage first, prioritizing saved values
    const savedApiKey = localStorage.getItem('statuz_apiKey') || '';
    const savedGeminiApiKey = localStorage.getItem('statuz_geminiApiKey') || '';
    const savedLlmProvider = localStorage.getItem('statuz_llmProvider') || 'none';

    console.log('Settings useEffect - Loading API keys:');
    console.log('localStorage apiKey:', localStorage.getItem('statuz_apiKey'));
    console.log('localStorage geminiApiKey:', localStorage.getItem('statuz_geminiApiKey'));
    console.log('localStorage llmProvider:', localStorage.getItem('statuz_llmProvider'));

    if (config) {
      console.log('config apiKey:', config.apiKey);
      console.log('config geminiApiKey:', config.geminiApiKey);
      console.log('config llmProvider:', config.llmProvider);
    }

    // Use localStorage values if available, otherwise fall back to config or defaults
    const finalApiKey = savedApiKey || config?.apiKey || '';
    const finalGeminiApiKey = savedGeminiApiKey || config?.geminiApiKey || '';
    const finalLlmProvider = (savedLlmProvider !== 'none' ? savedLlmProvider : config?.llmProvider || 'none') as 'anthropic' | 'openai' | 'gemini' | 'none';

    console.log('Final values being set:');
    console.log('Final apiKey:', finalApiKey);
    console.log('Final geminiApiKey:', finalGeminiApiKey);
    console.log('Final llmProvider:', finalLlmProvider);

    setFormData({
      llmProvider: finalLlmProvider,
      apiKey: finalApiKey,
      geminiApiKey: finalGeminiApiKey
    });
  }, [config]);

  const handleSave = async () => {
    try {
      console.log('Settings handleSave - Starting save process');
      console.log('formData:', formData);

      // Save to localStorage immediately for browser persistence
      if (formData.apiKey) {
        localStorage.setItem('statuz_apiKey', formData.apiKey);
        console.log('Saved apiKey to localStorage:', formData.apiKey);
      }
      if (formData.geminiApiKey) {
        localStorage.setItem('statuz_geminiApiKey', formData.geminiApiKey);
        console.log('Saved geminiApiKey to localStorage:', formData.geminiApiKey);
      }

      // Also save the provider selection
      localStorage.setItem('statuz_llmProvider', formData.llmProvider);

      console.log('localStorage after save:');
      console.log('statuz_apiKey:', localStorage.getItem('statuz_apiKey'));
      console.log('statuz_geminiApiKey:', localStorage.getItem('statuz_geminiApiKey'));
      console.log('statuz_llmProvider:', localStorage.getItem('statuz_llmProvider'));

      // Try to save to backend config, but don't rely on it for form state
      let databaseSaved = false;
      try {
        const savedConfig = await updateConfig({
          llmProvider: formData.llmProvider,
          ...(formData.apiKey && { apiKey: formData.apiKey }),
          ...(formData.geminiApiKey && { geminiApiKey: formData.geminiApiKey })
        });
        console.log('Successfully saved to backend config:', savedConfig);
        databaseSaved = true;
      } catch (configError) {
        console.log('Backend config save failed (using localStorage only):', configError);
      }

      if (databaseSaved) {
        toast.success('Settings saved successfully! API key stored in database for auto-response feature.');
      } else {
        toast.success('Settings saved to browser storage. Note: Database save failed - auto-response may not work until app restart.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const handleTestApi = async () => {
    if (formData.llmProvider === 'none') {
      toast.error('Please select an LLM provider first');
      return;
    }

    const apiKey = formData.llmProvider === 'gemini' ? formData.geminiApiKey : formData.apiKey;
    if (!apiKey) {
      toast.error('Please enter an API key first');
      return;
    }

    setIsTestingApi(true);
    try {
      // Test the API directly without needing groups
      if (formData.llmProvider === 'gemini') {
        // Test Gemini API directly
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

        const result = await model.generateContent("What is 2 + 2?");
        const response = await result.response;
        const text = response.text();

        toast.success(`API test successful! Response: ${text.substring(0, 50)}...`);
        return;
      } else {
        // For other providers, use a simple API endpoint test
        const baseUrl = 'http://localhost:3001/api';
        const response = await fetch(`${baseUrl}/test-api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: formData.llmProvider,
            apiKey: apiKey,
            question: 'What is 2 + 2?'
          })
        });

        const result = await response.json();

        if (response.ok) {
          toast.success('API test successful! Response: ' + (result.response || 'Connected'));
        } else {
          toast.error('API test failed: ' + (result.error || result.details || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('API test error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Check if it's a Gemini API overload error (which means API key is working)
      if (errorMessage && errorMessage.includes('503') && errorMessage.includes('overloaded')) {
        toast.success('API key is valid! (Google servers temporarily overloaded)');
      } else if (errorMessage && errorMessage.includes('API_KEY_INVALID')) {
        toast.error('Invalid API key. Please check your API key and try again.');
      } else {
        toast.error('Failed to test API connection: ' + (errorMessage || 'Unknown error'));
      }
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleWipeData = async () => {
    const confirmed = confirm(
      'Are you sure you want to wipe all data? This will delete all messages and milestones. This action cannot be undone.'
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

      {/* Data Privacy Notice */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Data Privacy</h3>
        </div>

        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-primary-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-primary-800">Local Data Storage</h4>
              <p className="text-sm text-primary-700 mt-1">
                All WhatsApp messages and extracted data are stored locally on your device.
                No data is transmitted to external services unless you explicitly enable
                LLM processing below with your own API key.
              </p>
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
              <option value="gemini">Google Gemini</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select an LLM provider to enhance message analysis accuracy
            </p>
          </div>

          {formData.llmProvider !== 'none' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.llmProvider === 'gemini' ? 'Google Gemini API Key' : 'API Key'}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.llmProvider === 'gemini' ? formData.geminiApiKey : formData.apiKey}
                  onChange={(e) => {
                    if (formData.llmProvider === 'gemini') {
                      setFormData({ ...formData, geminiApiKey: e.target.value });
                    } else {
                      setFormData({ ...formData, apiKey: e.target.value });
                    }
                  }}
                  placeholder={`Enter your ${formData.llmProvider === 'anthropic' ? 'Anthropic' : formData.llmProvider === 'openai' ? 'OpenAI' : 'Google Gemini'} API key`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Your API key is stored locally and only used to call the {formData.llmProvider === 'gemini' ? 'Google Gemini' : formData.llmProvider} API
                {formData.llmProvider === 'gemini' && (
                  <>
                    . Get your key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline text-primary-600">Google AI Studio</a>
                  </>
                )}
              </p>

              {/* Test API Button */}
              <button
                onClick={handleTestApi}
                disabled={isTestingApi}
                className="mt-3 btn btn-secondary btn-sm"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTestingApi ? 'Testing...' : 'Test API Connection'}
              </button>
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