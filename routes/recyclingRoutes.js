import express from "express";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import {
  getCategories,
  submitRecyclingRequest,
  getUserRecyclingRequests,
  getRecyclingRequest,
  updateRecyclingStatus,
  getAllRecyclingRequests,
  getRecyclingStats,
  createRecyclingRequest,
  getAvailableCoupons,
  getUsedCoupons,
  validateCoupon,
  useCoupon,
  getShippingPartners
} from "../controllers/recyclingController.js";

const router = express.Router();

// Cloudinary storage for recycling photos
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "kindearth/recycling",
    public_id: (req, file) => `recycling-${Date.now()}-${file.originalname}`
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const parser = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // Maximum 5 files
  }
});

// Public routes
router.get("/categories", getCategories);

// routes/recyclingRoutes.js - Add shipping partners route
router.get("/shipping-partners", verifyToken, getShippingPartners);

// Protected routes
router.post("/submit", verifyToken, parser.array("photos", 5), submitRecyclingRequest);
router.get("/my-requests", verifyToken, getUserRecyclingRequests);
router.get("/my-requests/:id", verifyToken, getRecyclingRequest);

// Admin routes
router.get("/all", verifyToken, verifyAdmin, getAllRecyclingRequests);
router.put("/:id/status", verifyToken, verifyAdmin, updateRecyclingStatus);
router.get("/stats", verifyToken, verifyAdmin, getRecyclingStats);

// Recycling routes
router.post("/", verifyToken, createRecyclingRequest);

// Coupon routes
router.get("/coupons/available", verifyToken, getAvailableCoupons);
router.get("/coupons/used", verifyToken, getUsedCoupons);
router.post("/coupons/validate", verifyToken, validateCoupon);
router.put("/coupons/:code/use", verifyToken, useCoupon);

export default router;