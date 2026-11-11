import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const weddingSchema = new Schema(
  {
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    weddingName: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, index: true },
    partnerOneName: { type: String, required: true, trim: true, maxlength: 120 },
    partnerTwoName: { type: String, required: true, trim: true, maxlength: 120 },
    weddingDate: { type: Date, default: null },
    city: { type: String, required: true, trim: true, maxlength: 120 },
    timezone: { type: String, required: true, default: "Asia/Kolkata" },
    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "ARCHIVED", "DELETED"],
      default: "DRAFT",
      required: true,
    },
  },
  { timestamps: true, collection: "weddings" },
);

export type WeddingDocument = InferSchemaType<typeof weddingSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Wedding = (mongoose.models.Wedding as Model<WeddingDocument> | undefined) ??
  mongoose.model<WeddingDocument>("Wedding", weddingSchema);
