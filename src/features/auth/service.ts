import "server-only";
import argon2 from "argon2";
import { Resend } from "resend";
import { connectToDatabase } from "@/lib/db/mongoose";
import { environment, requireResendConfig } from "@/lib/env/env";
import { AppError } from "@/lib/http/app-error";
import { logger } from "@/lib/logger";
import { EmailVerificationToken } from "./models/email-verification-token";
import { PasswordResetToken } from "./models/password-reset-token";
import { RateLimitEntry } from "./models/rate-limit-entry";
import { UserSession } from "./models/user-session";
import { User, type UserDocument } from "./models/user";
import { Wedding } from "./models/wedding";
import { registerSchema, type LoginInput, type RegisterInput } from "./schemas";
import {
  createSessionToken,
  createVerificationToken,
  createWeddingSlug,
  hashSessionToken,
  hashVerificationToken,
  REMEMBERED_SESSION_DAYS,
} from "./security";
import { createHmac } from "node:crypto";

const emailVerificationLifetimeMs = 24 * 60 * 60 * 1000;
const passwordResetLifetimeMs = 60 * 60 * 1000;
const oneDayMs = 24 * 60 * 60 * 1000;

function getClientKey(ip: string, email: string): string {
  const secret = environment.RATE_LIMIT_SECRET;
  if (!secret) {
    throw new AppError("Authentication security is not configured.", "SERVER_CONFIGURATION_ERROR", 503);
  }

  return createHmac("sha256", secret)
    .update(`${ip.toLowerCase()}:${email.trim().toLowerCase()}`)
    .digest("hex");
}

