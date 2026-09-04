// controllers/recyclingController.js
import Recycling from "../models/recyclingModel.js";
import User from "../models/userModel.js";
import { generateCouponCode } from "../utils/couponUtils.js";

// Get all categories
export const getCategories = async (req, res) => {
  try {
    const categories = [
      {
        id: "3d_filament",
        label: "Used 3D Printer Filament",
        description: "Recycle your used PLA, ABS, PETG, and other 3D printer filaments",
        icon: "🎯",
        color: "from-blue-400 to-blue-600",
        acceptableItems: [
          "PLA filament leftovers",
          "ABS filament scraps",
          "PETG filament waste",
          "Failed prints filament",
          "Support material"
        ]
      },
      {
        id: "broken_toys",
        label: "Broken / Waste 3D Printed Toys & Objects",
        description: "Recycle broken 3D printed toys, prototypes, and objects",
        icon: "🧸",
        color: "from-purple-400 to-purple-600",
        acceptableItems: [
          "Broken 3D printed toys",
          "Failed prototype prints",
          "Waste 3D printed objects",
          "Damaged figurines"
        ]
      },
      {
        id: "plastic_waste",
        label: "Plastic Waste (HDPE, LDPE, PP, etc.)",
        description: "Recycle HDPE, LDPE, PP, bottle caps, shampoo bottles, and more",
        icon: "♻️",
        color: "from-green-400 to-green-600",
        acceptableItems: [
          "HDPE containers",
          "LDPE plastic bags",
          "PP plastic items",
          "Bottle caps",
          "Shampoo bottles",
          "Detergent containers"
        ]
      },
      {
        id: "pet_bottles",
        label: "PET Water Bottles",
        description: "Recycle PET water bottles and beverage containers",
        icon: "💧",
        color: "from-teal-400 to-teal-600",
        acceptableItems: [
          "Water bottles",
          "Soda bottles",
          "Beverage containers",
          "PET packaging"
        ]
      }
    ];
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

// ============ RECYCLING REQUEST FUNCTIONS ============

// Update submitRecyclingRequest to handle shipping method
export const submitRecyclingRequest = async (req, res) => {
  try {
    console.log("📦 Recycling request data:", req.body);
    console.log("📷 Uploaded files:", req.files);

    const {
      category,
      categoryLabel,
      wasteWeight,
      weightUnit,
      description,
      contactName,
      contactEmail,
      contactPhone,
      address,
      notes,
      shippingMethod,
      shippingPartner,
      shippingPartnerName,
      trackingNumber
    } = req.body;

    // Validate required fields
    if (!category || !categoryLabel || !wasteWeight || !contactName || !contactEmail || !contactPhone || !address) {
      return res.status(400).json({ 
        error: "All required fields must be filled",
        missing: {
          category: !category,
          categoryLabel: !categoryLabel,
          wasteWeight: !wasteWeight,
          contactName: !contactName,
          contactEmail: !contactEmail,
          contactPhone: !contactPhone,
          address: !address
        }
      });
    }

    // Parse address if it's a string
    let parsedAddress = address;
    if (typeof address === 'string') {
      try {
        parsedAddress = JSON.parse(address);
      } catch (e) {
        return res.status(400).json({ error: "Invalid address format" });
      }
    }

    // Validate address fields
    if (!parsedAddress.street || !parsedAddress.city || !parsedAddress.state || !parsedAddress.zipCode) {
      return res.status(400).json({ 
        error: "Complete address is required",
        address: parsedAddress
      });
    }

    // Handle photos
    const photos = req.files ? req.files.map(f => f.path) : [];

    // Create recycling request
    const recycling = await Recycling.create({
      user: req.user.id,
      category,
      categoryLabel,
      wasteWeight: Number(wasteWeight),
      weightUnit: weightUnit || "kg",
      description: description || "",
      photos,
      contactName,
      contactEmail,
      contactPhone,
      address: parsedAddress,
      notes: notes || "",
      shippingMethod: shippingMethod || "self_ship",
      shippingPartner: shippingPartner || null,
      shippingPartnerName: shippingPartnerName || "",
      trackingNumber: trackingNumber || "",
      status: "received",
      estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // Generate coupons based on waste quantity
    const coupons = await generateCouponsForRecycling(req.user.id, recycling._id, Number(wasteWeight));

    // Update user stats
    const pointsEarned = Math.floor(Number(wasteWeight) * 10);
    await User.findByIdAndUpdate(req.user.id, {
      $inc: {
        totalWasteRecycled: Number(wasteWeight) || 0,
        recyclingCount: 1,
        rewardPoints: pointsEarned
      }
    });

    // Populate user info
    const populatedRecycling = await Recycling.findById(recycling._id)
      .populate("user", "name email");

    // Get Kind Earth shipping address
    const kindEarthAddress = {
      street: "Kind Earth",
      city: "Jalandhar",
      state: "Punjab",
      zipCode: "144013",
      country: "India"
    };

    res.status(201).json({
      success: true,
      message: "Recycling request submitted successfully! Your waste is on its way to being recycled ♻️",
      recycling: populatedRecycling,
      shippingAddress: kindEarthAddress,
      couponsGenerated: coupons.length,
      rewardPointsEarned: pointsEarned
    });

  } catch (err) {
    console.error("❌ Recycling request error:", err);
    
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationErrors 
      });
    }

    res.status(500).json({ 
      error: err.message || "Failed to submit recycling request" 
    });
  }
};

// Create recycling request - DIRECT creation with coupon generation
export const createRecyclingRequest = async (req, res) => {
  try {
    const {
      wasteType,
      quantity,
      description,
      address,
      city,
      state,
      pincode,
      phone,
      pickupDate,
      pickupTime,
      notes
    } = req.body;

    console.log("📦 Creating recycling request:", req.body);

    // Validate required fields
    if (!wasteType || !quantity || !address || !city || !state || !pincode || !phone) {
      return res.status(400).json({
        error: "All required fields must be filled",
        missing: {
          wasteType: !wasteType,
          quantity: !quantity,
          address: !address,
          city: !city,
          state: !state,
          pincode: !pincode,
          phone: !phone
        }
      });
    }

    // Create recycling request
    const recycling = await Recycling.create({
      user: req.user.id,
      wasteType,
      quantity: Number(quantity),
      description: description || "",
      address,
      city,
      state,
      pincode,
      phone,
      pickupDate: pickupDate || new Date(),
      pickupTime: pickupTime || "10:00 AM",
      notes: notes || "",
      status: 'pending'
    });

    // Generate coupons based on waste quantity
    const coupons = await generateCouponsForRecycling(req.user.id, recycling._id, Number(quantity));

    // Update user stats
    const pointsEarned = Math.floor(Number(quantity) * 10);
    await User.findByIdAndUpdate(req.user.id, {
      $inc: {
        totalWasteRecycled: Number(quantity) || 0,
        recyclingCount: 1,
        rewardPoints: pointsEarned
      }
    });

    // Add reward points
    await addRewardPoints(
      req.user.id,
      pointsEarned,
      `Recycled ${quantity}kg of waste`
    );

    // Populate user info
    const populatedRecycling = await Recycling.findById(recycling._id)
      .populate("user", "name email");

    res.status(201).json({
      success: true,
      message: "Recycling request created successfully! Coupons have been added to your account.",
      recycling: populatedRecycling,
      couponsGenerated: coupons.length,
      rewardPointsEarned: pointsEarned
    });

  } catch (err) {
    console.error("❌ Create recycling request error:", err);
    
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationErrors 
      });
    }

    res.status(500).json({ 
      error: err.message || "Failed to create recycling request" 
    });
  }
};

