import "server-only";
import mongoose, { Types, type ClientSession } from "mongoose";
import { GuestModel } from "@/features/guests/model";
import { Wedding } from "@/features/auth/models/wedding";
import { WeddingSettings } from "@/features/weddings/models/wedding-settings";
import { WeddingEvent } from "@/features/events/model";
import { authorizeWeddingPlanning } from "@/features/weddings/access";
import { guestIdSchema } from "@/features/guests/schemas";
import {
  createVerificationToken,
  hashVerificationToken,
} from "@/features/auth/security";
import { connectToDatabase } from "@/lib/db/mongoose";
import { environment } from "@/lib/env/env";
import { AppError } from "@/lib/http/app-error";
import {
  invitationTokenSchema,
  rsvpBatchSchema,
  type PersonalInvitation,
} from "./schemas";
interface Assignment {
  weddingId: Types.ObjectId;
  guestId: Types.ObjectId;
  eventId: Types.ObjectId;
  maxAttendees: number;
}
interface Rsvp {
  weddingId: Types.ObjectId;
  guestId: Types.ObjectId;
  eventId: Types.ObjectId;
  status: "PENDING" | "YES" | "NO";
  attendeeCount: number;
  guestMessage?: string;
}
function db() {
  if (!mongoose.connection.db) throw new Error("Database unavailable");
  return mongoose.connection.db;
}
const unavailable = () =>
  new AppError(
    "This invitation is invalid, expired, or revoked. Please ask the wedding team for a new link.",
    "INVITATION_UNAVAILABLE",
    410,
  );
