import { useState, useEffect } from 'react';
import { useAuthStore } from '../hooks/useAuthStore';
import { settingsApi } from '../services/api';
import PageHeader from '../components/PageHeader';
import { Alert, FormField, Select, ButtonSpinner, LoadingSpinner, Badge } from '../components/ui';

interface AvailableModels {
  anthropic: string[];
  openai: string[];
  google: string[];
}

interface AISettings {
  aiProvider: string;
  aiModel: string;
  availableModels: AvailableModels;
}

export default function Settings() {
  const { user } = useAuthStore();
  const [aiSettings, setAISettings] = useState<AISettings | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('anthropic');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsApi.get();
      const data = response.data as AISettings;
      setAISettings(data);
      setSelectedProvider(data.aiProvider);
      setSelectedModel(data.aiModel);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    // Set default model for the provider
    if (aiSettings?.availableModels) {
      const models = aiSettings.availableModels[provider as keyof AvailableModels];
      if (models && models.length > 0) {
        setSelectedModel(models[0]);
      }
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const response = await settingsApi.update({
        aiProvider: selectedProvider,
        aiModel: selectedModel,
      });
      const data = response.data as AISettings;
      setAISettings(data);
      setMessage({ type: 'success', text: 'AI settings saved successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const availableModels = aiSettings?.availableModels?.[selectedProvider as keyof AvailableModels] || [];
  const hasChanges = aiSettings && (selectedProvider !== aiSettings.aiProvider || selectedModel !== aiSettings.aiModel);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Settings"
        description="Manage your account and application settings"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Configuration' }]}
      />

      {/* Profile Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Name</label>
            <p className="mt-1 text-surface-900 dark:text-surface-100">{user?.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Email</label>
            <p className="mt-1 text-surface-900 dark:text-surface-100">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Role</label>
            <Badge variant="info" className="mt-1 capitalize">{user?.role}</Badge>
          </div>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-4">AI Configuration</h2>
        <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
          Choose which AI provider and model to use for generating and analyzing content.
        </p>

        {message && (
          <Alert
            variant={message.type}
            dismissible
            onDismiss={() => setMessage(null)}
            className="mb-4"
          >
            {message.text}
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-4">
            <FormField label="AI Provider" htmlFor="provider">
              <Select
                id="provider"
                value={selectedProvider}
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (GPT)</option>
                <option value="google">Google (Gemini)</option>
              </Select>
            </FormField>

            <FormField label="Model" htmlFor="model">
              <Select
                id="model"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </Select>
            </FormField>

            <div className="pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className={`btn ${
                  hasChanges ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'
                }`}
              >
                {saving && <ButtonSpinner className="mr-2" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Business Rules */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-4">Business Rules</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold mr-3">1</span>
            <p className="text-surface-700 dark:text-surface-300"><strong>80/20 Rule:</strong> Responses must be max 80% value content, 20% product mention</p>
          </div>
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold mr-3">2</span>
            <p className="text-surface-700 dark:text-surface-300"><strong>Relevance Threshold:</strong> Only generate drafts for posts with relevance score {'>='} 6</p>
          </div>
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold mr-3">3</span>
            <p className="text-surface-700 dark:text-surface-300"><strong>Account Warm-up:</strong> New accounts start in warming_up status for 14 days</p>
          </div>
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold mr-3">4</span>
            <p className="text-surface-700 dark:text-surface-300"><strong>Rate Limits:</strong> Max 10 posts per account per day to avoid spam flags</p>
          </div>
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold mr-3">5</span>
            <p className="text-surface-700 dark:text-surface-300"><strong>Disclosure:</strong> If subreddit rules require, disclose brand affiliation</p>
          </div>
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold mr-3">6</span>
            <p className="text-surface-700 dark:text-surface-300"><strong>No Medical Claims:</strong> Never make health claims not backed by cited research</p>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-4">About</h2>
        <p className="text-sm text-surface-600 dark:text-surface-400">
          Brand Engagement Platform v1.0.0
        </p>
        <p className="text-sm text-surface-500 dark:text-surface-500 mt-2">
          A platform for managing Reddit engagement with persona-based AI response generation.
        </p>
      </div>
    </div>
  );
}