export async function enforceAuthRateLimit(
  action: string,
  ip: string,
  email: string,
  maxAttempts = 8,
): Promise<void> {
  await connectToDatabase();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  const keyHash = `${action}:${getClientKey(ip, email)}`;
  let entry;
  try {
    entry = await RateLimitEntry.findOneAndUpdate(
      { keyHash },
      { $inc: { attempts: 1 }, $set: { expiresAt } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).lean();
  } catch (error) {
    const duplicate =
      typeof error === "object" && error !== null && "code" in error && error.code === 11000;
    if (!duplicate) throw error;
    entry = await RateLimitEntry.findOneAndUpdate(
      { keyHash },
      { $inc: { attempts: 1 }, $set: { expiresAt } },
      { returnDocument: "after" },
    ).lean();
  }

  if (entry && entry.attempts > maxAttempts) {
    throw new AppError("Too many attempts. Please try again in a few minutes.", "RATE_LIMITED", 429);
  }
}

function resendClient(): Resend {
  try {
    const config = requireResendConfig();
    return new Resend(config.apiKey);
  } catch {
    throw new AppError(
      "Email verification is not configured yet.",
      "EMAIL_SERVICE_UNAVAILABLE",
      503,
    );
  }
}

async function sendVerificationEmail(
  email: string,
  partnerOneName: string,
  token: string,
): Promise<void> {
  const client = resendClient();
  const verificationUrl = new URL("/verify-email", environment.NEXT_PUBLIC_APP_URL);
  verificationUrl.searchParams.set("token", token);
  let fromEmail: string;

  try {
    fromEmail = requireResendConfig().fromEmail;
  } catch {
    throw new AppError("Email verification is not configured yet.", "EMAIL_SERVICE_UNAVAILABLE", 503);
  }

  const { error } = await client.emails.send({
    from: fromEmail,
    to: email,
    subject: "Verify your Make My Marriage account",
    html: `<p>Hello ${partnerOneName.replace(/[&<>"']/g, " ")},</p><p>Confirm your email to access your wedding suite.</p><p><a href="${verificationUrl.toString()}">Verify email address</a></p><p>This link expires in 24 hours.</p>`,
    text: `Hello ${partnerOneName}, verify your Make My Marriage account: ${verificationUrl.toString()} (this link expires in 24 hours).`,
  });

  if (error) {
    logger.error("Verification email delivery failed");
    throw new AppError("We could not send the verification email. Please try again.", "EMAIL_DELIVERY_FAILED", 502);
  }
}

export async function registerAccountAndWedding(input: RegisterInput) {
  const parsed = registerSchema.parse(input);
  const emailVerificationEnabled = environment.NODE_ENV !== "development" || Boolean(
    environment.RESEND_API_KEY && environment.RESEND_FROM_EMAIL,
  );
  if (emailVerificationEnabled) resendClient();
  await connectToDatabase();
  const normalizedEmail = parsed.email.trim().toLowerCase();

  const existingUser = await User.findOne({ normalizedEmail });
  if (existingUser?.status === "PENDING_VERIFICATION") {
    await resendVerificationForEmail(normalizedEmail);
    return { message: "If this account needs verification, a new link has been sent." };
  }
  if (existingUser) {
    throw new AppError("An account with this email already exists.", "EMAIL_ALREADY_REGISTERED", 409);
  }

  const passwordHash = await argon2.hash(parsed.password, { type: argon2.argon2id });
  const verificationToken = emailVerificationEnabled ? createVerificationToken() : null;
  let user: UserDocument;
  try {
    user = await User.create({
      fullName: parsed.partnerOneName,
      email: normalizedEmail,
      normalizedEmail,
      passwordHash,
      status: emailVerificationEnabled ? "PENDING_VERIFICATION" : "ACTIVE",
      emailVerifiedAt: emailVerificationEnabled ? null : new Date(),
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      throw new AppError("An account with this email already exists.", "EMAIL_ALREADY_REGISTERED", 409);
    }
    throw error;
  }

  try {
    const coupleName = `${parsed.partnerOneName} & ${parsed.partnerTwoName}`;
    await Wedding.create({
      ownerUserId: user._id,
      weddingName: coupleName,
      slug: createWeddingSlug(coupleName),
      partnerOneName: parsed.partnerOneName,
      partnerTwoName: parsed.partnerTwoName,
      weddingDate: parsed.weddingDate ? new Date(`${parsed.weddingDate}T00:00:00.000Z`) : null,
      city: parsed.city,
      timezone: "Asia/Kolkata",
      status: "DRAFT",
    });

    if (verificationToken) {
      await EmailVerificationToken.create({
        userId: user._id,
        tokenHash: hashVerificationToken(verificationToken),
        expiresAt: new Date(Date.now() + emailVerificationLifetimeMs),
      });
    }
  } catch (error) {
    await Promise.all([
      Wedding.deleteMany({ ownerUserId: user._id }),
      EmailVerificationToken.deleteMany({ userId: user._id }),
      User.deleteOne({ _id: user._id }),
    ]);
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      throw new AppError("An account with this email already exists.", "EMAIL_ALREADY_REGISTERED", 409);
    }
    throw error;
  }

  if (verificationToken) {
    try {
      await sendVerificationEmail(normalizedEmail, parsed.partnerOneName, verificationToken);
      return {
        message: "Your wedding suite is ready. Verify your email to sign in.",
        emailVerificationRequired: true,
      };
    } catch {
      logger.error("Verification email delivery failed after account creation");
      return {
        message: "Your wedding suite was created, but we could not send the verification email. Request a new link before signing in.",
        emailVerificationRequired: true,
      };
    }
  }
  logger.info("Email verification skipped for local development account");
  return {
    message: "Your wedding suite is ready. Sign in to continue.",
    emailVerificationRequired: false,
  };
}

export async function verifyEmailAddress(token: string): Promise<void> {
  await connectToDatabase();
  const tokenHash = hashVerificationToken(token);
  const verification = await EmailVerificationToken.findOneAndUpdate({
    tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }, { $set: { usedAt: new Date() } }, { returnDocument: "after" });

  if (!verification) {
    const previouslyUsed = await EmailVerificationToken.findOne({ tokenHash }).lean();
    if (
      previouslyUsed?.usedAt &&
      await User.exists({ _id: previouslyUsed.userId, emailVerifiedAt: { $ne: null } })
    ) {
      return;
    }
    throw new AppError("This verification link is invalid or expired.", "INVALID_VERIFICATION_TOKEN", 400);
  }

  const user = await User.findById(verification.userId);
  if (!user || user.status === "SUSPENDED") {
    throw new AppError("This verification link is invalid or expired.", "INVALID_VERIFICATION_TOKEN", 400);
  }

  user.emailVerifiedAt = new Date();
  user.status = "ACTIVE";
  await user.save();
}

export async function resendVerificationForEmail(email: string): Promise<void> {
  await connectToDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ normalizedEmail, status: "PENDING_VERIFICATION" });
  if (!user) return;

  const wedding = await Wedding.findOne({ ownerUserId: user._id, status: "DRAFT" });
  if (!wedding) return;

  const token = createVerificationToken();
  await EmailVerificationToken.updateMany(
    { userId: user._id, usedAt: null },
    { $set: { usedAt: new Date() } },
  );
  await EmailVerificationToken.create({
    userId: user._id,
    tokenHash: hashVerificationToken(token),
    expiresAt: new Date(Date.now() + emailVerificationLifetimeMs),
  });
  try {
    await sendVerificationEmail(normalizedEmail, wedding.partnerOneName, token);
  } catch {
    logger.error("Verification email resend failed");
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  await connectToDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ normalizedEmail, status: "ACTIVE" });
  if (!user) return;

  const token = createVerificationToken();
  await PasswordResetToken.updateMany(
    { userId: user._id, usedAt: null },
    { $set: { usedAt: new Date() } },
  );
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: hashVerificationToken(token),
    expiresAt: new Date(Date.now() + passwordResetLifetimeMs),
  });

  try {
    const client = resendClient();
    const config = requireResendConfig();
    const resetUrl = new URL("/reset-password", environment.NEXT_PUBLIC_APP_URL);
    resetUrl.searchParams.set("token", token);
    const { error } = await client.emails.send({
      from: config.fromEmail,
      to: normalizedEmail,
      subject: "Reset your Make My Marriage password",
      html: `<p>Use the link below to reset your password. It expires in one hour.</p><p><a href="${resetUrl.toString()}">Reset password</a></p>`,
      text: `Reset your Make My Marriage password: ${resetUrl.toString()} (this link expires in one hour).`,
    });
    if (error) logger.error("Password reset email delivery failed");
  } catch {
    logger.error("Password reset email service unavailable");
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await connectToDatabase();
  const resetToken = await PasswordResetToken.findOneAndUpdate(
    {
      tokenHash: hashVerificationToken(token),
      usedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { usedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!resetToken) {
    throw new AppError("This password link is invalid or expired.", "INVALID_RESET_TOKEN", 400);
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await Promise.all([
    User.updateOne({ _id: resetToken.userId }, { $set: { passwordHash } }),
    UserSession.updateMany(
      { userId: resetToken.userId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    ),
  ]);
}

export async function authenticateUser(
  input: LoginInput,
): Promise<{ token: string; expiresAt: Date; user: UserDocument }> {
  await connectToDatabase();
  const normalizedEmail = input.email.trim().toLowerCase();
  const user = await User.findOne({ normalizedEmail });
  const passwordMatches = user
    ? await argon2.verify(user.passwordHash, input.password).catch(() => false)
    : false;

  if (!user || !passwordMatches) {
    throw new AppError("Email or password is incorrect.", "INVALID_CREDENTIALS", 401);
  }
  if (user.status === "SUSPENDED") {
    throw new AppError("This account is unavailable.", "ACCOUNT_UNAVAILABLE", 403);
  }
  if (!user.emailVerifiedAt || user.status !== "ACTIVE") {
    throw new AppError("Verify your email before signing in.", "EMAIL_NOT_VERIFIED", 403);
  }

  const token = createSessionToken();
  const sessionDays = input.rememberMe ? REMEMBERED_SESSION_DAYS : 1;
  const expiresAt = new Date(Date.now() + sessionDays * oneDayMs);
  await UserSession.create({
    userId: user._id,
    sessionTokenHash: hashSessionToken(token),
    expiresAt,
  });
  user.lastLoginAt = new Date();
  await user.save();
  return { token, expiresAt, user };
}

export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await connectToDatabase();
  await UserSession.updateOne(
    { sessionTokenHash: hashSessionToken(token), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export async function getSessionUser(token: string | undefined): Promise<UserDocument | null> {
  if (!token) return null;
  await connectToDatabase();
  const session = await UserSession.findOne({
    sessionTokenHash: hashSessionToken(token),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;

  return User.findOne({ _id: session.userId, status: "ACTIVE", emailVerifiedAt: { $ne: null } });
}
