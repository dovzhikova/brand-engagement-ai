import { useState, useEffect } from 'react';
import { useAuthStore } from '../hooks/useAuthStore';
import { settingsApi } from '../services/api';
import PageHeader from '../components/PageHeader';
import { Alert, FormField, Select, ButtonSpinner, LoadingSpinner, Badge, Toggle, InlineTimePicker } from '../components/ui';
import { useReminderNotifications } from '../hooks/useReminderNotifications';
import { ReminderType } from '../services/localNotificationService';
import { Bell, BellOff, AlertTriangle, Sun, Coffee, Utensils, PartyPopper } from 'lucide-react';
import ReferralCard from '../components/referral/ReferralCard';

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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <p className="mt-1 text-gray-900 dark:text-gray-100">{user?.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <p className="mt-1 text-gray-900 dark:text-gray-100">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
            <Badge variant="info" className="mt-1 capitalize">{user?.role}</Badge>
          </div>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">AI Configuration</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
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

      {/* Invite & Earn Referrals */}
      <ReferralCard />

      {/* Decision Reminders */}
      <DecisionRemindersCard />

      {/* Business Rules */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Business Rules</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-carol-100 dark:bg-carol-900/30 text-carol-600 dark:text-carol-400 flex items-center justify-center text-xs font-bold mr-3">1</span>
            <p className="text-gray-700 dark:text-gray-300"><strong>80/20 Rule:</strong> Responses must be max 80% value content, 20% product mention</p>
          </div>
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-carol-100 dark:bg-carol-900/30 text-carol-600 dark:text-carol-400 flex items-center justify-center text-xs font-bold mr-3">2</span>
            <p className="text-gray-700 dark:text-gray-300"><strong>Relevance Threshold:</strong> Only generate drafts for posts with relevance score {'>='} 6</p>
          </div>
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-carol-100 dark:bg-carol-900/30 text-carol-600 dark:text-carol-400 flex items-center justify-center text-xs font-bold mr-3">3</span>
            <p className="text-gray-700 dark:text-gray-300"><strong>Account Warm-up:</strong> New accounts start in warming_up status for 14 days</p>
          </div>
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-carol-100 dark:bg-carol-900/30 text-carol-600 dark:text-carol-400 flex items-center justify-center text-xs font-bold mr-3">4</span>
            <p className="text-gray-700 dark:text-gray-300"><strong>Rate Limits:</strong> Max 10 posts per account per day to avoid spam flags</p>
          </div>
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-carol-100 dark:bg-carol-900/30 text-carol-600 dark:text-carol-400 flex items-center justify-center text-xs font-bold mr-3">5</span>
            <p className="text-gray-700 dark:text-gray-300"><strong>Disclosure:</strong> If subreddit rules require, disclose CAROL affiliation</p>
          </div>
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-carol-100 dark:bg-carol-900/30 text-carol-600 dark:text-carol-400 flex items-center justify-center text-xs font-bold mr-3">6</span>
            <p className="text-gray-700 dark:text-gray-300"><strong>No Medical Claims:</strong> Never make health claims not backed by cited research</p>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">About</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          CAROL Bike Reddit Engagement Platform v1.0.0
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          A platform for managing Reddit engagement with persona-based AI response generation.
        </p>
      </div>
    </div>
  );
}

