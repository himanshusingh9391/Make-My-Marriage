import "server-only";
import mongoose, { type Types } from "mongoose";
import { Resend } from "resend";
import { createHmac } from "node:crypto";
import { connectToDatabase } from "@/lib/db/mongoose";
import { environment, requireResendConfig } from "@/lib/env/env";
import { isResendTestingSender } from "@/lib/env/resend-config-schema";
import { AppError } from "@/lib/http/app-error";
import { logger } from "@/lib/logger";
import { User } from "@/features/auth/models/user";
import { createVerificationToken } from "@/features/auth/security";
import { Wedding } from "@/features/auth/models/wedding";
import { createWeddingInvitationSchema, type CreateWeddingInvitationInput } from "./invitation-schemas";
import { WeddingInvitation } from "./models/wedding-invitation";
import { WeddingMembership } from "./models/wedding-membership";

const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1000;

export async function authorizeWeddingMemberAdmin(userId: Types.ObjectId, weddingId: string) {
  if (!mongoose.isValidObjectId(weddingId)) {
    throw new AppError("Wedding workspace not found.", "WEDDING_NOT_FOUND", 404);
  }
  await connectToDatabase();
  const wedding = await Wedding.findOne({ _id: weddingId, status: { $ne: "DELETED" } }).lean();
  if (!wedding) throw new AppError("Wedding workspace not found.", "WEDDING_NOT_FOUND", 404);
  if (wedding.ownerUserId.toString() === userId.toString()) return { wedding, actorRole: "OWNER" as const };

  const membership = await WeddingMembership.findOne({ weddingId: wedding._id, userId }).lean();
  if (!membership || !["ADMIN", "MANAGER"].includes(membership.role)) {
    throw new AppError("Only the wedding owner, Admins, and Managers can manage invitations.", "FORBIDDEN", 403);
  }
  return { wedding, actorRole: membership.role };
}

export async function canManageWeddingInvitations(userId: Types.ObjectId, weddingId: string): Promise<boolean> {
  if (!mongoose.isValidObjectId(weddingId)) return false;
  await connectToDatabase();
  const wedding = await Wedding.findOne({ _id: weddingId, status: { $ne: "DELETED" } }).select("ownerUserId").lean();
  if (!wedding) return false;
  if (wedding.ownerUserId.toString() === userId.toString()) return true;
  return Boolean(await WeddingMembership.exists({ weddingId: wedding._id, userId, role: { $in: ["ADMIN", "MANAGER"] } }));
}

function invitationStatus(invitation: {
  acceptedAt?: Date | null;
  revokedAt?: Date | null;
  expiresAt: Date;
}): "ACCEPTED" | "REVOKED" | "EXPIRED" | "PENDING" {
  if (invitation.acceptedAt) return "ACCEPTED";
  if (invitation.revokedAt) return "REVOKED";
  if (invitation.expiresAt <= new Date()) return "EXPIRED";
  return "PENDING";
}

