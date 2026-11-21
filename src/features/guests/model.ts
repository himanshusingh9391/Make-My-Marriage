import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
const guestSchema = new Schema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    fullName: { type: String, required: true },
    email: String,
    normalizedEmail: String,
    invitationTokenHash: { type: String, required: true, select: false },
    invitationStatus: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REVOKED", "FAILED"],
    },
    householdKey: { type: String, select: false },
    householdStatus: { type: String, enum: ["YES", "NO"] },
    householdCount: Number,
    rsvpTokenHash: { type: String, select: false },
    rsvpExpiresAt: Date,
    rsvpRevokedAt: { type: Date, default: null },
    invitationSentAt: Date,
    invitationExpiresAt: Date,
    invitationAcceptedAt: Date,
    phone: { type: String, default: "" },
    groupName: { type: String, default: "" },
    notes: { type: String, default: "" },
    maxPartySize: { type: Number, default: 1 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "guests" },
);
guestSchema.index({ weddingId: 1, createdAt: -1 });
guestSchema.index(
  { weddingId: 1, householdKey: 1 },
  {
    unique: true,
    partialFilterExpression: { householdKey: { $type: "string" } },
  },
);
guestSchema.index({ invitationTokenHash: 1 }, { unique: true });
guestSchema.index(
  { weddingId: 1, normalizedEmail: 1 },
  {
    unique: true,
    partialFilterExpression: { normalizedEmail: { $type: "string" } },
  },
);
guestSchema.index(
  { rsvpTokenHash: 1 },
  {
    unique: true,
    partialFilterExpression: { rsvpTokenHash: { $type: "string" } },
  },
);

type Guest = InferSchemaType<typeof guestSchema>;
// Next.js can reload this module while Mongoose retains the previous schema.
const cachedGuest = mongoose.models.Guest;
if (
  cachedGuest &&
  Object.keys(guestSchema.paths).some((path) => !cachedGuest.schema.path(path))
) {
  mongoose.deleteModel("Guest");
}
export const GuestModel =
  (mongoose.models.Guest as Model<Guest> | undefined) ??
  mongoose.model<Guest>("Guest", guestSchema);
