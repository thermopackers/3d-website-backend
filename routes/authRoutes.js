import express from "express";
import { googleLogin, registerUser, loginUser } from "../controllers/authController.js";

const router = express.Router();

// Google login
router.post("/google", googleLogin);

// Email/password registration
router.post("/register", registerUser);

// Email/password login
router.post("/login", loginUser);

export default router;