// Reminder configuration with icons and descriptions
interface ReminderRowConfig {
  type: ReminderType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const REMINDER_CONFIGS: ReminderRowConfig[] = [
  {
    type: 'morning',
    label: 'Morning Reminder',
    description: "Start your day with a breakfast decision",
    icon: <Sun className="h-5 w-5 text-amber-500" />,
  },
  {
    type: 'lunch',
    label: 'Lunch Reminder',
    description: 'Get help deciding where to eat',
    icon: <Coffee className="h-5 w-5 text-orange-500" />,
  },
  {
    type: 'dinner',
    label: 'Dinner Reminder',
    description: 'Never wonder what\'s for dinner again',
    icon: <Utensils className="h-5 w-5 text-red-500" />,
  },
  {
    type: 'weekend',
    label: 'Weekend Reminder',
    description: 'Plan your weekend activities (Fri-Sun)',
    icon: <PartyPopper className="h-5 w-5 text-purple-500" />,
  },
];

function DecisionRemindersCard() {
  const {
    preferences,
    permissionStatus,
    isSupported,
    isLoading,
    requestPermission,
    updateReminder,
    updateReminderTime,
    testNotification,
  } = useReminderNotifications();

  const [testingType, setTestingType] = useState<ReminderType | null>(null);

  const handleToggle = async (type: ReminderType, enabled: boolean) => {
    await updateReminder(type, enabled);
  };

  const handleTimeChange = (type: ReminderType, time: string) => {
    updateReminderTime(type, time);
  };

  const handleTest = async (type: ReminderType) => {
    setTestingType(type);
    await testNotification(type);
    setTestingType(null);
  };

  const getReminderEnabled = (type: ReminderType): boolean => {
    switch (type) {
      case 'morning': return preferences.morningEnabled;
      case 'lunch': return preferences.lunchEnabled;
      case 'dinner': return preferences.dinnerEnabled;
      case 'weekend': return preferences.weekendEnabled;
    }
  };

  const getReminderTime = (type: ReminderType): string => {
    switch (type) {
      case 'morning': return preferences.morningTime;
      case 'lunch': return preferences.lunchTime;
      case 'dinner': return preferences.dinnerTime;
      case 'weekend': return preferences.weekendTime;
    }
  };

  // Browser doesn't support notifications
  if (!isSupported) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <BellOff className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Decision Reminders
          </h2>
        </div>
        <Alert variant="warning">
          Your browser doesn't support notifications. Try using a modern browser like Chrome, Firefox, or Edge.
        </Alert>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-2">
        <Bell className="h-5 w-5 text-carol-600 dark:text-carol-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Decision Reminders
        </h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Set up daily reminders to help build your decision-making habits.
      </p>

      {/* Permission Banner */}
      {permissionStatus === 'denied' && (
        <Alert variant="error" className="mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Notifications blocked</p>
              <p className="text-sm mt-1">
                Please enable notifications in your browser settings to use reminders.
              </p>
            </div>
          </div>
        </Alert>
      )}

      {permissionStatus === 'default' && (
        <Alert variant="info" className="mb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Enable notifications</p>
              <p className="text-sm mt-1">
                Allow notifications to receive daily decision reminders.
              </p>
            </div>
            <button
              onClick={requestPermission}
              className="btn btn-primary btn-sm whitespace-nowrap"
            >
              Enable
            </button>
          </div>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-4">
          {REMINDER_CONFIGS.map((config) => {
            const enabled = getReminderEnabled(config.type);
            const time = getReminderTime(config.type);
            const isDisabled = permissionStatus !== 'granted';

            return (
              <div
                key={config.type}
                className={`
                  flex items-center gap-4 p-4 rounded-lg border
                  ${enabled ? 'bg-carol-50/50 dark:bg-carol-900/10 border-carol-200 dark:border-carol-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'}
                  ${isDisabled ? 'opacity-60' : ''}
                  transition-colors
                `}
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {config.icon}
                </div>

                {/* Label and description */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {config.label}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {config.description}
                  </div>
                </div>

                {/* Time picker */}
                <InlineTimePicker
                  value={time}
                  onChange={(newTime) => handleTimeChange(config.type, newTime)}
                  disabled={isDisabled || !enabled}
                />

                {/* Test button */}
                <button
                  onClick={() => handleTest(config.type)}
                  disabled={isDisabled || testingType === config.type}
                  className="text-sm text-carol-600 dark:text-carol-400 hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {testingType === config.type ? 'Sending...' : 'Test'}
                </button>

                {/* Toggle */}
                <Toggle
                  checked={enabled}
                  onChange={(checked) => handleToggle(config.type, checked)}
                  disabled={isDisabled}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Info about web notifications */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
        Note: Web notifications require this page to be open. For background notifications, install the mobile app.
      </p>
    </div>
  );
}
