import { eventSchema } from "./schemas";
import { toInstant } from "./dates";

export function readEventForm(form: FormData, timezone: string) {
  const text = (key: string) => String(form.get(key) ?? "");
  const endDate = text("endDay"),
    endTime = text("endTime");
  if (Boolean(endDate) !== Boolean(endTime))
    throw new Error("Provide both end date and end time, or leave both empty.");
  const result = eventSchema.safeParse({
    name: text("name"),
    type: text("type"),
    description: text("description"),
    startDate: toInstant(`${text("startDay")}T${text("startTime")}`, timezone),
    endDate:
      endDate && endTime ? toInstant(`${endDate}T${endTime}`, timezone) : null,
    venue: { name: text("venueName"), address: text("address") },
    dressCode: text("dressCode"),
    notes: text("notes"),
    rsvpDeadline: text("rsvpDeadline")
      ? toInstant(text("rsvpDeadline"), timezone)
      : null,
    maxAttendees: text("maxAttendees") ? Number(text("maxAttendees")) : null,
    status: text("status") || "DRAFT",
  });
  if (!result.success)
    throw new Error(
      result.error.issues.map((issue) => issue.message).join(" "),
    );
  return result.data;
}
