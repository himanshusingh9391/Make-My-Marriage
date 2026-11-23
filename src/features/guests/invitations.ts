import "server-only";
import { type Types } from "mongoose";
import { GuestModel } from "./model";
import { z } from "zod";
import { Resend } from "resend";
import { authorizeWeddingMemberAdmin } from "@/features/weddings/invitations-service";
import {
  createVerificationToken,
  hashVerificationToken,
} from "@/features/auth/security";
import { Wedding } from "@/features/auth/models/wedding";
import { connectToDatabase } from "@/lib/db/mongoose";
import { environment, requireResendConfig } from "@/lib/env/env";
import { AppError } from "@/lib/http/app-error";

export const guestInviteSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
  })
  .strict();
export const guestIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

export async function listGuestInvitations(
  userId: Types.ObjectId,
  weddingId: string,
  page = 1,
) {
  const { wedding } = await authorizeWeddingMemberAdmin(userId, weddingId);
  const filter = {
    weddingId: wedding._id,
    deletedAt: null,
    invitationStatus: { $exists: true },
  };
  const [rows, total, pending, accepted] = await Promise.all([
    GuestModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * 25)
      .limit(25)
      .lean(),
    GuestModel.countDocuments(filter),
    GuestModel.countDocuments({
      ...filter,
      invitationStatus: "PENDING",
      invitationExpiresAt: { $gt: new Date() },
    }),
    GuestModel.countDocuments({ ...filter, invitationStatus: "ACCEPTED" }),
  ]);
  return {
    invitations: rows.map((row) => ({
      id: row._id.toString(),
      fullName: row.fullName,
      email: row.email ?? "",
      status:
        row.invitationStatus === "PENDING" &&
        row.invitationExpiresAt &&
        row.invitationExpiresAt <= new Date()
          ? "EXPIRED"
          : (row.invitationStatus ?? "REVOKED"),
      sentAt: row.invitationSentAt?.toISOString() ?? null,
      expiresAt: row.invitationExpiresAt?.toISOString() ?? null,
    })),
    counts: { pending, accepted },
    pagination: { page, hasMore: page * 25 < total },
  };
}

export async function sendGuestInvitation(
  userId: Types.ObjectId,
  weddingId: string,
  input: z.infer<typeof guestInviteSchema>,
) {
  const parsed = guestInviteSchema.parse(input);
  const { wedding } = await authorizeWeddingMemberAdmin(userId, weddingId);
  const config = requireResendConfig();
  const email = parsed.email.toLowerCase();
  const token = createVerificationToken();
  const tokenHash = hashVerificationToken(token);
  const fields = {
    fullName: parsed.fullName,
    email,
    normalizedEmail: email,
    invitationTokenHash: tokenHash,
    rsvpTokenHash: tokenHash,
    rsvpExpiresAt: new Date(Date.now() + 7 * 86400000),
    rsvpRevokedAt: null,
    invitationStatus: "PENDING" as const,
    invitationExpiresAt: new Date(Date.now() + 7 * 86400000),
  };
  let guest = await GuestModel.findOne({
    weddingId: wedding._id,
    normalizedEmail: email,
    deletedAt: null,
  });
  if (guest) {
    const updated = await GuestModel.findOneAndUpdate(
      {
        _id: guest._id,
        weddingId: wedding._id,
        normalizedEmail: email,
        deletedAt: null,
        $or: [
          { invitationStatus: { $exists: false } },
          { invitationStatus: { $in: ["REVOKED", "FAILED"] } },
          {
            invitationStatus: "PENDING",
            invitationExpiresAt: { $lte: new Date() },
          },
        ],
      },
      {
        $set: fields,
        $unset: { invitationSentAt: 1, invitationAcceptedAt: 1 },
      },
      { returnDocument: "after" },
    );
    if (!updated)
      throw new AppError(
        "This guest already has a pending or accepted invitation.",
        "GUEST_ALREADY_INVITED",
        409,
      );
    guest = updated;
  } else {
    try {
      guest = await GuestModel.create({ weddingId: wedding._id, ...fields });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      )
        throw new AppError(
          "This guest already has an invitation.",
          "GUEST_ALREADY_INVITED",
          409,
        );
      throw error;
    }
  }
  const url = new URL(`/invite/${token}`, environment.APP_URL);
  const receiptUrl = new URL(
    "/guest-invitation",
    environment.APP_URL,
  );
  receiptUrl.searchParams.set("token", token);
  try {
    const result = await new Resend(config.apiKey).emails.send({
      from: config.fromEmail,
      to: email,
      subject: `You are invited to ${wedding.weddingName}`,
      text: `Hello ${parsed.fullName}, you are invited to ${wedding.weddingName}. View your personal invitation and RSVP: ${url.toString()}\nThis link expires in 7 days. No account is needed. This invitation does not grant wedding dashboard access.\nTo acknowledge receipt separately: ${receiptUrl.toString()}`,
    });
    if (result.error) throw new Error("Guest email delivery rejected");
    await GuestModel.updateOne(
      {
        _id: guest._id,
        weddingId: wedding._id,
        deletedAt: null,
        invitationTokenHash: tokenHash,
      },
      { $set: { invitationSentAt: new Date() } },
    );
  } catch {
    await GuestModel.updateOne(
      {
        _id: guest._id,
        weddingId: wedding._id,
        deletedAt: null,
        invitationTokenHash: tokenHash,
      },
      { $set: { invitationStatus: "FAILED", rsvpRevokedAt: new Date() } },
    );
    throw new AppError(
      "The guest invitation could not be delivered. Check your Resend sender and recipient permissions, then retry.",
      "INVITATION_DELIVERY_FAILED",
      502,
    );
  }
  return { guestId: guest._id.toString(), status: "PENDING" };
}

