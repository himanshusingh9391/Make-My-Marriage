import { z } from "zod";

export const eventTypes = [
  "HALDI",
  "MEHENDI",
  "SANGEET",
  "WEDDING",
  "RECEPTION",
  "CUSTOM",
] as const;
export const eventStatuses = ["DRAFT", "PUBLISHED", "CANCELLED"] as const;
export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid resource ID");
export const eventParamsSchema = z.object({
  weddingId: objectIdSchema,
  eventId: objectIdSchema,
});
export const eventPageSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(100000)
  .default(1);
const instant = z.string().datetime({ offset: true });
export const eventSchema = z
  .object({
    name: z.string().trim().min(1, "Enter an event name").max(150),
    type: z.enum(eventTypes),
    description: z.string().trim().max(2000).default(""),
    startDate: instant,
    endDate: instant.nullable().default(null),
    venue: z
      .object({
        name: z.string().trim().max(150).default(""),
        address: z.string().trim().max(500).default(""),
      })
      .strict(),
    dressCode: z.string().trim().max(200).default(""),
    notes: z.string().trim().max(2000).default(""),
    rsvpDeadline: instant.nullable().default(null),
    maxAttendees: z
      .number()
      .int()
      .positive()
      .max(1000000)
      .nullable()
      .default(null),
    status: z.enum(eventStatuses).default("DRAFT"),
    expectedUpdatedAt: instant.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.endDate &&
      Date.parse(value.endDate) <= Date.parse(value.startDate)
    )
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message:
          "End must be after the start. For overnight events, choose the next day.",
      });
    if (
      value.rsvpDeadline &&
      Date.parse(value.rsvpDeadline) > Date.parse(value.startDate)
    )
      ctx.addIssue({
        code: "custom",
        path: ["rsvpDeadline"],
        message: "RSVP deadline must be on or before the event start.",
      });
  });
export type EventInput = z.infer<typeof eventSchema>;
export type EventView = EventInput & {
  id: string;
  timezone: string;
  updatedAt: string;
};
