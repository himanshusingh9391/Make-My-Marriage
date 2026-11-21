import { z } from "zod";
export const sharedSettings = z
  .object({
    eventIds: z
      .array(z.string().regex(/^[a-f0-9]{24}$/))
      .min(1)
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length),
    maxPartySize: z.number().int().min(1).max(1000),
  })
  .strict();
export const sharedRegistration = z
  .object({
    name: z.string().trim().min(1).max(120),
    phone: z
      .string()
      .trim()
      .max(30)
      .refine(
        (value) => !value || /^[+()\d\s.-]{5,30}$/.test(value),
        "Enter a valid phone number.",
      )
      .default(""),
    visitorKey: z.string().uuid(),
  })
  .strict();
const householdFields = z
  .object({
    name: sharedRegistration.shape.name,
    phone: sharedRegistration.shape.phone,
    status: z.enum(["YES", "NO"]),
    attendeeCount: z.number().int().min(0).max(1000),
  })
  .strict();

function validateAttendance<
  T extends { status: "YES" | "NO"; attendeeCount: number },
>(schema: z.ZodType<T>) {
  return schema.refine(
    (value) =>
      value.status === "YES"
        ? value.attendeeCount > 0
        : value.attendeeCount === 0,
    "Enter a valid attendance count.",
  );
}

export const householdResponse = validateAttendance(
  householdFields.extend({ visitorKey: sharedRegistration.shape.visitorKey }),
);

export const householdUpdate = validateAttendance(householdFields);
