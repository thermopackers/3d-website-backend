import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../models/orderModel.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get Razorpay config based on mode
const getRazorpayConfig = (mode = 'test') => {
  if (mode === 'live') {
    return {
      key_id: process.env.RAZORPAY_LIVE_KEY_ID,
      key_secret: process.env.RAZORPAY_LIVE_KEY_SECRET,
    };
  }
  return {
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  };
};

// Initialize Razorpay with better error handling
let razorpay = null;
let currentMode = process.env.RAZORPAY_MODE || 'test';

const initRazorpay = (mode) => {
  try {
    const config = getRazorpayConfig(mode);
    
    // Check if keys are valid (not placeholders)
    const isValidKey = (key) => {
      return key && 
             key !== 'your_razorpay_key_id_here' && 
             key !== 'your_razorpay_key_secret_here' &&
             key.startsWith('rzp_');
    };

    if (!isValidKey(config.key_id) || !isValidKey(config.key_secret)) {
      console.error(`❌ Invalid Razorpay credentials for ${mode} mode`);
      console.error(`  Key ID: ${config.key_id ? 'Present but invalid' : 'Missing'}`);
      console.error(`  Key Secret: ${config.key_secret ? 'Present but invalid' : 'Missing'}`);
      razorpay = null;
      return false;
    }

    razorpay = new Razorpay({
      key_id: config.key_id,
      key_secret: config.key_secret,
    });
    currentMode = mode;
    console.log(`✅ Razorpay initialized in ${mode.toUpperCase()} mode`);
    console.log(`  Key ID: ${config.key_id}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize Razorpay:", error.message);
    razorpay = null;
    return false;
  }
};

// Initialize with default mode
const initialized = initRazorpay(currentMode);
if (!initialized) {
  console.warn("⚠️ Razorpay initialization failed. Payment features will be disabled.");
}

// Health check endpoint
router.get("/health", async (req, res) => {
  const testConfig = getRazorpayConfig('test');
  const liveConfig = getRazorpayConfig('live');
  
  const isValidKey = (key) => {
    return key && key !== 'your_razorpay_key_id_here' && key !== 'your_razorpay_key_secret_here' && key.startsWith('rzp_');
  };

  res.json({
    status: razorpay ? 'ready' : 'unavailable',
    mode: currentMode,
    testModeConfigured: isValidKey(testConfig.key_id) && isValidKey(testConfig.key_secret),
    liveModeConfigured: isValidKey(liveConfig.key_id) && isValidKey(liveConfig.key_secret),
    message: razorpay ? 'Razorpay is ready' : 'Razorpay is not configured correctly',
  });
});

// Create Razorpay order
router.post("/create-order", verifyToken, async (req, res) => {
  try {
    console.log("📦 Creating Razorpay order...");
    console.log("  Current mode:", currentMode);
    console.log("  Razorpay instance:", razorpay ? 'Initialized' : 'Not initialized');

    // Check if Razorpay is configured
    if (!razorpay) {
      console.error("❌ Razorpay not initialized");
      return res.status(503).json({
        success: false,
        error: "Payment service is not configured. Please check your Razorpay keys.",
        details: "Razorpay initialization failed. Check your API keys.",
      });
    }

    const { amount, currency = "INR", receipt } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount",
      });
    }

    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency: currency,
      receipt: receipt || `order_${Date.now()}`,
      payment_capture: 1,
      notes: {
        mode: currentMode,
      },
    };

    console.log("  Order options:", options);

    // Create order with error handling
    let order;
    try {
      order = await razorpay.orders.create(options);
      console.log("✅ Razorpay order created:", order.id);
    } catch (razorpayError) {
      console.error("❌ Razorpay API error:", razorpayError);
      
      // Handle specific Razorpay errors
      if (razorpayError.statusCode === 401) {
        return res.status(500).json({
          success: false,
          error: "Razorpay authentication failed. Please check your API keys.",
          details: "Invalid Razorpay credentials. Please update your API keys in .env file.",
        });
      } else if (razorpayError.statusCode === 400) {
        return res.status(400).json({
          success: false,
          error: razorpayError.error?.description || "Invalid request to Razorpay",
        });
      } else {
        return res.status(500).json({
          success: false,
          error: "Failed to create payment order. Please try again.",
          details: razorpayError.message,
        });
      }
    }
    
    // Get the current key based on mode
    const config = getRazorpayConfig(currentMode);
    
    res.status(201).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: config.key_id,
      mode: currentMode,
    });
  } catch (error) {
    console.error("❌ Error creating Razorpay order:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create payment order",
    });
  }
});

// Verify payment
router.post("/verify-payment", verifyToken, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        error: "Payment service is not configured.",
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cartItems,
      totalAmount,
      shippingDetails,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Missing payment verification details",
      });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_LIVE_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      const orders = cartItems.map((item) => ({
        user: req.user.id,
        product: item._id,
        quantity: item.quantity,
        color: item.color || "Default",
        material: item.material || "PLA",
        status: "Paid",
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: item.price * item.quantity,
        shippingDetails: shippingDetails || {},
      }));

      const savedOrders = await Order.insertMany(orders);

      res.status(201).json({
        success: true,
        message: "Payment verified and order placed successfully",
        orders: savedOrders,
        paymentId: razorpay_payment_id,
      });
    } else {
      res.status(400).json({
        success: false,
        error: "Payment verification failed - Invalid signature",
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to verify payment",
    });
  }
});

export default router;