// Generate coupons for recycling
const generateCouponsForRecycling = async (userId, recyclingId, quantity) => {
  try {
    const user = await User.findById(userId);
    if (!user) return [];

    const coupons = [];

    // Coupon 1: Percentage discount based on quantity
    let discountPercentage = 5;
    if (quantity >= 10) discountPercentage = 15;
    else if (quantity >= 5) discountPercentage = 10;
    else if (quantity >= 2) discountPercentage = 7;

    const coupon1 = {
      code: generateCouponCode('RECYCLE'),
      description: `${discountPercentage}% off on your next 3D printing order`,
      discountType: 'percentage',
      discountValue: discountPercentage,
      minOrderAmount: 100,
      maxDiscount: 500,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      source: 'recycling',
      recyclingRequestId: recyclingId,
      maxUsage: 1,
      isUsed: false
    };

    // Coupon 2: Fixed discount for larger quantities
    if (quantity >= 3) {
      const fixedDiscount = Math.min(quantity * 10, 200);
      const coupon2 = {
        code: generateCouponCode('RECYCLE'),
        description: `₹${fixedDiscount} off on your next 3D printing order`,
        discountType: 'fixed',
        discountValue: fixedDiscount,
        minOrderAmount: 200,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        source: 'recycling',
        recyclingRequestId: recyclingId,
        maxUsage: 1,
        isUsed: false
      };
      coupons.push(coupon2);
    }

    // Coupon 3: Bonus coupon for first-time recyclers
    if (user.recyclingCount === 0 || user.recyclingCount === undefined) {
      const bonusCoupon = {
        code: generateCouponCode('WELCOME'),
        description: '🎉 Welcome! Get 20% off your first order after recycling',
        discountType: 'percentage',
        discountValue: 20,
        minOrderAmount: 50,
        maxDiscount: 300,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        source: 'recycling',
        recyclingRequestId: recyclingId,
        maxUsage: 1,
        isUsed: false
      };
      coupons.push(bonusCoupon);
    }

    // Coupon 4: Loyalty coupon for regular recyclers
    if (user.recyclingCount >= 5) {
      const loyaltyCoupon = {
        code: generateCouponCode('LOYALTY'),
        description: '🌟 Loyalty reward! 25% off your next order',
        discountType: 'percentage',
        discountValue: 25,
        minOrderAmount: 150,
        maxDiscount: 500,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days
        source: 'recycling',
        recyclingRequestId: recyclingId,
        maxUsage: 1,
        isUsed: false
      };
      coupons.push(loyaltyCoupon);
    }

    // Add coupon1 to array
    coupons.unshift(coupon1);

    // Save coupons to user
    if (user.coupons) {
      user.coupons.push(...coupons);
    } else {
      user.coupons = coupons;
    }
    await user.save();

    return coupons;

  } catch (err) {
    console.error("Error generating coupons:", err);
    return [];
  }
};

