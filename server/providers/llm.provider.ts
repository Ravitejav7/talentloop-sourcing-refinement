import { GeminiProvider } from "./gemini.provider.js";
import { OpenAiProvider } from "./openai.provider.js";
import type { LlmProvider } from "../types/domain.js";

type LlmConfig = {
  provider: string;
  gemini: {
    apiKey?: string;
    model: string;
  };
  openai: {
    apiKey?: string;
    model: string;
  };
};

export function createLlmProvider(config: LlmConfig): LlmProvider {
  if (config.provider === "openai") {
    return new OpenAiProvider(config.openai);
  }

  return new GeminiProvider(config.gemini);
}