async function resolve(token: string, session?: ClientSession) {
  if (!invitationTokenSchema.safeParse(token).success) throw unavailable();
  await connectToDatabase();
  const guest = await GuestModel.findOne({
    rsvpTokenHash: hashVerificationToken(token),
    deletedAt: null,
    rsvpRevokedAt: null,
    rsvpExpiresAt: { $gt: new Date() },
  })
    .session(session ?? null)
    .lean();
  if (!guest) throw unavailable();
  const wedding = await Wedding.findOne({
    _id: guest.weddingId,
    status: { $nin: ["DELETED", "ARCHIVED"] },
  })
    .session(session ?? null)
    .lean();
  if (!wedding) throw unavailable();
  return { guest, wedding };
}
export async function getRsvpLinkState(
  userId: Types.ObjectId,
  weddingId: string,
  guestId: string,
) {
  const wedding = await authorizeWeddingPlanning(userId, weddingId);
  guestIdSchema.parse(guestId);
  const guest = await GuestModel.findOne({
    _id: guestId,
    weddingId: wedding._id,
    deletedAt: null,
  })
    .select("rsvpExpiresAt rsvpRevokedAt")
    .lean();
  if (!guest) throw new AppError("Guest not found.", "GUEST_NOT_FOUND", 404);
  return {
    active: Boolean(
      guest.rsvpExpiresAt &&
      guest.rsvpExpiresAt > new Date() &&
      !guest.rsvpRevokedAt,
    ),
    expiresAt: guest.rsvpExpiresAt?.toISOString() ?? null,
  };
}
export async function createRsvpLink(
  userId: Types.ObjectId,
  weddingId: string,
  guestId: string,
) {
  const wedding = await authorizeWeddingPlanning(userId, weddingId, true);
  guestIdSchema.parse(guestId);
  const token = createVerificationToken();
  const expiresAt = new Date(Date.now() + 30 * 86400000);
  const guest = await GuestModel.findOneAndUpdate(
    { _id: guestId, weddingId: wedding._id, deletedAt: null },
    {
      $set: {
        rsvpTokenHash: hashVerificationToken(token),
        rsvpExpiresAt: expiresAt,
        rsvpRevokedAt: null,
      },
    },
    { returnDocument: "after" },
  ).lean();
  if (!guest) throw new AppError("Guest not found.", "GUEST_NOT_FOUND", 404);
  return {
    url: new URL(
      `/invite/${token}`,
      environment.APP_URL,
    ).toString(),
    expiresAt: expiresAt.toISOString(),
    active: true,
  };
}
export async function revokeRsvpLink(
  userId: Types.ObjectId,
  weddingId: string,
  guestId: string,
) {
  const wedding = await authorizeWeddingPlanning(userId, weddingId, true);
  guestIdSchema.parse(guestId);
  const result = await GuestModel.updateOne(
    { _id: guestId, weddingId: wedding._id, deletedAt: null },
    { $set: { rsvpRevokedAt: new Date() } },
  );
  if (!result.matchedCount)
    throw new AppError("Guest not found.", "GUEST_NOT_FOUND", 404);
  return { active: false };
}
export async function getPersonalInvitation(
  token: string,
): Promise<PersonalInvitation> {
  const { guest, wedding } = await resolve(token);
  const scope = { weddingId: wedding._id, guestId: guest._id };
  const assignments = await db()
    .collection<Assignment>("guest_events")
    .find(scope)
    .toArray();
  const [events, responses, settings] = await Promise.all([
    WeddingEvent.find({
      weddingId: wedding._id,
      _id: { $in: assignments.map((a) => a.eventId) },
      deletedAt: null,
      status: { $ne: "CANCELLED" },
    })
      .sort({ startDate: 1, _id: 1 })
      .lean(),
    db()
      .collection<Rsvp>("rsvps")
      .find({ ...scope, eventId: { $in: assignments.map((a) => a.eventId) } })
      .toArray(),
    WeddingSettings.findOne({ weddingId: wedding._id }).lean(),
  ]);
  return {
    guestName: guest.fullName,
    weddingName: wedding.weddingName,
    partnerOneName: wedding.partnerOneName,
    partnerTwoName: wedding.partnerTwoName,
    weddingDate: wedding.weddingDate?.toISOString() ?? null,
    city: wedding.city,
    timezone: wedding.timezone,
    description: settings?.description ?? "",
    expiresAt: guest.rsvpExpiresAt!.toISOString(),
    events: events.map((e) => {
      const assignment = assignments.find((a) => a.eventId.equals(e._id))!;
      const r = responses.find((r) => r.eventId.equals(e._id));
      return {
        id: e._id.toString(),
        name: e.name,
        description: e.description,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate?.toISOString() ?? null,
        venueName: e.venue?.name ?? "",
        address: e.venue?.address ?? "",
        dressCode: e.dressCode,
        maxAttendees: Math.min(
          assignment.maxAttendees,
          guest.maxPartySize ?? 1,
        ),
        deadline: e.rsvpDeadline?.toISOString() ?? null,
        closed: Boolean(e.rsvpDeadline && e.rsvpDeadline <= new Date()),
        status: r?.status ?? "PENDING",
        attendeeCount: r?.attendeeCount ?? 0,
        guestMessage: r?.guestMessage ?? "",
      };
    }),
  };
}
export async function saveRsvps(token: string, input: unknown) {
  const parsed = rsvpBatchSchema.parse(input);
  invitationTokenSchema.parse(token);
  await connectToDatabase();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { guest, wedding } = await resolve(token, session);
      const scope = { weddingId: wedding._id, guestId: guest._id };
      const now = new Date();
      // Serialize with guest edits, deletion, token rotation, and wedding archive.
      const lockedGuest = await db()
        .collection("guests")
        .updateOne(
          {
            _id: guest._id,
            weddingId: wedding._id,
            deletedAt: null,
            rsvpTokenHash: hashVerificationToken(token),
            rsvpRevokedAt: null,
            rsvpExpiresAt: { $gt: now },
          },
          { $inc: { rsvpRevision: 1 } },
          { session },
        );
      const lockedWedding = await db()
        .collection("weddings")
        .updateOne(
          { _id: wedding._id, status: { $nin: ["DELETED", "ARCHIVED"] } },
          { $inc: { rsvpRevision: 1 } },
          { session },
        );
      if (!lockedGuest.matchedCount || !lockedWedding.matchedCount)
        throw unavailable();
      for (const { eventId, response } of [...parsed.responses].sort((a, b) =>
        a.eventId.localeCompare(b.eventId),
      )) {
        const eventObjectId = new Types.ObjectId(eventId);
        const assignment = await db()
          .collection<Assignment>("guest_events")
          .findOne({ ...scope, eventId: eventObjectId }, { session });
        const event = await WeddingEvent.findOne({
          _id: eventObjectId,
          weddingId: wedding._id,
          deletedAt: null,
          status: { $ne: "CANCELLED" },
        })
          .session(session)
          .lean();
        if (!assignment || !event)
          throw new AppError(
            "This event is no longer available on your invitation. Refresh to see your current itinerary.",
            "EVENT_NOT_ASSIGNED",
            403,
          );
        if (event.rsvpDeadline && event.rsvpDeadline <= now)
          throw new AppError(
            `The RSVP deadline for ${event.name} has passed. Contact the wedding team.`,
            "RSVP_CLOSED",
            409,
          );
        if (
          response.attendeeCount >
          Math.min(assignment.maxAttendees, guest.maxPartySize ?? 1)
        )
          throw new AppError(
            `Your invitation limit for ${event.name} is ${Math.min(assignment.maxAttendees, guest.maxPartySize ?? 1)} people.`,
            "RSVP_PARTY_LIMIT",
            400,
          );
        // All writers for this event take the same lock before calculating capacity.
        await db()
          .collection("events")
          .updateOne(
            { _id: eventObjectId, weddingId: wedding._id },
            { $inc: { rsvpRevision: 1 } },
            { session },
          );
        if (
          response.status === "YES" &&
          event.maxAttendees !== null &&
          event.maxAttendees !== undefined
        ) {
          const totals = await db()
            .collection<Rsvp>("rsvps")
            .aggregate<{ total: number }>(
              [
                {
                  $match: {
                    weddingId: wedding._id,
                    eventId: eventObjectId,
                    status: "YES",
                    guestId: { $ne: guest._id },
                  },
                },
                {
                  $lookup: {
                    from: "guests",
                    let: { id: "$guestId" },
                    pipeline: [
                      {
                        $match: {
                          weddingId: wedding._id,
                          deletedAt: null,
                          $expr: { $eq: ["$_id", "$$id"] },
                        },
                      },
                    ],
                    as: "guest",
                  },
                },
                { $match: { "guest.0": { $exists: true } } },
                { $group: { _id: null, total: { $sum: "$attendeeCount" } } },
              ],
              { session },
            )
            .toArray();
          if (
            (totals[0]?.total ?? 0) + response.attendeeCount >
            event.maxAttendees
          )
            throw new AppError(
              `There are not enough remaining places for ${event.name}. Please contact the wedding team.`,
              "EVENT_CAPACITY_REACHED",
              409,
            );
        }
        await db()
          .collection("rsvps")
          .updateOne(
            { ...scope, eventId: eventObjectId },
            {
              $set: { ...response, respondedAt: now, updatedAt: now },
              $setOnInsert: { createdAt: now },
            },
            { session, upsert: true },
          );
      }
    });
  } finally {
    await session.endSession();
  }
  return getPersonalInvitation(token);
}

