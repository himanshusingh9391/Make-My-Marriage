import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";
import { z } from "zod";
import { Resend } from "resend";
import { authorizeWeddingMemberAdmin } from "@/features/weddings/invitations-service";
import { createVerificationToken, hashVerificationToken } from "@/features/auth/security";
import { Wedding } from "@/features/auth/models/wedding";
import { connectToDatabase } from "@/lib/db/mongoose";
import { environment, requireResendConfig } from "@/lib/env/env";
import { AppError } from "@/lib/http/app-error";

export const guestInviteSchema = z.object({ fullName: z.string().trim().min(1).max(120), email: z.string().trim().email().max(254) }).strict();
export const guestIdSchema = z.string().regex(/^[a-f\d]{24}$/i);
const guestSchema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  normalizedEmail: { type: String, required: true },
  invitationTokenHash: { type: String, required: true, select: false },
  invitationStatus: { type: String, enum: ["PENDING", "ACCEPTED", "REVOKED", "FAILED"], required: true },
  invitationSentAt: Date,
  invitationExpiresAt: { type: Date, required: true },
  invitationAcceptedAt: Date,
}, { timestamps: true, collection: "guests" });
guestSchema.index({ weddingId: 1, createdAt: -1 });
guestSchema.index({ invitationTokenHash: 1 }, { unique: true });
guestSchema.index({ weddingId: 1, normalizedEmail: 1 }, { unique: true, partialFilterExpression: { normalizedEmail: { $type: "string" } } });
type Guest = InferSchemaType<typeof guestSchema>;
const GuestModel = (mongoose.models.Guest as Model<Guest> | undefined) ?? mongoose.model<Guest>("Guest", guestSchema);

export async function listGuestInvitations(userId: Types.ObjectId, weddingId: string, page = 1) {
  const { wedding } = await authorizeWeddingMemberAdmin(userId, weddingId);
  const filter = { weddingId: wedding._id, invitationStatus: { $exists: true } };
  const [rows, total, pending, accepted] = await Promise.all([
    GuestModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 25).limit(25).lean(),
    GuestModel.countDocuments(filter),
    GuestModel.countDocuments({ ...filter, invitationStatus: "PENDING", invitationExpiresAt: { $gt: new Date() } }),
    GuestModel.countDocuments({ ...filter, invitationStatus: "ACCEPTED" }),
  ]);
  return { invitations: rows.map(row => ({ id: row._id.toString(), fullName: row.fullName, email: row.email,
    status: row.invitationStatus === "PENDING" && row.invitationExpiresAt <= new Date() ? "EXPIRED" : row.invitationStatus,
    sentAt: row.invitationSentAt?.toISOString() ?? null, expiresAt: row.invitationExpiresAt.toISOString() })),
    counts: { pending, accepted }, pagination: { page, hasMore: page * 25 < total } };
}

export async function sendGuestInvitation(userId: Types.ObjectId, weddingId: string, input: z.infer<typeof guestInviteSchema>) {
  const parsed = guestInviteSchema.parse(input);
  const { wedding } = await authorizeWeddingMemberAdmin(userId, weddingId);
  const config = requireResendConfig();
  const email = parsed.email.toLowerCase();
  const token = createVerificationToken();
  const tokenHash = hashVerificationToken(token);
  const fields = { fullName: parsed.fullName, email, normalizedEmail: email, invitationTokenHash: tokenHash,
    invitationStatus: "PENDING" as const, invitationExpiresAt: new Date(Date.now() + 7 * 86400000) };
  let guest = await GuestModel.findOne({ weddingId: wedding._id, normalizedEmail: email });
  if (guest) {
    const updated = await GuestModel.findOneAndUpdate({ _id: guest._id, weddingId: wedding._id, $or: [
      { invitationStatus: { $in: ["REVOKED", "FAILED"] } },
      { invitationStatus: "PENDING", invitationExpiresAt: { $lte: new Date() } },
    ] }, { $set: fields, $unset: { invitationSentAt: 1, invitationAcceptedAt: 1 } }, { returnDocument: "after" });
    if (!updated) throw new AppError("This guest already has a pending or accepted invitation.", "GUEST_ALREADY_INVITED", 409);
    guest = updated;
  } else {
    try { guest = await GuestModel.create({ weddingId: wedding._id, ...fields }); }
    catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) throw new AppError("This guest already has an invitation.", "GUEST_ALREADY_INVITED", 409);
      throw error;
    }
  }
  const url = new URL("/guest-invitation", environment.NEXT_PUBLIC_APP_URL);
  url.searchParams.set("token", token);
  try {
    const result = await new Resend(config.apiKey).emails.send({ from: config.fromEmail, to: email,
      subject: `You are invited to ${wedding.weddingName}`,
      text: `Hello ${parsed.fullName}, you are invited to ${wedding.weddingName}. Accept your guest invitation: ${url.toString()}\nThis link expires in 7 days. No account is needed. This invitation does not grant wedding dashboard access.`,
    });
    if (result.error) throw new Error("Guest email delivery rejected");
    await GuestModel.updateOne({ _id: guest._id, invitationTokenHash: tokenHash }, { $set: { invitationSentAt: new Date() } });
  } catch {
    await GuestModel.updateOne({ _id: guest._id, invitationTokenHash: tokenHash }, { $set: { invitationStatus: "FAILED" } });
    throw new AppError("The guest invitation could not be delivered. Check your Resend sender and recipient permissions, then retry.", "INVITATION_DELIVERY_FAILED", 502);
  }
  return { guestId: guest._id.toString(), status: "PENDING" };
}

export async function revokeGuestInvitation(userId: Types.ObjectId, weddingId: string, guestId: string) {
  const { wedding } = await authorizeWeddingMemberAdmin(userId, weddingId);
  const result = await GuestModel.updateOne({ _id: guestId, weddingId: wedding._id, invitationStatus: "PENDING" }, { $set: { invitationStatus: "REVOKED" } });
  if (!result.modifiedCount) throw new AppError("Only pending guest invitations can be revoked.", "INVITATION_NOT_PENDING", 409);
  return { guestId, status: "REVOKED" };
}

export async function acceptGuestInvitation(token: string) {
  await connectToDatabase();
  const hash = hashVerificationToken(token);
  const guest = await GuestModel.findOne({ invitationTokenHash: hash }).lean();
  if (!guest) throw new AppError("This invitation is invalid.", "INVALID_INVITATION", 404);
  const wedding = await Wedding.findOne({ _id: guest.weddingId, status: { $ne: "DELETED" } }).select("weddingName").lean();
  if (!wedding) throw new AppError("This wedding is no longer available.", "WEDDING_NOT_FOUND", 404);
  if (guest.invitationStatus !== "ACCEPTED") {
    const accepted = await GuestModel.findOneAndUpdate({ _id: guest._id, weddingId: wedding._id, invitationTokenHash: hash,
      invitationStatus: "PENDING", invitationSentAt: { $ne: null }, invitationExpiresAt: { $gt: new Date() } },
    { $set: { invitationStatus: "ACCEPTED", invitationAcceptedAt: new Date() } }, { returnDocument: "after" });
    if (!accepted) throw new AppError("This invitation expired or was revoked. Ask the wedding admin for a new invitation.", "INVITATION_UNAVAILABLE", 410);
  }
  return { weddingName: wedding.weddingName, status: "ACCEPTED" };
}
