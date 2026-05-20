/**
 * AI Providers Configuration
 * 
 * Supports Venice AI, AISA One, and Featherless AI
 * Per user requirements: These are the main AI providers
 */

// Provider configurations
export const AI_PROVIDERS = {
  venice: {
    id: 'venice',
    name: 'Venice AI',
    icon: '🌊',
    color: 'blue',
    apiBase: 'https://api.venice.ai/v1',
    models: [
      { id: 'venice-2', name: 'Venice 2', description: 'Fast and capable' },
      { id: 'venice-2-flash', name: 'Venice 2 Flash', description: 'Lightning fast' },
    ],
    defaultModel: 'venice-2',
  },
  aisa: {
    id: 'aisa',
    name: 'AISA One',
    icon: '🤖',
    color: 'purple',
    apiBase: 'https://api.aisa.one/v1',
    models: [
      { id: 'aisa-claude', name: 'AISA Claude', description: 'Powered by Claude' },
      { id: 'aisa-gpt', name: 'AISA GPT', description: 'Powered by GPT' },
    ],
    defaultModel: 'aisa-claude',
  },
  featherless: {
    id: 'featherless',
    name: 'Featherless AI',
    icon: '🪶',
    color: 'amber',
    apiBase: 'https://api.featherless.ai/v1',
    models: [
      { id: 'featherless-model', name: 'Featherless', description: 'Efficient and smart' },
    ],
    defaultModel: 'featherless-model',
  },
};

// Default provider
export const DEFAULT_PROVIDER = 'venice';

// Storage keys
const AI_CONFIG_KEY = 'lhs_ai_config';

/**
 * Get stored AI configuration
 */
export function getAIConfig() {
  try {
    const saved = localStorage.getItem(AI_CONFIG_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore
  }
  return {
    provider: DEFAULT_PROVIDER,
    model: AI_PROVIDERS[DEFAULT_PROVIDER].defaultModel,
    apiKey: '',
  };
}

/**
 * Save AI configuration
 */
export function saveAIConfig(config) {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
}

/**
 * Get provider by ID
 */
export function getProvider(providerId) {
  return AI_PROVIDERS[providerId] || AI_PROVIDERS[DEFAULT_PROVIDER];
}

/**
 * Get model for provider
 */
export function getModel(providerId, modelId) {
  const provider = getProvider(providerId);
  return provider.models.find(m => m.id === modelId) || provider.models[0];
}