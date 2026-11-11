import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const userSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sessionTokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "user_sessions" },
);

userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type UserSessionDocument = InferSchemaType<typeof userSessionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UserSession =
  (mongoose.models.UserSession as Model<UserSessionDocument> | undefined) ??
  mongoose.model<UserSessionDocument>("UserSession", userSessionSchema);
