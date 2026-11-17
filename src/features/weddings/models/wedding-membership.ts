import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const weddingMembershipSchema = new Schema(
  {
    weddingId: { type: Schema.Types.ObjectId, ref: "Wedding", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["ADMIN", "MANAGER"], required: true },
    invitedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    joinedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true, collection: "wedding_memberships" },
);

weddingMembershipSchema.index({ weddingId: 1, userId: 1 }, { unique: true });
weddingMembershipSchema.index({ userId: 1, joinedAt: -1 });

export type WeddingMembershipDocument = InferSchemaType<typeof weddingMembershipSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WeddingMembership = (mongoose.models.WeddingMembership as Model<WeddingMembershipDocument> | undefined) ??
  mongoose.model<WeddingMembershipDocument>("WeddingMembership", weddingMembershipSchema);
