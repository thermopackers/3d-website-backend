// models/educationRequestModel.js
import mongoose from "mongoose";

const educationRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    organization: {
      type: String,
      trim: true,
      default: ""
    },
    message: {
      type: String,
      trim: true,
      default: ""
    },
    programType: {
      type: String,
      enum: ["school", "society", "college", "corporate", "community", "other"],
      default: "community"
    },
    status: {
      type: String,
      enum: ["pending", "reviewing", "scheduled", "completed", "cancelled"],
      default: "pending"
    },
    preferredDate: {
      type: Date
    },
    participants: {
      type: Number,
      default: 0
    },
    notes: {
      type: String,
      default: ""
    },
    workshopBooked: {
      type: Boolean,
      default: false
    },
    workshopDate: {
      type: Date
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

// Index for faster queries
educationRequestSchema.index({ email: 1 });
educationRequestSchema.index({ status: 1 });
educationRequestSchema.index({ createdAt: -1 });

export default mongoose.model("EducationRequest", educationRequestSchema);