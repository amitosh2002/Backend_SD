import {  platformKeyValuesPairs } from "../controllers/KeyValuePairs/keyValueControllers.js";
// import { authenticateToken } from "../middleware/authMiddleware.js";
import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";

const keyValueRoute= express.Router();



keyValueRoute.get("/key-values", authenticateToken,platformKeyValuesPairs);
export default keyValueRoute;