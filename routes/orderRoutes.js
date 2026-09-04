// routes/orderRoutes.js
import express from "express";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";
import {
  createOrder,
  createBulkOrders,
  getUserOrders,
  getOrderWithHistory,
  updateOrderStatus,
  addTrackingNumber,
  adminUpdateOrderStatus
} from "../controllers/orderController.js";

const router = express.Router();

// User routes
router.post("/", verifyToken, createOrder);
router.post("/bulk", verifyToken, createBulkOrders);
router.get("/", verifyToken, getUserOrders);
router.get("/:orderId", verifyToken, getOrderWithHistory);

// Admin routes
router.put("/admin/:orderId/status", verifyToken, verifyAdmin, adminUpdateOrderStatus);
router.put("/admin/:orderId/tracking", verifyToken, verifyAdmin, addTrackingNumber);

// User can update status (for testing - but in real app, only admin should update)
router.put("/:orderId/status", verifyToken, updateOrderStatus);

export default router;