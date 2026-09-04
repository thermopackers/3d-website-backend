// models/recyclingModel.js
import mongoose from "mongoose";

const recyclingSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    category: { 
      type: String, 
      required: true,
      enum: [
        "3d_filament",
        "broken_toys",
        "plastic_waste",
        "pet_bottles"
      ]
    },
    categoryLabel: { 
      type: String, 
      required: true 
    },
    wasteWeight: { 
      type: Number, 
      required: true,
      min: 0.1
    },
    weightUnit: {
      type: String,
      default: "kg",
      enum: ["kg", "g", "lbs"]
    },
    description: { 
      type: String,
      maxlength: 500
    },
    photos: [{ 
      type: String 
    }],
    contactName: {
      type: String,
      required: true
    },
    contactEmail: {
      type: String,
      required: true
    },
    contactPhone: {
      type: String,
      required: true
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, default: "India" }
    },
    recyclingId: {
      type: String,
      unique: true
    },
    // NEW: Shipping Method
    shippingMethod: {
      type: String,
      enum: ["pickup", "self_ship"],
      default: "self_ship"
    },
    // NEW: Selected Shipping Partner
    shippingPartner: {
      type: String,
      enum: ["dhl", "fedex", "bluedart", "delhivery", "dtc", "other"],
      default: null
    },
    shippingPartnerName: {
      type: String,
      default: ""
    },
    trackingNumber: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: [
        "received",      // Package received by Kind Earth
        "sorting",       // Material sorting
        "cleaning",      // Cleaning & Drying
        "shredding",     // Plastic Shredding
        "extrusion",     // Filament Extrusion
        "testing",       // Quality Testing
        "printing",      // 3D Printing New Products
        "finishing",     // Product Finishing
        "packaging",     // Eco-Friendly Packaging
        "completed",     // Done - Rewards Given
        "rejected"       // Only if materials are not recyclable
      ],
      default: "received"
    },
    rewardPoints: {
      type: Number,
      default: 0
    },
    discountCoupon: {
      code: String,
      discount: Number,
      validUntil: Date
    },
    estimatedCompletion: {
      type: Date
    },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    notes: {
      type: String
    }
  },
  { timestamps: true }
);

// Generate unique short recycling ID before saving
recyclingSchema.pre("save", async function(next) {
  if (!this.recyclingId) {
    const prefix = "KE";
    const count = await mongoose.model("Recycling").countDocuments() + 1;
    this.recyclingId = `${prefix}${String(count).padStart(3, '0')}`;
  }
  next();
});

export default mongoose.model("Recycling", recyclingSchema);