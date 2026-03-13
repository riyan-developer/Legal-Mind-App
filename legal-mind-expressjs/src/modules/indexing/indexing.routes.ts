import { Router } from "express";
import { receiveIndexedChunks, receiveIndexingResult } from "./indexing.controller";
import { requireInternalApiKey } from "./indexing.middleware.js";

const router = Router();

router.use(requireInternalApiKey);

router.post("/chunks", receiveIndexedChunks);
router.post("/result", receiveIndexingResult);

export default router;
