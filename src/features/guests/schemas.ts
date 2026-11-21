import { z } from "zod";
export const guestIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i)
  .transform((value) => value.toLowerCase());
export const guestInputSchema = z
  .object({
    fullName: z.string().trim().min(1, "Enter the guest name.").max(120),
    email: z
      .union([z.literal(""), z.string().trim().email().max(254)])
      .default(""),
    phone: z
      .string()
      .trim()
      .max(30)
      .refine(
        (v) => !v || /^[+()\d\s.-]{5,30}$/.test(v),
        "Enter a valid phone number.",
      )
      .default(""),
    groupName: z.string().trim().max(120).default(""),
    notes: z.string().trim().max(2000).default(""),
    maxPartySize: z.number().int().min(1).max(1000),
    eventIds: z
      .array(guestIdSchema)
      .max(100)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Choose each event once.",
      )
      .default([]),
  })
  .strict();
export const guestUpdateSchema = guestInputSchema.extend({
  expectedUpdatedAt: z.string().datetime(),
});
export const guestQuerySchema = z
  .object({
    q: z.string().trim().max(120).default(""),
    eventId: guestIdSchema.optional(),
    rsvpStatus: z.enum(["PENDING", "YES", "NO", "MIXED"]).optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .strict();
export type GuestInput = z.infer<typeof guestInputSchema>;
export type GuestQuery = z.infer<typeof guestQuerySchema>;
export type GuestView = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  groupName: string;
  notes: string;
  maxPartySize: number;
  updatedAt: string;
  eventIds: string[];
  events: {
    id: string;
    name: string;
    status: string;
    attendeeCount: number;
    guestMessage: string;
  }[];
  householdCount?: number;
  rsvpStatus: string;
};
export type GuestOptions = {
  events: { id: string; name: string; date: string }[];
  timezone: string;
};
export type GuestListData = {
  guests: GuestView[];
  total: number;
  page: number;
  hasMore: boolean;
};
