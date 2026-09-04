// models/programBookingModel.js
import mongoose from "mongoose";

const programBookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  programId: {
    type: String,
    required: true
  },
  programTitle: {
    type: String,
    required: true
  },
  programCost: {
    type: Number,
    required: true
  },
  bookingData: {
    date: String,
    time: String,
    participants: Number,
    name: String,
    email: String,
    phone: String,
    organization: String
  },
  paymentId: String,
  orderId: String,
  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "cancelled"],
    default: "pending"
  }
}, { timestamps: true });

export default mongoose.model("ProgramBooking", programBookingSchema);