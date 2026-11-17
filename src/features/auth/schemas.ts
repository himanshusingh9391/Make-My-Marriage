import { z } from "zod";

const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128, "Password must be 128 characters or fewer")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number")
  .regex(/[^A-Za-z0-9]/, "Add a symbol");

export const invitationReturnSchema = z.string().regex(/^\/invitations\/accept\?token=[A-Za-z0-9_-]{32,128}$/).optional();
export const resendVerificationSchema = z.object({ email: z.string().trim().email().max(254), nextTo: invitationReturnSchema });

export const registerSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  nextTo: invitationReturnSchema,
  email: z.string().trim().email().max(254),
  password: passwordSchema,
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().default(false),
});

export const verificationSchema = z.object({
  token: z.string().min(32).max(256),
});

export const emailSchema = z.object({ email: z.string().trim().email().max(254) });

export const passwordResetSchema = z.object({
  token: z.string().min(32).max(256),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
