import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AI_PROVIDERS, getAIConfig, saveAIConfig, getProvider } from '../config/aiProviders.js';
import { testAIConnection, getAvailableModels } from '../config/aiService.js';

/**
 * AISettingsModal - Configure AI provider and API key
 * 
 * Allows users to select Venice AI, AISA One, or Featherless AI
 * and enter their API key for real AI responses
 */
export default function AISettingsModal({ isOpen, onClose }) {
  const [config, setConfig] = useState(() => getAIConfig());
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [selectedProvider, setSelectedProvider] = useState(config.provider);
  const [selectedModel, setSelectedModel] = useState(config.model);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleProviderChange = (providerId) => {
    setSelectedProvider(providerId);
    setSelectedModel(getProvider(providerId).defaultModel);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    // Temporarily save API key to test
    const tempConfig = { ...config, provider: selectedProvider, model: selectedModel, apiKey };
    saveAIConfig(tempConfig);
    
    const result = await testAIConnection();
    setTestResult(result);
    setTesting(false);
  };

  const handleSave = () => {
    const newConfig = {
      provider: selectedProvider,
      model: selectedModel,
      apiKey,
    };
    saveAIConfig(newConfig);
    setConfig(newConfig);
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      onClose();
    }, 500);
  };

  const handleClear = () => {
    const clearedConfig = { provider: DEFAULT_PROVIDER, model: 'venice-2', apiKey: '' };
    saveAIConfig(clearedConfig);
    setApiKey('');
    setSelectedProvider('venice');
    setSelectedModel('venice-2');
  };

  const DEFAULT_PROVIDER = 'venice';
  const availableModels = getAvailableModels(selectedProvider);
  const provider = getProvider(selectedProvider);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="bg-smoke border border-dim/50 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-display text-bone">AI Settings</h2>
                <p className="text-dim text-sm">Configure your AI assistant</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-smoke/50 flex items-center justify-center text-dim hover:text-bone transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Provider Selection */}
            <div className="mb-6">
              <label className="block text-bone font-medium mb-3">Select AI Provider</label>
              <div className="grid grid-cols-1 gap-3">
                {Object.values(AI_PROVIDERS).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleProviderChange(p.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedProvider === p.id
                        ? 'border-neon bg-neon/10'
                        : 'border-dim/30 bg-smoke/50 hover:border-dim/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.icon}</span>
                      <div>
                        <p className="text-bone font-medium">{p.name}</p>
                        <p className="text-dim text-xs">{p.apiBase}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selection */}
            <div className="mb-6">
              <label className="block text-bone font-medium mb-3">Select Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-3 bg-smoke/50 border border-dim/30 rounded-xl text-bone focus:outline-none focus:border-neon"
              >
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} - {model.description}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key Input */}
            <div className="mb-6">
              <label className="block text-bone font-medium mb-2">
                API Key for {provider.name}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key..."
                className="w-full px-4 py-3 bg-smoke/50 border border-dim/30 rounded-xl text-bone placeholder:text-dim/50 focus:outline-none focus:border-neon"
              />
              <p className="text-dim text-xs mt-2">
                Get your API key from {provider.name}'s dashboard
              </p>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`mb-4 p-3 rounded-xl ${
                testResult.success 
                  ? 'bg-neon/20 border border-neon/30' 
                  : 'bg-blood/20 border border-blood/30'
              }`}>
                <div className="flex items-center gap-2">
                  <span>{testResult.success ? '✅' : '❌'}</span>
                  <span className="text-bone text-sm">
                    {testResult.success 
                      ? `Connected to ${testResult.provider}` 
                      : testResult.error}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleTest}
                disabled={!apiKey || testing}
                className="flex-1 px-4 py-3 bg-smoke/50 text-bone rounded-xl border border-dim/30 hover:border-neon/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={handleSave}
                disabled={!apiKey}
                className="flex-1 px-4 py-3 bg-neon text-ash font-bold rounded-xl hover:bg-neon/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saved!' : 'Save'}
              </button>
            </div>

            {/* Clear Settings */}
            {config.apiKey && (
              <button
                onClick={handleClear}
                className="w-full mt-3 px-4 py-2 text-dim text-sm hover:text-bone transition-colors"
              >
                Clear AI Settings
              </button>
            )}

            {/* Info */}
            <div className="mt-4 p-3 bg-smoke/30 rounded-xl border border-dim/20">
              <p className="text-dim text-xs">
                <span className="text-ember">💡</span> Without an API key, ARIA will use demo responses. 
                Adding your API key enables real AI-powered conversations with dynamic, 
                context-aware responses.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * AIStatusBadge - Shows current AI configuration status
 */
export function AIStatusBadge({ compact = false }) {
  const config = getAIConfig();
  const provider = getProvider(config.provider);
  const configured = Boolean(config.apiKey);

  if (compact) {
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
        configured ? 'bg-neon/20 text-neon' : 'bg-smoke/50 text-dim'
      }`}>
        <span>{provider.icon}</span>
        <span>{configured ? 'AI' : 'Demo'}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
      configured 
        ? 'bg-neon/10 border-neon/30' 
        : 'bg-smoke/30 border-dim/20'
    }`}>
      <span className="text-xl">{provider.icon}</span>
      <div>
        <p className="text-bone text-sm font-medium">{provider.name}</p>
        <p className="text-dim text-xs">
          {configured ? 'Connected' : 'Demo Mode'}
        </p>
      </div>
    </div>
  );
}