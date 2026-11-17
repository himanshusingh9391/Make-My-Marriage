import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const weddingInvitationSchema = new Schema(
  {
    weddingId: { type: Schema.Types.ObjectId, ref: "Wedding", required: true, index: true },
    invitedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    normalizedEmail: { type: String, required: true, trim: true, lowercase: true },
    role: { type: String, enum: ["ADMIN", "MANAGER"], required: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    activeInvitationKey: { type: String, default: undefined, select: false },
    expiresAt: { type: Date, required: true, index: true },
    acceptedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    deliveryStatus: { type: String, enum: ["PENDING", "SENT", "FAILED"], required: true, default: "PENDING" },
    sentAt: { type: Date, default: null },
    deliveryError: { type: String, default: null, maxlength: 300 },
  },
  { timestamps: true, collection: "wedding_invitations" },
);

weddingInvitationSchema.index({ weddingId: 1, normalizedEmail: 1, acceptedAt: 1, revokedAt: 1 });
weddingInvitationSchema.index({ weddingId: 1, createdAt: -1 });
weddingInvitationSchema.index({ activeInvitationKey: 1 }, { unique: true, sparse: true });

export type WeddingInvitationDocument = InferSchemaType<typeof weddingInvitationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WeddingInvitation = (mongoose.models.WeddingInvitation as Model<WeddingInvitationDocument> | undefined) ??
  mongoose.model<WeddingInvitationDocument>("WeddingInvitation", weddingInvitationSchema);
