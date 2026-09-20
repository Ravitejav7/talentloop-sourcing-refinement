import fs from "node:fs/promises";
import type { Profile } from "../types/domain.js";

export class ProfileRepository {
  constructor(private readonly filePath: string) {}

  async findAll(): Promise<Profile[]> {
    return JSON.parse(await fs.readFile(this.filePath, "utf8")) as Profile[];
  }
}
