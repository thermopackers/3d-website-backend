import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// -------------------- Google Login --------------------
export const googleLogin = async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    if (!googleId || !email || !name) return res.status(400).json({ error: "Google login failed" });

    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.create({ googleId, email, name, role: "user" });
    }

    const tokenJWT = generateToken(user);

    res.json({
      token: tokenJWT,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Google login failed" });
  }
};

// -------------------- Register User --------------------
export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already in use" });

    const user = await User.create({ name, email, password, role: "user" });

    const tokenJWT = generateToken(user);

    res.status(201).json({
      token: tokenJWT,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Registration failed" });
  }
};

// -------------------- Login User --------------------
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.password) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const tokenJWT = generateToken(user);

    res.json({
      token: tokenJWT,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Login failed" });
  }
};
