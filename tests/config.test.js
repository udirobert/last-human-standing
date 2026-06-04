// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  AI_PROVIDERS,
  DEFAULT_PROVIDER,
  getAIConfig,
  saveAIConfig,
  getProvider,
  getModel,
} from "../src/config/aiProviders.js";
import {
  HUMANITY_PROVIDERS,
  ENTRY_FEE_WLD,
  getLiveHumanityProviders,
  isProviderEnabled,
} from "../src/config/humanityProviders.js";

describe("AI providers config", () => {
  beforeEach(() => {
    try {
      localStorage.removeItem("lhs_ai_config");
    } catch {
      // ignore
    }
  });

  it("exports a venice provider with a default model", () => {
    expect(AI_PROVIDERS.venice).toBeDefined();
    expect(AI_PROVIDERS.venice.defaultModel).toBe("venice-2");
    expect(AI_PROVIDERS.venice.models.length).toBeGreaterThan(0);
  });

  it("defaults to venice provider", () => {
    expect(DEFAULT_PROVIDER).toBe("venice");
    const config = getAIConfig();
    expect(config.provider).toBe("venice");
    expect(config.model).toBe("venice-2");
  });

  it("returns stored config when present", () => {
    saveAIConfig({ provider: "aisa", model: "aisa-claude", apiKey: "secret" });
    const config = getAIConfig();
    expect(config.provider).toBe("aisa");
    expect(config.model).toBe("aisa-claude");
    expect(config.apiKey).toBe("secret");
  });

  it("falls back to default provider for unknown ids", () => {
    const provider = getProvider("nonexistent");
    expect(provider.id).toBe("venice");
  });

  it("falls back to first model for unknown model ids", () => {
    const model = getModel("aisa", "unknown-model");
    expect(model.id).toBe(AI_PROVIDERS.aisa.models[0].id);
  });

  it("getModel returns the requested model when it exists", () => {
    const model = getModel("aisa", "aisa-gpt");
    expect(model.id).toBe("aisa-gpt");
  });
});

describe("Humanity providers config", () => {
  it("exposes a world provider marked live", () => {
    expect(HUMANITY_PROVIDERS.world.id).toBe("world");
    expect(HUMANITY_PROVIDERS.world.status).toBe("live");
  });

  it("exposes a self provider marked live for Celo integration", () => {
    expect(HUMANITY_PROVIDERS.self.id).toBe("self");
    expect(HUMANITY_PROVIDERS.self.status).toBe("live");
  });

  it("returns both live providers from getLiveHumanityProviders", () => {
    const live = getLiveHumanityProviders();
    expect(live.some((p) => p.id === "world")).toBe(true);
    expect(live.some((p) => p.id === "self")).toBe(true);
  });

  it("isProviderEnabled returns false for providers when env var is not set", () => {
    // VITE_ENABLE_SELF is not set in test env, so Self provider is disabled
    expect(isProviderEnabled(HUMANITY_PROVIDERS.self)).toBe(false);
  });

  it("ENTRY_FEE_WLD is a positive number", () => {
    expect(typeof ENTRY_FEE_WLD).toBe("number");
    expect(ENTRY_FEE_WLD).toBeGreaterThan(0);
  });
});
