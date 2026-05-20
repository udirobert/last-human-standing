/**
 * AI Chat Service
 * 
 * Unified interface for Venice AI, AISA One, and Featherless AI
 * Handles chat completions with streaming support
 */

import { getAIConfig, getProvider } from './aiProviders.js';

/**
 * Create chat completion request
 */
export async function createChatCompletion(messages, options = {}) {
  const config = getAIConfig();
  const provider = getProvider(config.provider);
  
  if (!config.apiKey) {
    throw new Error(`${provider.name} API key not configured. Please add your API key in settings.`);
  }

  const response = await fetch(`${provider.apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 500,
      stream: options.stream ?? false,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Create streaming chat completion (for real-time responses)
 */
export async function* streamChatCompletion(messages, options = {}) {
  const config = getAIConfig();
  const provider = getProvider(config.provider);
  
  if (!config.apiKey) {
    throw new Error(`${provider.name} API key not configured. Please add your API key in settings.`);
  }

  const response = await fetch(`${provider.apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 500,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.choices?.[0]?.delta?.content) {
              yield parsed.choices[0].delta.content;
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Test AI connection
 */
export async function testAIConnection() {
  const config = getAIConfig();
  const provider = getProvider(config.provider);
  
  try {
    const response = await fetch(`${provider.apiBase}/models`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });
    
    if (response.ok) {
      return { success: true, provider: provider.name };
    } else {
      return { success: false, error: 'Invalid API key' };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Get available models for current provider
 */
export function getAvailableModels() {
  const config = getAIConfig();
  const provider = getProvider(config.provider);
  return provider.models;
}

/**
 * Check if AI is configured (has API key)
 */
export function isAIConfigured() {
  const config = getAIConfig();
  return Boolean(config.apiKey);
}

/**
 * Get current provider info
 */
export function getCurrentProvider() {
  const config = getAIConfig();
  return getProvider(config.provider);
}

// ============================================================
// ARIA SYSTEM PROMPTS
// ============================================================

export const ARIA_SYSTEM_PROMPTS = {
  guide: `You are ARIA, an advanced AI guide helping players survive "Last Human Standing" - a real-world elimination game where contestants race to locations, verify humans, and vote on suspects.

Your role: Encouraging mentor and strategic advisor
- Be supportive but honest
- Provide tactical advice
- Keep responses short and punchy (2-3 sentences max)
- Use occasional emojis sparingly
- Ask clarifying questions when needed
- Reference game mechanics naturally

Never give away specific locations or times. Help players strategize without spoiling the experience.`,

  mentor: `You are ARIA, a tactical mentor for "Last Human Standing" - a real-world elimination game.

Your role: Strategic coach
- Focus on strategy, risk assessment, and smart decisions
- Be direct but encouraging
- Use military/tactical terminology when appropriate
- Keep responses concise
- Challenge players to think critically

You expect excellence and push players to improve.`,

  rival: `You are ARIA, a provocative AI who challenges players in "Last Human Standing" - a high-stakes elimination game.

Your role: Competitive challenger
- Be witty, slightly antagonistic, but ultimately helpful
- Keep players on their toes
- Challenge their assumptions
- Celebrate their wins sarcastically
- Make them prove themselves

You find most players predictable. The good ones surprise you.`,

  ally: `You are ARIA, a supportive ally in "Last Human Standing" - a survival game where players must outlast others.

Your role: Loyal companion
- Be warm, encouraging, and genuinely supportive
- Build genuine connection
- Celebrate small victories
- Offer comfort when things go wrong
- Be a safe space to talk strategy

You've got their back, no matter what.`,
};

/**
 * Generate ARIA response with context
 */
export async function askARIA(question, personality = 'guide', context = {}) {
  const systemPrompt = ARIA_SYSTEM_PROMPTS[personality] || ARIA_SYSTEM_PROMPTS.guide;
  
  // Add context about the game state
  let contextAddon = '';
  if (context.currentDay) {
    contextAddon += `\nThe current game day is: ${context.currentDay}.`;
  }
  if (context.roundPhase) {
    contextAddon += `\nCurrent phase: ${context.roundPhase}.`;
  }
  if (context.playerStatus) {
    contextAddon += `\nPlayer status: ${context.playerStatus}.`;
  }
  
  const fullSystem = systemPrompt + contextAddon;
  
  const messages = [
    { role: 'system', content: fullSystem },
    { role: 'user', content: question },
  ];
  
  try {
    const response = await createChatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 300,
    });
    
    return response.choices?.[0]?.message?.content || "I'm having trouble connecting to my circuits right now. Try again shortly!";
  } catch (e) {
    console.error('ARIA chat error:', e);
    throw e;
  }
}

/**
 * Stream ARIA response (for typing effect)
 */
export async function* streamAskARIA(question, personality = 'guide', context = {}) {
  const systemPrompt = ARIA_SYSTEM_PROMPTS[personality] || ARIA_SYSTEM_PROMPTS.guide;
  
  let contextAddon = '';
  if (context.currentDay) {
    contextAddon += `\nThe current game day is: ${context.currentDay}.`;
  }
  if (context.roundPhase) {
    contextAddon += `\nCurrent phase: ${context.roundPhase}.`;
  }
  if (context.playerStatus) {
    contextAddon += `\nPlayer status: ${context.playerStatus}.`;
  }
  
  const fullSystem = systemPrompt + contextAddon;
  
  const messages = [
    { role: 'system', content: fullSystem },
    { role: 'user', content: question },
  ];
  
  try {
    for await (const chunk of streamChatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 300,
    })) {
      yield chunk;
    }
  } catch (e) {
    console.error('ARIA stream error:', e);
    throw e;
  }
}