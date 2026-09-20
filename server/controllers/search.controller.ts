import type { Request, Response } from "express";
import { AppError } from "../utils/app-error.js";
import type { SearchService } from "../services/search.service.js";

export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  search = async (req: Request, res: Response) => {
    await this.handle(res, async () => this.searchService.start(req.body.requirement));
  };

  rerun = async (req: Request, res: Response) => {
    await this.handle(res, async () => this.searchService.rerun(req.body));
  };

  refine = async (req: Request, res: Response) => {
    await this.handle(res, async () => this.searchService.refine(req.body));
  };

  freeze = async (req: Request, res: Response) => {
    await this.handle(res, async () => this.searchService.freeze(req.body));
  };

  async handle(res: Response, action: () => Promise<unknown> | unknown) {
    try {
      res.json(await action());
    } catch (error: unknown) {
      const status = error instanceof AppError ? error.status : 500;
      res.status(status).json({
        error: error instanceof Error ? error.message : "Something went wrong.",
      });
    }
  }
}