// ============ COUPON FUNCTIONS ============

// Get user's available coupons
export const getAvailableCoupons = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('coupons');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const now = new Date();
    const availableCoupons = user.coupons.filter(coupon => {
      return !coupon.isUsed && 
             coupon.validFrom <= now && 
             coupon.validUntil >= now &&
             (coupon.usageCount || 0) < (coupon.maxUsage || 1);
    });

    res.json({
      success: true,
      coupons: availableCoupons,
      total: availableCoupons.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
};

// Get user's used coupons
export const getUsedCoupons = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('coupons');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const usedCoupons = user.coupons.filter(coupon => coupon.isUsed);

    res.json({
      success: true,
      coupons: usedCoupons,
      total: usedCoupons.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch used coupons" });
  }
};

// Validate coupon
export const validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    
    const user = await User.findById(req.user.id).select('coupons');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const coupon = user.coupons.find(c => c.code === code && !c.isUsed);
    
    if (!coupon) {
      return res.status(404).json({ 
        success: false, 
        error: "Invalid or already used coupon code" 
      });
    }

    const now = new Date();
    if (coupon.validFrom > now || coupon.validUntil < now) {
      return res.status(400).json({ 
        success: false, 
        error: "Coupon has expired" 
      });
    }

    if ((coupon.usageCount || 0) >= (coupon.maxUsage || 1)) {
      return res.status(400).json({ 
        success: false, 
        error: "Coupon usage limit reached" 
      });
    }

    if (orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({ 
        success: false, 
        error: `Minimum order amount of ₹${coupon.minOrderAmount} required` 
      });
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (orderAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else {
      discount = coupon.discountValue;
    }

    res.json({
      success: true,
      coupon: {
        ...coupon.toObject(),
        discount: Math.round(discount),
        finalAmount: Math.round(orderAmount - discount)
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to validate coupon" });
  }
};

// Use coupon (mark as used)
export const useCoupon = async (req, res) => {
  try {
    const { code } = req.params;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const coupon = user.coupons.find(c => c.code === code && !c.isUsed);
    if (!coupon) {
      return res.status(404).json({ 
        success: false, 
        error: "Coupon not found or already used" 
      });
    }

    coupon.isUsed = true;
    coupon.usedAt = new Date();
    coupon.usageCount = (coupon.usageCount || 0) + 1;

    await user.save();

    res.json({
      success: true,
      message: "Coupon applied successfully"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to use coupon" });
  }
};

// ============ GET RECYCLING REQUESTS ============

// Get user's recycling requests
export const getUserRecyclingRequests = async (req, res) => {
  try {
    const requests = await Recycling.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      requests
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch recycling requests" });
  }
};

// Get single recycling request
export const getRecyclingRequest = async (req, res) => {
  try {
    const request = await Recycling.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate("user", "name email");

    if (!request) {
      return res.status(404).json({ error: "Recycling request not found" });
    }

    res.json({
      success: true,
      request
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch recycling request" });
  }
};

// Get all recycling requests (admin only)
export const getAllRecyclingRequests = async (req, res) => {
  try {
    const requests = await Recycling.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch recycling requests" });
  }
};

// ============ ADMIN FUNCTIONS ============

// Update recycling status (admin only)
export const updateRecyclingStatus = async (req, res) => {
  try {
    const { status, trackingNumber, notes, rewardPoints } = req.body;
    
    const request = await Recycling.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ error: "Recycling request not found" });
    }

    // Update fields
    if (status) request.status = status;
    if (trackingNumber) request.trackingNumber = trackingNumber;
    if (notes) request.notes = notes;
    
    // Add reward points if completed
    if (status === "completed" && rewardPoints) {
      request.rewardPoints = rewardPoints;
      
      // Generate discount coupon
      request.discountCoupon = {
        code: `KIND${Date.now().toString().slice(-8)}`,
        discount: Math.min(rewardPoints, 50),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      };

      // Add reward points to user account
      await User.findByIdAndUpdate(
        request.user,
        { $inc: { rewardPoints: rewardPoints || 10 } }
      );
    }

    await request.save();

    res.json({
      success: true,
      message: "Recycling request updated successfully",
      request
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update recycling request" });
  }
};

// Get recycling statistics (admin only)
export const getRecyclingStats = async (req, res) => {
  try {
    const totalRequests = await Recycling.countDocuments();
    const pendingRequests = await Recycling.countDocuments({ status: "pending" });
    const completedRequests = await Recycling.countDocuments({ status: "completed" });
    const processingRequests = await Recycling.countDocuments({ status: "processing" });
    
    const totalWeight = await Recycling.aggregate([
      { $group: { _id: null, total: { $sum: "$wasteWeight" } } }
    ]);

    const categoryBreakdown = await Recycling.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalRequests,
        pendingRequests,
        completedRequests,
        processingRequests,
        totalWeight: totalWeight[0]?.total || 0,
        categoryBreakdown
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch recycling statistics" });
  }
};

// Add reward points to user (helper function)
export const addRewardPoints = async (userId, points, reason) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { rewardPoints: points } },
      { new: true }
    );
    return user;
  } catch (err) {
    console.error('Failed to add reward points:', err);
    return null;
  }
};

// controllers/recyclingController.js - Add shipping partners

// Get shipping partners
export const getShippingPartners = async (req, res) => {
  try {
    const partners = [
      { 
        id: "dhl", 
        name: "DHL Express",
        logo: "https://logo.clearbit.com/dhl.com",
        description: "International shipping with tracking",
        estimatedDays: "3-5 days",
        price: "₹200-500"
      },
      { 
        id: "fedex", 
        name: "FedEx",
        logo: "https://logo.clearbit.com/fedex.com",
        description: "Reliable courier service",
        estimatedDays: "2-4 days",
        price: "₹250-600"
      },
      { 
        id: "bluedart", 
        name: "Blue Dart",
        logo: "https://logo.clearbit.com/bluedart.com",
        description: "India's leading courier service",
        estimatedDays: "2-3 days",
        price: "₹150-400"
      },
      { 
        id: "delhivery", 
        name: "Delhivery",
        logo: "https://logo.clearbit.com/delhivery.com",
        description: "Affordable shipping pan-India",
        estimatedDays: "3-5 days",
        price: "₹100-300"
      },
      { 
        id: "dtc", 
        name: "DTC (Direct to Customer)",
        logo: "https://logo.clearbit.com/dtc.com",
        description: "Same-day or next-day delivery",
        estimatedDays: "1-2 days",
        price: "₹300-700"
      },
      // { 
      //   id: "other", 
      //   name: "Other / Your preferred courier",
      //   logo: null,
      //   description: "Use any courier service of your choice",
      //   estimatedDays: "Varies",
      //   price: "Varies"
      // }
    ];
    res.json({ success: true, partners });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch shipping partners" });
  }
};

