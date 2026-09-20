import { Router } from "express";
import type { SearchController } from "../controllers/search.controller.js";

export function createSearchRouter(searchController: SearchController) {
  const router = Router();

  router.post("/search", searchController.search);
  router.post("/rerun", searchController.rerun);
  router.post("/refine", searchController.refine);
  router.post("/freeze", searchController.freeze);

  return router;
}
