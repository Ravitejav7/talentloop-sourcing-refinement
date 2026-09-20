import { AppError } from "../utils/app-error.js";
import { parseJsonResponse } from "../utils/json.js";
import type { LlmProvider, LlmRequest } from "../types/domain.js";

type GeminiConfig = {
  apiKey?: string;
  model: string;
};

export class GeminiProvider implements LlmProvider {
  constructor(private readonly config: GeminiConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  async completeJson<T>({ system, payload }: LlmRequest): Promise<T> {
    if (!this.config.apiKey) {
      throw new AppError(
        503,
        "Missing GEMINI_API_KEY. Add it to .env or your shell environment, then restart the server.",
      );
    }

    return withTimeout(async (signal) => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
            contents: [
              {
                role: "user",
                parts: [{ text: buildPrompt(system, payload) }],
              },
            ],
          }),
        },
      );

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = body?.error?.message || `Gemini request failed with status ${response.status}.`;
        throw new AppError(response.status === 429 ? 429 : 502, message);
      }

      return parseJsonResponse<T>(body?.candidates?.[0]?.content?.parts?.[0]?.text);
    }, "Gemini");
  }
}

function buildPrompt(system: string, payload: unknown): string {
  return `${system}\n\nINPUT JSON:\n${JSON.stringify(payload, null, 2)}`;
}

async function withTimeout<T>(
  action: (signal: AbortSignal) => Promise<T>,
  providerName: string,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    return await action(controller.signal);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(504, "The LLM took too long to respond. Please retry.");
    }
    if (error instanceof AppError) throw error;
    throw new AppError(502, `Could not reach ${providerName}. Check your network and API key.`);
  } finally {
    clearTimeout(timeout);
  }
}
