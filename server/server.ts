import express from "express";
import path from "node:path";
import { config } from "./config/env.js";
import { createSearchRouter } from "./routes/search.routes.js";
import { ProfileRepository } from "./repositories/profile.repository.js";
import { PromptRepository } from "./repositories/prompt.repository.js";
import { createLlmProvider } from "./providers/llm.provider.js";
import { SearchService } from "./services/search.service.js";
import { SearchController } from "./controllers/search.controller.js";

export async function createServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  const profileRepository = new ProfileRepository(config.paths.profiles);
  const promptRepository = new PromptRepository(config.paths.prompts);

  const [profiles, prompts] = await Promise.all([
    profileRepository.findAll(),
    promptRepository.loadAll(),
  ]);

  const llmProvider = createLlmProvider(config.llm);
  const searchService = new SearchService({ profiles, prompts, llmProvider });
  const searchController = new SearchController(searchService);

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      profileCount: profiles.length,
      llmProvider: config.llm.provider,
      llmConfigured: llmProvider.isConfigured(),
    });
  });

  app.use("/api", createSearchRouter(searchController));

  if (config.isProduction) {
    app.use(express.static(config.paths.dist));
    app.get("*splat", (_req, res) => {
      res.sendFile(path.join(config.paths.dist, "index.html"));
    });
  }

  return app;
}
