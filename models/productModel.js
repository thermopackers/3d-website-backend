import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    colorOptions: [{ type: String }],
    materialOptions: [{ type: String }],
    images: [{ type: String }], // multiple images URLs
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
