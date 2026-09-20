import { AppError } from "./app-error.js";

export function parseJsonResponse<T = unknown>(text: unknown): T {
  if (!text) {
    throw new AppError(502, "The LLM returned an empty response.");
  }

  try {
    return JSON.parse(String(text)) as T;
  } catch {
    throw new AppError(502, "The LLM returned malformed JSON. Please retry the step.");
  }
}
