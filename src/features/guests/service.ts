import "server-only";
import mongoose, { Types, type PipelineStage } from "mongoose";
import { authorizeWeddingPlanning } from "@/features/weddings/access";
import { WeddingEvent } from "@/features/events/model";
import {
  createVerificationToken,
  hashVerificationToken,
} from "@/features/auth/security";
import { AppError } from "@/lib/http/app-error";
import { GuestModel } from "./model";
import {
  guestInputSchema,
  guestUpdateSchema,
  guestQuerySchema,
  guestIdSchema,
  type GuestQuery,
  type GuestView,
  type GuestOptions,
  type GuestListData,
} from "./schemas";
function db() {
  if (!mongoose.connection.db) throw new Error("Database unavailable");
  return mongoose.connection.db;
}
interface Assignment {
  weddingId: Types.ObjectId;
  guestId: Types.ObjectId;
  eventId: Types.ObjectId;
  maxAttendees: number;
}
interface Response {
  weddingId: Types.ObjectId;
  guestId: Types.ObjectId;
  eventId: Types.ObjectId;
  status: string;
  attendeeCount: number;
  guestMessage?: string;
}
interface Row {
  _id: Types.ObjectId;
  fullName: string;
  email?: string;
  phone?: string;
  groupName?: string;
  notes?: string;
  maxPartySize?: number;
  updatedAt: Date;
  assignments: Assignment[];
  responses: Response[];
  householdCount?: number;
  rsvpStatus: string;
}
export async function guestOptions(
  userId: Types.ObjectId,
  weddingId: string,
): Promise<GuestOptions> {
  const wedding = await authorizeWeddingPlanning(userId, weddingId);
  const events = await WeddingEvent.find({
    weddingId: wedding._id,
    deletedAt: null,
    status: { $ne: "CANCELLED" },
  })
    .sort({ startDate: 1 })
    .lean();
  return {
    timezone: wedding.timezone,
    events: events.map((e) => ({
      id: e._id.toString(),
      name: e.name,
      date: e.startDate.toISOString(),
    })),
  };
}
function joins(weddingId: Types.ObjectId): PipelineStage[] {
  return [
    {
      $lookup: {
        from: "guest_events",
        let: { guest: "$_id" },
        pipeline: [
          { $match: { weddingId, $expr: { $eq: ["$guestId", "$$guest"] } } },
        ],
        as: "assignments",
      },
    },
    {
      $lookup: {
        from: "rsvps",
        let: { guest: "$_id", events: "$assignments.eventId" },
        pipeline: [
          {
            $match: {
              weddingId,
              $expr: {
                $and: [
                  { $eq: ["$guestId", "$$guest"] },
                  { $in: ["$eventId", "$$events"] },
                ],
              },
            },
          },
        ],
        as: "responses",
      },
    },
    {
      $set: {
        rsvpStatus: {
          $switch: {
            branches: [
              {
                case: { $in: ["$householdStatus", ["YES", "NO"]] },
                then: "$householdStatus",
              },
              {
                case: { $eq: [{ $size: "$assignments" }, 0] },
                then: "PENDING",
              },
              {
                case: {
                  $and: [
                    {
                      $eq: [{ $size: "$responses" }, { $size: "$assignments" }],
                    },
                    { $setEquals: ["$responses.status", ["YES"]] },
                  ],
                },
                then: "YES",
              },
              {
                case: {
                  $and: [
                    {
                      $eq: [{ $size: "$responses" }, { $size: "$assignments" }],
                    },
                    { $setEquals: ["$responses.status", ["NO"]] },
                  ],
                },
                then: "NO",
              },
              {
                case: {
                  $eq: [
                    {
                      $size: {
                        $setDifference: ["$responses.status", ["PENDING"]],
                      },
                    },
                    0,
                  ],
                },
                then: "PENDING",
              },
            ],
            default: "MIXED",
          },
        },
      },
    },
  ];
}
async function views(
  rows: Row[],
  weddingId: Types.ObjectId,
): Promise<GuestView[]> {
  const events = await WeddingEvent.find({
    weddingId,
    _id: { $in: rows.flatMap((r) => r.assignments.map((a) => a.eventId)) },
  })
    .select("name deletedAt status")
    .lean();
  return rows.map((r) => ({
    id: r._id.toString(),
    fullName: r.fullName,
    email: r.email ?? "",
    phone: r.phone ?? "",
    groupName: r.groupName ?? "",
    notes: r.notes ?? "",
    maxPartySize: r.maxPartySize ?? 1,
    updatedAt: r.updatedAt.toISOString(),
    eventIds: r.assignments.map((a) => a.eventId.toString()),
    rsvpStatus: r.rsvpStatus,
    householdCount: r.householdCount,
    events: r.assignments.map((a) => {
      const e = events.find((e) => e._id.equals(a.eventId));
      const response = r.responses.find((v) => v.eventId.equals(a.eventId));
      return {
        id: a.eventId.toString(),
        name: e
          ? e.name +
            (e.deletedAt || e.status === "CANCELLED" ? " (unavailable)" : "")
          : "Unavailable event",
        status: response?.status ?? "PENDING",
        attendeeCount: response?.attendeeCount ?? 0,
        guestMessage: response?.guestMessage ?? "",
      };
    }),
  }));
}
export async function listGuests(
  userId: Types.ObjectId,
  weddingId: string,
  input: GuestQuery,
): Promise<GuestListData> {
  const wedding = await authorizeWeddingPlanning(userId, weddingId);
  const q = guestQuerySchema.parse(input);
  const match: Record<string, unknown> = {
    weddingId: wedding._id,
    deletedAt: null,
  };
  if (q.q) {
    const escaped = q.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    match.$or = ["fullName", "email", "phone", "groupName"].map((field) => ({
      [field]: { $regex: escaped, $options: "i" },
    }));
  }
  const pipeline: PipelineStage[] = [{ $match: match }, ...joins(wedding._id)];
  if (q.eventId)
    pipeline.push({
      $match: { "assignments.eventId": new Types.ObjectId(q.eventId) },
    });
  if (q.rsvpStatus) pipeline.push({ $match: { rsvpStatus: q.rsvpStatus } });
  pipeline.push({
    $facet: {
      rows: [
        { $sort: { createdAt: -1, _id: -1 } },
        { $skip: (q.page - 1) * 25 },
        { $limit: 25 },
      ],
      count: [{ $count: "total" }],
    },
  });
  const [result] = await GuestModel.aggregate<{
    rows: Row[];
    count: { total: number }[];
  }>(pipeline);
  const total = result.count[0]?.total ?? 0;
  return {
    guests: await views(result.rows, wedding._id),
    total,
    page: q.page,
    hasMore: q.page * 25 < total,
  };
}
export async function getGuest(
  userId: Types.ObjectId,
  weddingId: string,
  id: string,
): Promise<GuestView> {
  const wedding = await authorizeWeddingPlanning(userId, weddingId);
  guestIdSchema.parse(id);
  const rows = await GuestModel.aggregate<Row>([
    {
      $match: {
        _id: new Types.ObjectId(id),
        weddingId: wedding._id,
        deletedAt: null,
      },
    },
    ...joins(wedding._id),
  ]);
  if (!rows.length)
    throw new AppError("Guest not found.", "GUEST_NOT_FOUND", 404);
  return (await views(rows, wedding._id))[0];
}
export async function saveGuest(
  userId: Types.ObjectId,
  weddingId: string,
  input: unknown,
  id?: string,
) {
  const wedding = await authorizeWeddingPlanning(userId, weddingId, true);
  const parsed = id
    ? guestUpdateSchema.parse(input)
    : guestInputSchema.parse(input);
  if (id) guestIdSchema.parse(id);
  const guestId = id ? new Types.ObjectId(id) : new Types.ObjectId();
  const { eventIds, ...values } = guestInputSchema.parse(
    Object.fromEntries(
      Object.entries(parsed).filter(([key]) => key !== "expectedUpdatedAt"),
    ),
  );
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const scope = { weddingId: wedding._id, guestId };
      const previous = id
        ? await GuestModel.findOne({
            _id: guestId,
            weddingId: wedding._id,
            deletedAt: null,
          })
            .session(session)
            .lean()
        : null;
      if (id && !previous)
        throw new AppError("Guest not found.", "GUEST_NOT_FOUND", 404);
      const existing = await db()
        .collection<Assignment>("guest_events")
        .find(scope, { session })
        .toArray();
      const active = await WeddingEvent.find({
        weddingId: wedding._id,
        _id: { $in: eventIds },
        deletedAt: null,
        status: { $ne: "CANCELLED" },
      })
        .session(session)
        .lean();
      if (
        eventIds.some(
          (e) =>
            !active.some((a) => a._id.toString() === e) &&
            !existing.some((a) => a.eventId.toString() === e),
        )
      )
        throw new AppError(
          "Choose events from this wedding.",
          "INVALID_GUEST_EVENT",
          400,
        );
      const responses = await db()
        .collection<Response>("rsvps")
        .find(scope, { session })
        .toArray();
      if (
        responses.some(
          (r) =>
            r.status !== "PENDING" && !eventIds.includes(r.eventId.toString()),
        )
      )
        throw new AppError(
          "An event with an RSVP response cannot be removed from this guest.",
          "GUEST_HAS_RSVP",
          409,
        );
      if (
        responses.some(
          (r) => r.status === "YES" && r.attendeeCount > values.maxPartySize,
        )
      )
        throw new AppError(
          "Party size cannot be below confirmed attendance.",
          "PARTY_SIZE_TOO_SMALL",
          409,
        );
      const email = values.email.toLowerCase();
      if (previous) {
        const expected = guestUpdateSchema.parse(parsed).expectedUpdatedAt;
        const changedEmail = (previous.normalizedEmail ?? "") !== email;
        const result = await GuestModel.updateOne(
          {
            _id: guestId,
            weddingId: wedding._id,
            deletedAt: null,
            updatedAt: new Date(expected),
          },
          {
            $set: {
              ...values,
              email,
              ...(email ? { normalizedEmail: email } : {}),
              ...(changedEmail
                ? {
                    invitationTokenHash: hashVerificationToken(
                      createVerificationToken(),
                    ),
                  }
                : {}),
            },
            $unset: {
              ...(!email ? { normalizedEmail: 1 } : {}),
              ...(changedEmail
                ? {
                    invitationStatus: 1,
                    invitationSentAt: 1,
                    invitationExpiresAt: 1,
                    invitationAcceptedAt: 1,
                    rsvpTokenHash: 1,
                    rsvpExpiresAt: 1,
                  }
                : {}),
            },
          },
          { session, runValidators: true },
        );
        if (!result.matchedCount)
          throw new AppError(
            "This guest changed. Refresh before saving again.",
            "GUEST_CHANGED",
            409,
          );
      } else {
        await GuestModel.create(
          [
            {
              _id: guestId,
              weddingId: wedding._id,
              ...values,
              email,
              ...(email ? { normalizedEmail: email } : {}),
              invitationTokenHash: hashVerificationToken(
                createVerificationToken(),
              ),
            },
          ],
          { session },
        );
      }
      const removed = existing
        .filter((a) => !eventIds.includes(a.eventId.toString()))
        .map((a) => a.eventId);
      await db()
        .collection("guest_events")
        .deleteMany({ ...scope, eventId: { $in: removed } }, { session });
      await db()
        .collection("rsvps")
        .deleteMany(
          { ...scope, eventId: { $in: removed }, status: "PENDING" },
          { session },
        );
      if (eventIds.length)
        await db()
          .collection("guest_events")
          .bulkWrite(
            eventIds.map((e) => ({
              updateOne: {
                filter: { ...scope, eventId: new Types.ObjectId(e) },
                update: {
                  $set: {
                    maxAttendees: values.maxPartySize,
                    updatedAt: new Date(),
                  },
                  $setOnInsert: { createdAt: new Date() },
                },
                upsert: true,
              },
            })),
            { session },
          );
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    )
      throw new AppError(
        "A guest with this email already exists in this wedding.",
        "GUEST_EMAIL_EXISTS",
        409,
      );
    throw error;
  } finally {
    await session.endSession();
  }
  return getGuest(userId, weddingId, guestId.toString());
}
export async function deleteGuest(
  userId: Types.ObjectId,
  weddingId: string,
  id: string,
) {
  const wedding = await authorizeWeddingPlanning(userId, weddingId, true);
  guestIdSchema.parse(id);
  const result = await GuestModel.updateOne(
    { _id: id, weddingId: wedding._id, deletedAt: null },
    {
      $set: {
        deletedAt: new Date(),
        invitationStatus: "REVOKED",
        rsvpRevokedAt: new Date(),
      },
      $unset: { normalizedEmail: 1 },
    },
  );
  if (!result.matchedCount)
    throw new AppError("Guest not found.", "GUEST_NOT_FOUND", 404);
  return { guestId: id, removed: true };
}
