import "dotenv/config";
import path from "node:path";

const rootDir = process.cwd();

export const config = {
  port: process.env.PORT || 3001,
  isProduction: process.env.NODE_ENV === "production",
  paths: {
    root: rootDir,
    profiles: path.join(rootDir, "data", "profiles.json"),
    prompts: path.join(rootDir, "prompts"),
    dist: path.join(rootDir, "dist"),
  },
  llm: {
    provider: (process.env.LLM_PROVIDER || "gemini").toLowerCase(),
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    },
  },
};
