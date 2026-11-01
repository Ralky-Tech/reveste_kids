import dotenv from "dotenv";
import mongoose from "mongoose";

// This module must be the first import of the application entry point.
// Load environment configuration before deciding the policy or loading models.
dotenv.config();
if (process.env.NODE_ENV === "production") {
  mongoose.set("autoIndex", false);
}

export default mongoose;
