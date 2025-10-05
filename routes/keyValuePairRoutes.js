import {  platformKeyValuesPairs } from "../controllers/KeyValuePairs/keyValueControllers.js";
// import { authenticateToken } from "../middleware/authMiddleware.js";
import express from "express";

const keyValueRoute= express.Router();



keyValueRoute.get("/key-values", platformKeyValuesPairs);
export default keyValueRoute;