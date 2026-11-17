import { z } from "zod";

export const createWeddingInvitationSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(["ADMIN", "MANAGER"]),
}).strict();

export const invitationTokenSchema = z.object({
  token: z.string().trim().min(32).max(128),
}).strict();

export type CreateWeddingInvitationInput = z.infer<typeof createWeddingInvitationSchema>;

export const invitationPageSchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) });
export const memberRemovalSchema = z.object({ weddingId: z.string().regex(/^[a-f\d]{24}$/i), memberId: z.string().regex(/^[a-f\d]{24}$/i) });
