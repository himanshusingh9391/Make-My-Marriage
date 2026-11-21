import "server-only";
import { type Types } from "mongoose";

import { AppError } from "@/lib/http/app-error";
import { WeddingEvent, type EventDocument } from "./model";
import {
  eventSchema,
  objectIdSchema,
  eventPageSchema,
  type EventInput,
  type EventView,
} from "./schemas";

export { authorizeWeddingPlanning as authorizeEvents } from "@/features/weddings/access";
import { authorizeWeddingPlanning as authorizeEvents } from "@/features/weddings/access";

function serialize(event: EventDocument): EventView {
  return {
    id: event._id.toString(),
    name: event.name,
    type: event.type,
    description: event.description,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate?.toISOString() ?? null,
    timezone: event.timezone,
    venue: {
      name: event.venue?.name ?? "",
      address: event.venue?.address ?? "",
    },
    dressCode: event.dressCode,
    notes: event.notes,
    rsvpDeadline: event.rsvpDeadline?.toISOString() ?? null,
    maxAttendees: event.maxAttendees ?? null,
    status: event.status,
    updatedAt: event.updatedAt.toISOString(),
  };
}

export async function listEvents(
  userId: Types.ObjectId,
  weddingId: string,
  page = 1,
) {
  const wedding = await authorizeEvents(userId, weddingId);
  page = eventPageSchema.parse(page);
  const filter = { weddingId: wedding._id, deletedAt: null };
  const [events, total] = await Promise.all([
    WeddingEvent.find(filter)
      .sort({ startDate: 1, _id: 1 })
      .skip((page - 1) * 20)
      .limit(20)
      .lean(),
    WeddingEvent.countDocuments(filter),
  ]);
  return {
    events: events.map(serialize),
    timezone: wedding.timezone,
    pagination: { page, total, hasMore: page * 20 < total },
  };
}

export async function getEvent(
  userId: Types.ObjectId,
  weddingId: string,
  eventId: string,
) {
  const wedding = await authorizeEvents(userId, weddingId);
  objectIdSchema.parse(eventId);
  const event = await WeddingEvent.findOne({
    _id: eventId,
    weddingId: wedding._id,
    deletedAt: null,
  }).lean();
  if (!event) throw new AppError("Event not found.", "EVENT_NOT_FOUND", 404);
  return serialize(event);
}

export async function saveEvent(
  userId: Types.ObjectId,
  weddingId: string,
  input: EventInput,
  eventId?: string,
) {
  const wedding = await authorizeEvents(userId, weddingId, true);
  const { expectedUpdatedAt, ...parsed } = eventSchema.parse(input);
  const data = { ...parsed, timezone: wedding.timezone };
  if (!eventId)
    return serialize(
      await WeddingEvent.create({ ...data, weddingId: wedding._id }),
    );
  objectIdSchema.parse(eventId);
  if (!expectedUpdatedAt)
    throw new AppError(
      "Reload the event before editing it.",
      "EVENT_VERSION_REQUIRED",
      400,
    );
  const event = await WeddingEvent.findOneAndUpdate(
    {
      _id: eventId,
      weddingId: wedding._id,
      deletedAt: null,
      updatedAt: new Date(expectedUpdatedAt),
    },
    { $set: data },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!event) {
    if (
      !(await WeddingEvent.exists({
        _id: eventId,
        weddingId: wedding._id,
        deletedAt: null,
      }))
    )
      throw new AppError("Event not found.", "EVENT_NOT_FOUND", 404);
    throw new AppError(
      "Someone updated this event. Reload the page and review the latest details before saving.",
      "EVENT_CHANGED",
      409,
    );
  }
  return serialize(event);
}

export async function deleteEvent(
  userId: Types.ObjectId,
  weddingId: string,
  eventId: string,
) {
  const wedding = await authorizeEvents(userId, weddingId, true);
  objectIdSchema.parse(eventId);
  // Retain references for future RSVP/history; removed events are never listed or counted.
  const event = await WeddingEvent.findOneAndUpdate(
    { _id: eventId, weddingId: wedding._id, deletedAt: null },
    { $set: { deletedAt: new Date(), status: "CANCELLED" } },
  );
  if (!event) throw new AppError("Event not found.", "EVENT_NOT_FOUND", 404);
  return { eventId, removed: true };
}
