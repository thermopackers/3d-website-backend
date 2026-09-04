import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// ✅ Load correct env file automatically
dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env.development",
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
