// routes/userRoutes.js
import express from "express";
import { verifyAdmin, verifyToken } from "../middleware/authMiddleware.js";
import {
  getUserProfile,
  updateUserProfile,
  updateUserAddress,
  getUserAddress,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getAddresses,
    getAllUsers,
  getUserStats,
  deleteUser,
  updateUserStatus,
  updateUserRole,
  updateUserByAdmin
} from "../controllers/userController.js";

const router = express.Router();

// Protected routes
router.get("/profile", verifyToken, getUserProfile);
router.put("/profile", verifyToken, updateUserProfile);
router.put("/address", verifyToken, updateUserAddress);
router.get("/address", verifyToken, getUserAddress);

// Address management
router.get("/addresses", verifyToken, getAddresses);
router.post("/addresses", verifyToken, addAddress);
router.put("/addresses/:addressId", verifyToken, updateAddress);
router.delete("/addresses/:addressId", verifyToken, deleteAddress);
router.put("/addresses/:addressId/default", verifyToken, setDefaultAddress);

// ============ ADMIN ROUTES ============
router.get("/admin/all", verifyToken, verifyAdmin, getAllUsers);
router.get("/admin/stats", verifyToken, verifyAdmin, getUserStats);
router.delete("/admin/:userId", verifyToken, verifyAdmin, deleteUser);
router.put("/admin/:userId/status", verifyToken, verifyAdmin, updateUserStatus);
router.put("/admin/:userId/role", verifyToken, verifyAdmin, updateUserRole);
router.put("/admin/:userId", verifyToken, verifyAdmin, updateUserByAdmin);

export default router;