export async function revokeGuestInvitation(
  userId: Types.ObjectId,
  weddingId: string,
  guestId: string,
) {
  const { wedding } = await authorizeWeddingMemberAdmin(userId, weddingId);
  const result = await GuestModel.updateOne(
    {
      _id: guestId,
      weddingId: wedding._id,
      deletedAt: null,
      invitationStatus: "PENDING",
    },
    { $set: { invitationStatus: "REVOKED", rsvpRevokedAt: new Date() } },
  );
  if (!result.modifiedCount)
    throw new AppError(
      "Only pending guest invitations can be revoked.",
      "INVITATION_NOT_PENDING",
      409,
    );
  return { guestId, status: "REVOKED" };
}

export async function acceptGuestInvitation(token: string) {
  await connectToDatabase();
  const hash = hashVerificationToken(token);
  const guest = await GuestModel.findOne({
    invitationTokenHash: hash,
    deletedAt: null,
  }).lean();
  if (!guest)
    throw new AppError(
      "This invitation is invalid.",
      "INVALID_INVITATION",
      404,
    );
  const wedding = await Wedding.findOne({
    _id: guest.weddingId,
    status: { $ne: "DELETED" },
  })
    .select("weddingName")
    .lean();
  if (!wedding)
    throw new AppError(
      "This wedding is no longer available.",
      "WEDDING_NOT_FOUND",
      404,
    );
  if (guest.invitationStatus !== "ACCEPTED") {
    const accepted = await GuestModel.findOneAndUpdate(
      {
        _id: guest._id,
        weddingId: wedding._id,
        deletedAt: null,
        invitationTokenHash: hash,
        invitationStatus: "PENDING",
        invitationSentAt: { $ne: null },
        invitationExpiresAt: { $gt: new Date() },
      },
      {
        $set: {
          invitationStatus: "ACCEPTED",
          invitationAcceptedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );
    if (!accepted)
      throw new AppError(
        "This invitation expired or was revoked. Ask the wedding admin for a new invitation.",
        "INVITATION_UNAVAILABLE",
        410,
      );
  }
  return { weddingName: wedding.weddingName, status: "ACCEPTED" };
}
