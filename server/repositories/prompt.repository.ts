import fs from "node:fs/promises";
import path from "node:path";

const promptNames = ["generate-search", "score-profiles", "refine-search"] as const;

export type PromptMap = Record<(typeof promptNames)[number], string>;

export class PromptRepository {
  constructor(private readonly promptDir: string) {}

  async loadAll(): Promise<PromptMap> {
    const entries = await Promise.all(
      promptNames.map(async (name) => [
        name,
        await fs.readFile(path.join(this.promptDir, `${name}.md`), "utf8"),
      ] as const),
    );

    return Object.fromEntries(entries) as PromptMap;
  }
}