export async function getRsvpOverview(
  userId: Types.ObjectId,
  weddingId: string,
) {
  const wedding = await authorizeWeddingPlanning(userId, weddingId);
  const [counts] = await db()
    .collection("guest_events")
    .aggregate<{
      yes: number;
      no: number;
      pending: number;
      expectedHeadcount: number;
    }>([
      { $match: { weddingId: wedding._id } },
      {
        $lookup: {
          from: "guests",
          let: { id: "$guestId" },
          pipeline: [
            {
              $match: {
                weddingId: wedding._id,
                deletedAt: null,
                $expr: { $eq: ["$_id", "$$id"] },
              },
            },
          ],
          as: "guest",
        },
      },
      {
        $lookup: {
          from: "events",
          let: { id: "$eventId" },
          pipeline: [
            {
              $match: {
                weddingId: wedding._id,
                deletedAt: null,
                status: { $ne: "CANCELLED" },
                $expr: { $eq: ["$_id", "$$id"] },
              },
            },
          ],
          as: "event",
        },
      },
      {
        $match: { "guest.0": { $exists: true }, "event.0": { $exists: true } },
      },
      {
        $lookup: {
          from: "rsvps",
          let: { guest: "$guestId", event: "$eventId" },
          pipeline: [
            {
              $match: {
                weddingId: wedding._id,
                $expr: {
                  $and: [
                    { $eq: ["$guestId", "$$guest"] },
                    { $eq: ["$eventId", "$$event"] },
                  ],
                },
              },
            },
          ],
          as: "responses",
        },
      },
      { $set: { response: { $first: "$responses" } } },
      {
        $unionWith: {
          coll: "guests",
          pipeline: [
            {
              $match: {
                weddingId: wedding._id,
                deletedAt: null,
                householdStatus: { $in: ["YES", "NO"] },
              },
            },
            {
              $project: {
                response: {
                  status: "$householdStatus",
                  attendeeCount: "$householdCount",
                },
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: null,
          yes: {
            $sum: { $cond: [{ $eq: ["$response.status", "YES"] }, 1, 0] },
          },
          no: { $sum: { $cond: [{ $eq: ["$response.status", "NO"] }, 1, 0] } },
          pending: {
            $sum: {
              $cond: [
                {
                  $in: [
                    { $ifNull: ["$response.status", "PENDING"] },
                    ["PENDING"],
                  ],
                },
                1,
                0,
              ],
            },
          },
          expectedHeadcount: {
            $sum: {
              $cond: [
                { $eq: ["$response.status", "YES"] },
                "$response.attendeeCount",
                0,
              ],
            },
          },
        },
      },
    ])
    .toArray();
  return counts
    ? {
        yes: counts.yes,
        no: counts.no,
        pending: counts.pending,
        expectedHeadcount: counts.expectedHeadcount,
      }
    : { yes: 0, no: 0, pending: 0, expectedHeadcount: 0 };
}
