import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import recyclingRoutes from "./routes/recyclingRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import educationRoutes from "./routes/educationRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";

// ✅ Load correct environment file automatically
dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env.development",
});

// ✅ Connect to MongoDB
connectDB();

const app = express();

// ✅ CORS Configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// ✅ CRITICAL: Body Parsing Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ 
  extended: true, 
  limit: "50mb" 
}));
app.use(cookieParser());

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/recycling", recyclingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/education", educationRoutes);
app.use("/api/contact", contactRoutes);

// ✅ Health Check Route
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    message: "Server is running", 
    timestamp: new Date().toISOString() 
  });
});

// ✅ Root Route
app.get("/", (req, res) => {
  res.json({ 
    message: "3D Printing E-commerce API", 
    version: "1.0.0",
    status: "active"
  });
});

// ✅ FIXED: 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Route not found",
    path: req.originalUrl,
    method: req.method
  });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error("🚨 Global Error Handler:", err);
  
  // Multer errors (file upload)
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: "File too large",
      message: "Please upload files smaller than 10MB"
    });
  }
  
  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      error: "Too many files",
      message: "Please upload up to 5 images only"
    });
  }
  
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      error: "Invalid file type",
      message: "Please upload only image files"
    });
  }

  // Cloudinary errors
  if (err.message && err.message.includes("File size too large")) {
    return res.status(400).json({
      error: "File too large for Cloudinary",
      message: "Please upload images smaller than 10MB"
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
  console.log(`📊 MongoDB: ${process.env.MONGO_URI ? "Connected" : "Not configured"}`);
});