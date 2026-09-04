// models/orderModel.js
import mongoose from "mongoose";

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["Pending", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled"],
    required: true
  },
  timestamp: { type: Date, default: Date.now },
  note: { type: String },
  location: { type: String },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    color: { type: String, default: "Default" },
    material: { type: String, default: "PLA" },
    status: { 
      type: String, 
      enum: ["Pending", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled"],
      default: "Pending" 
    },
    statusHistory: [statusHistorySchema],
    paymentId: { type: String },
    orderId: { type: String },
    amount: { type: Number },
    trackingNumber: { type: String },
    estimatedDelivery: { type: Date },
    shippingDetails: {
      fullName: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      pincode: String,
      landmark: String,
    },
    couponApplied: {
      code: String,
      discount: Number
    }
  },
  { timestamps: true }
);

// Add index for faster queries
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

export default mongoose.model("Order", orderSchema);