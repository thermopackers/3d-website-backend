// models/userModel.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const addressSchema = new mongoose.Schema({
  label: { 
    type: String, 
    enum: ['Home', 'Work', 'Other'], 
    default: 'Home' 
  },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, default: "India" },
  landmark: { type: String, default: "" },
  isDefault: { type: Boolean, default: false },
  isDelivery: { type: Boolean, default: true },
  isBilling: { type: Boolean, default: false }
}, { timestamps: true });

// Coupon Schema
const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  description: { type: String },
  discountType: { 
    type: String, 
    enum: ['percentage', 'fixed'], 
    default: 'percentage' 
  },
  discountValue: { type: Number, required: true },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscount: { type: Number },
  validFrom: { type: Date, default: Date.now },
  validUntil: { type: Date },
  usedAt: { type: Date },
  isUsed: { type: Boolean, default: false },
  source: { 
    type: String, 
    enum: ['recycling', 'promotion', 'birthday', 'referral', 'admin'],
    default: 'recycling'
  },
  recyclingRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recycling' },
  usageCount: { type: Number, default: 0 },
  maxUsage: { type: Number, default: 1 }
}, { timestamps: true });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    phone: { type: String, default: "" },
    status: { 
  type: String, 
  enum: ["active", "suspended"], 
  default: "active" 
},
    address: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      zipCode: { type: String, default: "" },
      country: { type: String, default: "India" },
      landmark: { type: String, default: "" }
    },
    addresses: [addressSchema],
    coupons: [couponSchema],
    rewardPoints: { type: Number, default: 0 },
    totalWasteRecycled: { type: Number, default: 0 }, // in kg
    recyclingCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);