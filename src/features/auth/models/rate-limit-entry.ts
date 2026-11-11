import mongoose, { Schema, type Model } from "mongoose";

type RateLimitEntry = {
  keyHash: string;
  attempts: number;
  expiresAt: Date;
};

const rateLimitEntrySchema = new Schema<RateLimitEntry>(
  {
    keyHash: { type: String, required: true, unique: true },
    attempts: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "auth_rate_limits" },
);

rateLimitEntrySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitEntry =
  (mongoose.models.RateLimitEntry as Model<RateLimitEntry> | undefined) ??
  mongoose.model<RateLimitEntry>("RateLimitEntry", rateLimitEntrySchema);