export async function listWeddingMembers(userId: Types.ObjectId, weddingId: string, page = 1) {
  if (!mongoose.isValidObjectId(weddingId)) throw new AppError("Wedding workspace not found.", "WEDDING_NOT_FOUND", 404);
  await connectToDatabase();
  const wedding = await Wedding.findOne({ _id: weddingId, status: { $ne: "DELETED" } }).lean();
  if (!wedding) throw new AppError("Wedding workspace not found.", "WEDDING_NOT_FOUND", 404);
  const isOwner = wedding.ownerUserId.toString() === userId.toString();
  const currentMembership = isOwner ? null : await WeddingMembership.findOne({ weddingId: wedding._id, userId }).lean();
  if (!isOwner && !currentMembership) throw new AppError("You are not a member of this wedding workspace.", "FORBIDDEN", 403);
  const memberships = await WeddingMembership.find({ weddingId: wedding._id }).sort({ joinedAt: 1 }).lean();
  const memberIds = memberships.map((membership) => membership.userId);
  const [ownerUser, memberUsers, invitations] = await Promise.all([
    User.findById(wedding.ownerUserId).select("fullName email").lean(),
    User.find({ _id: { $in: memberIds } }).select("fullName email").lean(),
    WeddingInvitation.find({ weddingId: wedding._id }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 50).limit(50).lean(),
  ]);
  const usersById = new Map(memberUsers.map((member) => [member._id.toString(), member]));
  const members = [
    ...(ownerUser ? [{ id: wedding.ownerUserId.toString(), fullName: ownerUser.fullName, email: ownerUser.email, role: "OWNER" as const, joinedAt: wedding.createdAt.toISOString() }] : []),
    ...memberships.flatMap((membership) => {
      const member = usersById.get(membership.userId.toString());
      return member ? [{
        id: membership.userId.toString(), fullName: member.fullName, email: member.email,
        role: membership.role, joinedAt: membership.joinedAt.toISOString(),
      }] : [];
    }),
  ];
  const [total, pending, accepted] = await Promise.all([
    WeddingInvitation.countDocuments({ weddingId: wedding._id }),
    WeddingInvitation.countDocuments({ weddingId: wedding._id, acceptedAt: null, revokedAt: null, expiresAt: { $gt: new Date() } }),
    WeddingInvitation.countDocuments({ weddingId: wedding._id, acceptedAt: { $ne: null } }),
  ]);
  return {
    counts: { pending, accepted },
    pagination: { page, hasMore: page * 50 < total },
    wedding: { id: wedding._id.toString(), title: wedding.weddingName },
    members,
    invitations: invitations.map((invitation) => ({
      id: invitation._id.toString(), email: invitation.email, role: invitation.role,
      status: invitationStatus(invitation), deliveryStatus: invitation.deliveryStatus,
      expiresAt: invitation.expiresAt.toISOString(), createdAt: invitation.createdAt.toISOString(),
      sentAt: invitation.sentAt?.toISOString() ?? null, deliveryError: invitation.deliveryError ?? null,
    })),
  };
}

export async function removeWeddingMember(userId: Types.ObjectId, weddingId: string, memberId: string) {
  const { wedding, actorRole } = await authorizeWeddingMemberAdmin(userId, weddingId);
  if (wedding.ownerUserId.toString() === memberId || userId.toString() === memberId) {
    throw new AppError("The owner and your own membership cannot be removed here.", "MEMBER_REMOVAL_FORBIDDEN", 403);
  }
  const member = await WeddingMembership.findOne({ weddingId: wedding._id, userId: memberId });
  if (!member) throw new AppError("Member not found.", "MEMBER_NOT_FOUND", 404);
  if (actorRole !== "OWNER" && member.role === "ADMIN") {
    throw new AppError("Only the wedding owner can remove an Admin.", "FORBIDDEN", 403);
  }
  await WeddingMembership.deleteOne({ _id: member._id, weddingId: wedding._id });
  return { memberId, removed: true };
}

function hashInvitationToken(token: string): string {
  const secret = environment.TOKEN_HASH_SECRET;
  if (!secret) throw new AppError("Token security is not configured.", "SERVER_CONFIGURATION_ERROR", 503);
  return createHmac("sha256", secret).update(token).digest("hex");
}

function htmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export async function createWeddingInvitation(
  userId: Types.ObjectId,
  weddingId: string,
  input: CreateWeddingInvitationInput,
) {
  const parsed = createWeddingInvitationSchema.parse(input);
  const { wedding } = await authorizeWeddingMemberAdmin(userId, weddingId);
  const resendConfig = requireResendConfig();
  const normalizedEmail = parsed.email.toLowerCase();
  const existingUser = await User.findOne({ normalizedEmail }).select("_id").lean();
  if (existingUser && wedding.ownerUserId.toString() === existingUser._id.toString()) {
    throw new AppError("This person already owns the wedding workspace.", "ALREADY_A_MEMBER", 409);
  }
  if (existingUser && await WeddingMembership.exists({ weddingId: wedding._id, userId: existingUser._id })) {
    throw new AppError("This person is already a member of the wedding.", "ALREADY_A_MEMBER", 409);
  }
  if (await WeddingInvitation.exists({
    weddingId: wedding._id, normalizedEmail, acceptedAt: null, revokedAt: null, expiresAt: { $gt: new Date() },
  })) {
    throw new AppError("An active invitation already exists for this email address.", "INVITATION_ALREADY_PENDING", 409);
  }

  const activeInvitationKey = `${wedding._id.toString()}:${normalizedEmail}`;
  await WeddingInvitation.updateMany(
    { weddingId: wedding._id, normalizedEmail, acceptedAt: null, revokedAt: null, expiresAt: { $lte: new Date() } },
    { $unset: { activeInvitationKey: 1 } },
  );

  const token = createVerificationToken();
  let invitation;
  let resendErrorCode: string | null = null;
  let testRecipientRestricted = false;
  try {
    invitation = await WeddingInvitation.create({
      weddingId: wedding._id, invitedByUserId: userId, email: normalizedEmail, normalizedEmail,
      role: parsed.role, tokenHash: hashInvitationToken(token),
      activeInvitationKey,
      expiresAt: new Date(Date.now() + invitationLifetimeMs), deliveryStatus: "PENDING",
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      throw new AppError("An active invitation already exists for this email address.", "INVITATION_ALREADY_PENDING", 409);
    }
    throw error;
  }
  try {
    const client = new Resend(resendConfig.apiKey);
    const acceptUrl = new URL("/invitations/accept", environment.NEXT_PUBLIC_APP_URL);
    acceptUrl.searchParams.set("token", token);
    const safeTitle = htmlEscape(wedding.weddingName);
    const { error } = await client.emails.send({
      from: resendConfig.fromEmail,
      to: normalizedEmail,
      subject: `You’re invited to plan ${wedding.weddingName}`,
      html: `<p>You’ve been invited to join <strong>${safeTitle}</strong> as a ${parsed.role.toLowerCase()}.</p><p><a href="${acceptUrl.toString()}">Accept wedding invitation</a></p><p>This private link expires in 7 days and can only be accepted by ${htmlEscape(normalizedEmail)}.</p>`,
      text: `You’ve been invited to join ${wedding.weddingName} as a ${parsed.role.toLowerCase()}. Accept the invitation: ${acceptUrl.toString()} This private link expires in 7 days and can only be accepted by ${normalizedEmail}.`,
    });
    if (error) {
      resendErrorCode = error.name;
      testRecipientRestricted = isResendTestingSender(resendConfig.fromEmail)
        && /only send testing emails/i.test(error.message);
      throw new Error("Resend rejected the invitation email.");
    }
    await WeddingInvitation.updateOne({ _id: invitation._id }, { $set: { deliveryStatus: "SENT", sentAt: new Date(), deliveryError: null } });
  } catch (error) {
    const failureType = resendErrorCode
      ? `Resend ${resendErrorCode}`
      : error instanceof Error ? error.name : "UnknownError";
    logger.error(`Wedding invitation email failed (${failureType}).`);
    await WeddingInvitation.updateOne({ _id: invitation._id }, {
      $set: { deliveryStatus: "FAILED", deliveryError: "Email delivery failed. Check the Resend API key and verified sender, then create a new invitation.", revokedAt: new Date() },
      $unset: { activeInvitationKey: 1 },
    });
    if (error instanceof AppError) throw error;
    if (testRecipientRestricted) {
      throw new AppError(
        "Resend's onboarding@resend.dev sender can only send to the email address associated with your Resend account. Invite that address for testing, or verify your own domain to invite other people.",
        "RESEND_TEST_SENDER_RESTRICTED",
        503,
      );
    }
    const safeProviderCode = resendErrorCode && /^[a-z0-9_]{1,64}$/i.test(resendErrorCode) ? ` (${resendErrorCode})` : "";
    throw new AppError(`The invitation was saved, but Resend could not deliver it${safeProviderCode}. Check the sending domain and Resend email logs.`, "INVITATION_DELIVERY_FAILED", 502);
  }
  return { invitationId: invitation._id.toString(), email: normalizedEmail, role: parsed.role, expiresAt: invitation.expiresAt.toISOString(), deliveryStatus: "SENT" as const };
}

export async function revokeWeddingInvitation(userId: Types.ObjectId, weddingId: string, invitationId: string) {
  const { wedding } = await authorizeWeddingMemberAdmin(userId, weddingId);
  if (!mongoose.isValidObjectId(invitationId)) throw new AppError("Invitation not found.", "INVITATION_NOT_FOUND", 404);
  const invitation = await WeddingInvitation.findOne({ _id: invitationId, weddingId: wedding._id });
  if (!invitation) throw new AppError("Invitation not found.", "INVITATION_NOT_FOUND", 404);
  if (invitation.acceptedAt) throw new AppError("This invitation has already been accepted.", "INVITATION_ALREADY_ACCEPTED", 409);
  if (invitation.revokedAt) return { invitationId, status: "REVOKED" as const };
  if (invitation.expiresAt <= new Date()) throw new AppError("This invitation has already expired.", "INVITATION_EXPIRED", 410);
  const revoked = await WeddingInvitation.updateOne(
    { _id: invitation._id, weddingId: wedding._id, acceptedAt: null, revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date() }, $unset: { activeInvitationKey: 1 } },
  );
  if (!revoked.modifiedCount) {
    throw new AppError("This invitation changed. Refresh the list and try again.", "INVITATION_CHANGED", 409);
  }
  return { invitationId, status: "REVOKED" as const };
}

