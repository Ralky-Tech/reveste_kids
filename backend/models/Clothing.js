import mongoose from "mongoose";

const clothingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      trim: true,
      default: "",
    },
    size: {
      type: String,
      trim: true,
      default: "",
    },
    condition: {
      type: String,
      trim: true,
      default: "",
    },
    style: {
      type: String,
      trim: true,
      default: "",
    },
    media: {
      type: [
        {
          type: {
            type: String,
            enum: ["image", "video"],
            required: true,
          },
          url: {
            type: String,
            required: true,
          },
        },
      ],
      default: [],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Clothing", clothingSchema);
