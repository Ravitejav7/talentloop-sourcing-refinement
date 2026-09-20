import { AppError } from "../utils/app-error.js";
import { parseJsonResponse } from "../utils/json.js";
import type { LlmProvider, LlmRequest } from "../types/domain.js";

type OpenAiConfig = {
  apiKey?: string;
  model: string;
};

export class OpenAiProvider implements LlmProvider {
  constructor(private readonly config: OpenAiConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  async completeJson<T>({ system, payload }: LlmRequest): Promise<T> {
    if (!this.config.apiKey) {
      throw new AppError(
        503,
        "Missing OPENAI_API_KEY. Codex access does not automatically provide an API key to this app.",
      );
    }

    return withTimeout(async (signal) => {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        signal,
        body: JSON.stringify({
          model: this.config.model,
          temperature: 0.2,
          input: [
            { role: "system", content: system },
            {
              role: "user",
              content: `INPUT JSON:\n${JSON.stringify(payload, null, 2)}`,
            },
          ],
          text: {
            format: { type: "json_object" },
          },
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = body?.error?.message || `OpenAI request failed with status ${response.status}.`;
        throw new AppError(response.status === 429 ? 429 : 502, message);
      }

      return parseJsonResponse<T>(extractOutputText(body));
    }, "OpenAI");
  }
}

function extractOutputText(body: unknown): string | undefined {
  if (!isRecord(body)) return undefined;
  if (typeof body.output_text === "string") return body.output_text;

  return (Array.isArray(body.output) ? body.output : [])
    .flatMap((item) => (isRecord(item) && Array.isArray(item.content) ? item.content : []))
    .map((content) => (isRecord(content) && typeof content.text === "string" ? content.text : ""))
    ?.filter(Boolean)
    ?.join("\n");
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