export async function getInvitationPreview(token: string) {
  await connectToDatabase();
  const invitation = await WeddingInvitation.findOne({ tokenHash: hashInvitationToken(token) }).lean();
  if (!invitation) throw new AppError("This invitation link is invalid.", "INVALID_INVITATION", 404);
  const wedding = await Wedding.findById(invitation.weddingId).select("weddingName partnerOneName partnerTwoName status").lean();
  const status = wedding?.status === "DELETED" ? "REVOKED" : invitationStatus(invitation);
  return {
    email: invitation.email, role: invitation.role, weddingName: wedding?.weddingName ?? "Wedding workspace",
    coupleNames: wedding ? `${wedding.partnerOneName} & ${wedding.partnerTwoName}` : "",
    status, weddingId: invitation.weddingId.toString(),
    deliveryStatus: invitation.deliveryStatus,
  };
}

export async function acceptWeddingInvitation(userId: Types.ObjectId, token: string) {
  await connectToDatabase();
  return mongoose.connection.transaction(async (session) => {
    const invitation = await WeddingInvitation.findOne({
      tokenHash: hashInvitationToken(token), acceptedAt: null, revokedAt: null, expiresAt: { $gt: new Date() }, deliveryStatus: "SENT",
    }).select("+tokenHash").session(session);
    if (!invitation) {
      const prior = await WeddingInvitation.findOne({ tokenHash: hashInvitationToken(token) }).session(session).lean();
      if (prior?.revokedAt) throw new AppError("This invitation was cancelled. Ask the wedding admin for a new invitation.", "INVITATION_REVOKED", 410);
      if (prior?.expiresAt && prior.expiresAt <= new Date()) throw new AppError("This invitation link has expired. Ask the wedding admin for a new invitation.", "INVITATION_EXPIRED", 410);
      if (prior?.acceptedAt) throw new AppError("This invitation has already been used.", "INVITATION_ALREADY_ACCEPTED", 409);
      throw new AppError("This invitation link is invalid.", "INVALID_INVITATION", 404);
    }
    const user = await User.findOne({ _id: userId, status: "ACTIVE" }).select("normalizedEmail").session(session).lean();
    if (!user) throw new AppError("Sign in to accept this invitation.", "UNAUTHENTICATED", 401);
    if (user.normalizedEmail !== invitation.normalizedEmail) {
      throw new AppError(`This invitation was sent to ${invitation.email}. Sign in with that email address to join.`, "INVITATION_EMAIL_MISMATCH", 403);
    }
    const wedding = await Wedding.findOne({ _id: invitation.weddingId, status: { $ne: "DELETED" } }).session(session).lean();
    if (!wedding) throw new AppError("This wedding workspace is no longer available.", "WEDDING_NOT_FOUND", 404);
    if (wedding.ownerUserId.toString() === userId.toString() || await WeddingMembership.exists({ weddingId: invitation.weddingId, userId }).session(session)) {
      throw new AppError("Your account is already a member of this wedding.", "ALREADY_A_MEMBER", 409);
    }
    try {
      await WeddingMembership.create([{ weddingId: invitation.weddingId, userId, role: invitation.role, invitedByUserId: invitation.invitedByUserId, joinedAt: new Date() }], { session });
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && error.code === 11000)) throw error;
      throw new AppError("Your account is already a member of this wedding.", "ALREADY_A_MEMBER", 409);
    }
    invitation.acceptedAt = new Date();
    await invitation.save({ session });
    await WeddingInvitation.updateOne({ _id: invitation._id }, { $unset: { activeInvitationKey: 1 } }, { session });
    return { weddingId: invitation.weddingId.toString(), weddingName: wedding.weddingName, role: invitation.role };
  });
}

