// routes/educationRoutes.js
import express from "express";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";
import {
  createEducationRequest,
  getAllEducationRequests,
  getUserEducationRequests,
  getEducationRequest,
  updateEducationRequestStatus,
  deleteEducationRequest,
  getEducationStats,
  bookProgram,
  sendConfirmationEmail
} from "../controllers/educationController.js";

const router = express.Router();

// User routes
router.post("/", verifyToken, createEducationRequest);
router.get("/my-requests", verifyToken, getUserEducationRequests);
router.get("/:id", verifyToken, getEducationRequest);

// Program booking
router.post("/book-program", verifyToken, bookProgram);
router.post("/send-confirmation", verifyToken, sendConfirmationEmail);

// Admin routes
router.get("/admin/all", verifyToken, verifyAdmin, getAllEducationRequests);
router.put("/admin/:id", verifyToken, verifyAdmin, updateEducationRequestStatus);
router.delete("/admin/:id", verifyToken, verifyAdmin, deleteEducationRequest);
router.get("/admin/stats", verifyToken, verifyAdmin, getEducationStats);

export default router;