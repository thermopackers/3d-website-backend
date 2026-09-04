import express from "express";
import Order from "../models/orderModel.js";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Middleware to check admin role
const verifyAdmin = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const userRole = req.user.role || "user"; // attach role in verifyToken middleware
  if (userRole !== "admin") return res.status(403).json({ error: "Forbidden" });

  next();
};

// Get all orders
router.get("/orders", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const orders = await Order.find().populate("user").populate("product");
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Update order status
router.put("/orders/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("user").populate("product");
    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ error: "Failed to update order" });
  }
});

export default router;
