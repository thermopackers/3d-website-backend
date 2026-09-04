// routes/contactRoutes.js
import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { sendContactMessage } from "../controllers/contactController.js";

const router = express.Router();

router.post("/", verifyToken, sendContactMessage);

export default router;