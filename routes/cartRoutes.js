// routes/cartRoutes.js
import express from "express";
import Cart from "../models/cartModel.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get cart for logged-in user
router.get("/", verifyToken, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate("items.product");
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

// Add item to cart
router.post("/add", verifyToken, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }

    const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    cart = await cart.populate("items.product");
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add to cart" });
  }
});

// Remove item from cart
router.post("/remove", verifyToken, async (req, res) => {
  try {
    const { productId } = req.body;
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(400).json({ error: "Cart not found" });

    cart.items = cart.items.filter((item) => item.product.toString() !== productId);
    await cart.save();
    cart = await cart.populate("items.product");
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove from cart" });
  }
});

// Update quantity
router.post("/update", verifyToken, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(400).json({ error: "Cart not found" });

    const item = cart.items.find((i) => i.product.toString() === productId);
    if (item) {
      item.quantity = quantity;
      await cart.save();
    }

    cart = await cart.populate("items.product");
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update cart" });
  }
});

export default router;
