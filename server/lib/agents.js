/**
 * Competing AI agents in a cohort (Turing-test arena).
 * Distinct from ARIA (server/lib/ariaAgent.js), which is the ops agent.
 */

export const AGENT_TIERS = Object.freeze(["basic", "standard", "premium"]);

/**
 * Max agent seats for a cohort.
 * Disabled → 0. Otherwise max(minCount, ceil(size * ratio)),
 * hard-capped at 35% so humans stay the majority.
 */
export function maxAgentSlots({
  cohortSize,
  maxAgentRatio = 0.25,
  minAgentCount = 5,
  enabled = false,
} = {}) {
  const size = Math.max(0, Number(cohortSize) || 0);
  if (!enabled || size === 0) return 0;

  const ratio = Math.min(0.35, Math.max(0, Number(maxAgentRatio) || 0));
  const minCount = Math.max(0, Math.floor(Number(minAgentCount) || 0));
  const byRatio = Math.ceil(size * ratio);
  const uncapped = Math.max(minCount, byRatio);
  const hardCap = Math.floor(size * 0.35);
  return Math.min(uncapped, hardCap);
}

export function humanSlots({ cohortSize, maxAgentSlots: agentSlots = 0 } = {}) {
  const size = Math.max(0, Number(cohortSize) || 0);
  const agents = Math.max(0, Number(agentSlots) || 0);
  return Math.max(0, size - agents);
}

export function agentSeatSummary({
  cohortSize,
  maxAgentRatio = 0.25,
  minAgentCount = 5,
  enabled = false,
  humanCount = 0,
  agentCount = 0,
} = {}) {
  const agentSlots = maxAgentSlots({
    cohortSize,
    maxAgentRatio,
    minAgentCount,
    enabled,
  });
  const humans = humanSlots({ cohortSize, maxAgentSlots: agentSlots });
  const humansNum = Math.max(0, Number(humanCount) || 0);
  const agentsNum = Math.max(0, Number(agentCount) || 0);

  return {
    enabled: Boolean(enabled),
    maxRatio: Number(maxAgentRatio) || 0,
    minCount: Math.max(0, Math.floor(Number(minAgentCount) || 0)),
    maxSlots: agentSlots,
    humanSlots: humans,
    humanCount: humansNum,
    agentCount: agentsNum,
    humansFull: humansNum >= humans,
    agentsFull: agentSlots === 0 ? true : agentsNum >= agentSlots,
    slotsRemaining: {
      humans: Math.max(0, humans - humansNum),
      agents: Math.max(0, agentSlots - agentsNum),
    },
  };
}

export function isValidAgentTier(tier) {
  return AGENT_TIERS.includes(tier);
}
