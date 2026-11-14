import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const weddingSettingsSchema = new Schema(
  {
    weddingId: {
      type: Schema.Types.ObjectId,
      ref: "Wedding",
      required: true,
      unique: true,
      index: true,
    },
    description: { type: String, trim: true, maxlength: 1200, default: "" },
  },
  { timestamps: true, collection: "wedding_settings" },
);

export type WeddingSettingsDocument = InferSchemaType<typeof weddingSettingsSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WeddingSettings = (mongoose.models.WeddingSettings as Model<WeddingSettingsDocument> | undefined) ??
  mongoose.model<WeddingSettingsDocument>("WeddingSettings", weddingSettingsSchema);
