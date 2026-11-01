import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    googleSub: {
      type: String,
      minlength: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Legacy users without a Google identity are excluded from this unique index.
userSchema.index({ googleSub: 1 }, {
  name: "google_sub_unique",
  unique: true,
  partialFilterExpression: { googleSub: { $type: "string" } },
});
userSchema.index({ email: 1 }, {
  name: "email_case_insensitive_unique",
  unique: true,
  collation: { locale: "en", strength: 2 },
});

export default mongoose.model("Users", userSchema);
