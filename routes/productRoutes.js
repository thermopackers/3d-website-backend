import express from "express";
import Product from "../models/productModel.js";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

// Cloudinary storage for multiple images
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    public_id: (req, file) => `${Date.now()}-${file.originalname}`,
  },
});

// File filter for size and type validation
const fileFilter = (req, file, cb) => {
  // Check file type
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

// Admin: Add product with multiple images - ENHANCED VERSION
router.post("/", verifyToken, verifyAdmin, parser.array("images", 5), async (req, res) => {
  try {
    console.log("✅ Incoming body:", req.body);
    console.log("✅ Incoming files:", req.files);

    // Validate required fields
    if (!req.body.name || !req.body.price) {
      return res.status(400).json({ 
        error: "Name and price are required",
        received: req.body 
      });
    }

    // Handle array fields
    const colorOptions = req.body.colorOptions 
      ? (Array.isArray(req.body.colorOptions) 
          ? req.body.colorOptions.filter(color => color.trim() !== '')
          : [req.body.colorOptions.trim()].filter(color => color !== ''))
      : [];

    const materialOptions = req.body.materialOptions 
      ? (Array.isArray(req.body.materialOptions) 
          ? req.body.materialOptions.filter(material => material.trim() !== '')
          : [req.body.materialOptions.trim()].filter(material => material !== ''))
      : [];

    // Handle images
    const images = req.files ? req.files.map(f => f.path) : [];

    // Validate price
    const price = Number(req.body.price);
    if (isNaN(price)) {
      return res.status(400).json({ error: "Price must be a valid number" });
    }

    const productData = {
      name: req.body.name.trim(),
      description: req.body.description ? req.body.description.trim() : "",
      price: price,
      colorOptions,
      materialOptions,
      images
    };

    console.log("🔄 Creating product with:", productData);

    const product = await Product.create(productData);

    console.log("✅ Product created successfully:", product._id);
    
    res.status(201).json({
      success: true,
      product: product,
      message: "Product created successfully"
    });
    
  } catch (err) {
    console.error("❌ Product creation error:", err);
    
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationErrors 
      });
    }

    if (err.code === 11000) {
      return res.status(400).json({ error: "Product with this name already exists" });
    }

    res.status(500).json({ 
      error: err.message || "Failed to create product",
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ 
        error: "Product not found" 
      });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        error: "Invalid product ID" 
      });
    }

    res.status(500).json({ 
      error: "Failed to fetch product" 
    });
  }
});

// Update product (admin) - ENHANCED VERSION
router.put("/:id", verifyToken, verifyAdmin, parser.array("images", 5), async (req, res) => {
  try {
    console.log("📦 Update body:", req.body);
    console.log("📦 Update files:", req.files);
    console.log("📦 Product ID:", req.params.id);

    // Validate product ID
    if (!req.params.id) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Check if product exists
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    let updateData = { ...req.body };
    
    // Handle numeric fields
    if (req.body.price) {
      updateData.price = Number(req.body.price);
      if (isNaN(updateData.price)) {
        return res.status(400).json({ error: "Price must be a valid number" });
      }
    }

    // Better array field handling for colorOptions
    if (req.body.colorOptions !== undefined) {
      if (Array.isArray(req.body.colorOptions)) {
        updateData.colorOptions = req.body.colorOptions.filter(color => color.trim() !== '');
      } else if (typeof req.body.colorOptions === 'string') {
        updateData.colorOptions = [req.body.colorOptions.trim()].filter(color => color !== '');
      } else {
        updateData.colorOptions = [];
      }
    }

    // Better array field handling for materialOptions
    if (req.body.materialOptions !== undefined) {
      if (Array.isArray(req.body.materialOptions)) {
        updateData.materialOptions = req.body.materialOptions.filter(material => material.trim() !== '');
      } else if (typeof req.body.materialOptions === 'string') {
        updateData.materialOptions = [req.body.materialOptions.trim()].filter(material => material !== '');
      } else {
        updateData.materialOptions = [];
      }
    }

    // Handle images: combine existing images with new ones
    let images = [];
    
    // Add existing images if provided
    if (req.body.existingImages !== undefined) {
      if (Array.isArray(req.body.existingImages)) {
        images = images.concat(req.body.existingImages.filter(img => img.trim() !== ''));
      } else if (typeof req.body.existingImages === 'string') {
        images = images.concat([req.body.existingImages.trim()].filter(img => img !== ''));
      }
    } else {
      // If no existingImages provided, keep the current images
      images = existingProduct.images || [];
    }
    
    // Add new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => f.path);
      images = images.concat(newImages);
    }

    // Ensure we don't have duplicate images
    images = [...new Set(images)];

    // Only update images if we have any images
    if (images.length > 0) {
      updateData.images = images;
    } else {
      // If no images left, set to empty array
      updateData.images = [];
    }

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    console.log("🔄 Final update data:", updateData);

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { 
        new: true, 
        runValidators: true 
      }
    );
    
    if (!updatedProduct) {
      return res.status(404).json({ error: "Product not found after update" });
    }

    console.log("✅ Product updated successfully:", updatedProduct._id);
    res.json({
      success: true,
      product: updatedProduct,
      message: "Product updated successfully"
    });
    
  } catch (err) {
    console.error("❌ Update error:", err.message);
    console.error("❌ Full error:", err);

    // Handle different types of errors
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid product ID format" });
    }
    
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationErrors 
      });
    }

    if (err.code === 11000) {
      return res.status(400).json({ error: "Product with this name already exists" });
    }

    res.status(500).json({ 
      error: err.message || "Failed to update product",
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Delete product (admin)
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to delete product" });
  }
});

export default router;