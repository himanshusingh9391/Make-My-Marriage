import { z } from "zod";
import { guestIdSchema } from "@/features/guests/schemas";
export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const rsvpResponseSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("YES"),
      attendeeCount: z.number().int().min(1).max(1000),
      guestMessage: z.string().trim().max(1000).default(""),
    })
    .strict(),
  z
    .object({
      status: z.literal("NO"),
      attendeeCount: z.literal(0),
      guestMessage: z.string().trim().max(1000).default(""),
    })
    .strict(),
]);
export const rsvpBatchSchema = z
  .object({
    responses: z
      .array(
        z
          .object({ eventId: guestIdSchema, response: rsvpResponseSchema })
          .strict(),
      )
      .min(1)
      .max(100)
      .refine(
        (rows) => new Set(rows.map((r) => r.eventId)).size === rows.length,
        "Choose each event once.",
      ),
  })
  .strict();
export type RsvpResponse = z.infer<typeof rsvpResponseSchema>;
export type PersonalInvitation = {
  guestName: string;
  weddingName: string;
  partnerOneName: string;
  partnerTwoName: string;
  weddingDate: string | null;
  city: string;
  timezone: string;
  description: string;
  expiresAt: string;
  events: {
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string | null;
    venueName: string;
    address: string;
    dressCode: string;
    maxAttendees: number;
    deadline: string | null;
    closed: boolean;
    status: "PENDING" | "YES" | "NO";
    attendeeCount: number;
    guestMessage: string;
  }[];
};
