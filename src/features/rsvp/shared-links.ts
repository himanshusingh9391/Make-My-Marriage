import "server-only";
import mongoose, { Types } from "mongoose";
import {
  sharedSettings,
  sharedRegistration,
  householdResponse,
  householdUpdate,
} from "./shared-schemas";
import { Wedding } from "@/features/auth/models/wedding";
import {
  createVerificationToken,
  hashVerificationToken,
} from "@/features/auth/security";
import { GuestModel } from "@/features/guests/model";
import { WeddingEvent } from "@/features/events/model";
import { authorizeWeddingPlanning } from "@/features/weddings/access";
import { connectToDatabase } from "@/lib/db/mongoose";
import { environment } from "@/lib/env/env";
import { AppError } from "@/lib/http/app-error";
import { invitationTokenSchema } from "./schemas";

interface SharedLink {
  _id: Types.ObjectId;
  nonce: string;
  tokenHash: string;
  eventIds?: Types.ObjectId[];
  maxPartySize?: number;
  expiresAt: Date;
}
function links() {
  return mongoose.connection.db!.collection<SharedLink>("shared_rsvp_links");
}
function tokenFor(nonce: string) {
  return Buffer.from(
    hashVerificationToken("shared-invitation:" + nonce),
    "hex",
  ).toString("base64url");
}
function view(link: SharedLink | null) {
  if (!link || link.expiresAt <= new Date()) return null;
  return {
    url: new URL(
      "/invite/open/" + tokenFor(link.nonce),
      environment.NEXT_PUBLIC_APP_URL,
    ).href,
    expiresAt: link.expiresAt.toISOString(),
  };
}
const unavailable = () =>
  new AppError(
    "This invitation is unavailable. Please contact the wedding team.",
    "INVITATION_UNAVAILABLE",
    410,
  );

export async function getSharedLink(user: Types.ObjectId, id: string) {
  const wedding = await authorizeWeddingPlanning(user, id);
  return view(await links().findOne({ _id: wedding._id }));
}
export async function setSharedLink(
  user: Types.ObjectId,
  id: string,
  input: unknown,
) {
  const wedding = await authorizeWeddingPlanning(user, id, true);
  const values = Object.keys(input ?? {}).length
    ? sharedSettings.parse(input)
    : undefined;
  const eventIds = values?.eventIds.map((id) => new Types.ObjectId(id));
  if (
    eventIds &&
    (await WeddingEvent.countDocuments({
      _id: { $in: eventIds },
      weddingId: wedding._id,
      deletedAt: null,
      status: { $ne: "CANCELLED" },
    })) !== eventIds.length
  )
    throw new AppError(
      "Choose available events from this wedding.",
      "INVALID_EVENTS",
      400,
    );
  const nonce = createVerificationToken();
  const record = {
    _id: wedding._id,
    nonce,
    tokenHash: hashVerificationToken(tokenFor(nonce)),
    ...(values && { eventIds, maxPartySize: values.maxPartySize }),
    expiresAt: new Date(Date.now() + 30 * 86400000),
  };
  await links().replaceOne({ _id: wedding._id }, record, { upsert: true });
  return view(record);
}
export async function revokeSharedLink(user: Types.ObjectId, id: string) {
  const wedding = await authorizeWeddingPlanning(user, id, true);
  await mongoose.connection.transaction(async (session) => {
    await links().deleteOne({ _id: wedding._id }, { session });
    await GuestModel.updateMany(
      {
        weddingId: wedding._id,
        householdKey: { $type: "string" },
        deletedAt: null,
      },
      { $set: { rsvpRevokedAt: new Date() } },
      { session },
    );
  });
}
export async function sharedInvitation(token: string) {
  if (!invitationTokenSchema.safeParse(token).success) throw unavailable();
  await connectToDatabase();
  const link = await links().findOne({
    tokenHash: hashVerificationToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!link) throw unavailable();
  const wedding = await Wedding.findOne({
    _id: link._id,
    status: { $nin: ["ARCHIVED", "DELETED"] },
  }).lean();
  if (!wedding) throw unavailable();
  return { link, wedding };
}
export async function registerSharedGuest(token: string, input: unknown) {
  if (typeof input === "object" && input && "status" in input)
    return saveHousehold(token, input);
  const { name, visitorKey } = sharedRegistration.parse(input);
  const { link, wedding } = await sharedInvitation(token);
  const personal = tokenFor("guest:" + token + ":" + visitorKey);
  const rsvpTokenHash = hashVerificationToken(personal);
  await mongoose.connection.transaction(async (session) => {
    const current = await links().updateOne(
      {
        _id: wedding._id,
        tokenHash: link.tokenHash,
        expiresAt: { $gt: new Date() },
      },
      { $inc: { registrations: 1 } },
      { session },
    );
    if (!current.matchedCount) throw unavailable();
    const validWedding = await Wedding.collection.updateOne(
      { _id: wedding._id, status: { $nin: ["ARCHIVED", "DELETED"] } },
      { $inc: { rsvpRevision: 1 } },
      { session },
    );
    if (!validWedding.matchedCount) throw unavailable();
    if (
      await GuestModel.exists({
        weddingId: wedding._id,
        rsvpTokenHash,
        deletedAt: null,
      }).session(session)
    )
      return;
    const events = await WeddingEvent.find({
      weddingId: wedding._id,
      _id: { $in: link.eventIds },
      deletedAt: null,
      status: { $ne: "CANCELLED" },
      $or: [{ rsvpDeadline: null }, { rsvpDeadline: { $gt: new Date() } }],
    })
      .session(session)
      .select("_id")
      .lean();
    if (!events.length)
      throw new AppError(
        "RSVP is closed for these events.",
        "RSVP_CLOSED",
        409,
      );
    const [guest] = await GuestModel.create(
      [
        {
          weddingId: wedding._id,
          fullName: name,
          maxPartySize: link.maxPartySize,
          invitationTokenHash: hashVerificationToken(createVerificationToken()),
          rsvpTokenHash,
          rsvpExpiresAt: link.expiresAt,
        },
      ],
      { session },
    );
    const now = new Date();
    await mongoose.connection.db!.collection("guest_events").insertMany(
      events.map((event) => ({
        guestId: guest._id,
        weddingId: wedding._id,
        eventId: event._id,
        maxAttendees: link.maxPartySize,
        createdAt: now,
        updatedAt: now,
      })),
      { session },
    );
  });
  return { path: "/invite/" + personal };
}

export async function invitationSchedule(
  weddingId: Types.ObjectId,
  eventIds?: Types.ObjectId[],
) {
  return WeddingEvent.find({
    weddingId,
    deletedAt: null,
    ...(eventIds
      ? { _id: { $in: eventIds }, status: { $ne: "CANCELLED" } }
      : { status: "PUBLISHED" }),
  })
    .sort({ startDate: 1 })
    .select("name startDate venue dressCode")
    .lean();
}
export async function readHousehold(token: string, visitorKey: string) {
  const { wedding } = await sharedInvitation(token);
  const key = sharedRegistration.shape.visitorKey.parse(visitorKey);
  const guest = await GuestModel.findOne({
    weddingId: wedding._id,
    householdKey: hashVerificationToken(token + ":" + key),
    deletedAt: null,
  }).lean();
  return guest
    ? {
        name: guest.fullName,
        phone: guest.phone ?? "",
        status: guest.householdStatus,
        attendeeCount: guest.householdCount,
      }
    : null;
}
async function saveHousehold(token: string, input: unknown) {
  const values = householdResponse.parse(input);
  const { link, wedding } = await sharedInvitation(token);
  const householdToken = createVerificationToken();
  await mongoose.connection.transaction(async (session) => {
    const live = await links().updateOne(
      {
        _id: wedding._id,
        tokenHash: link.tokenHash,
        expiresAt: { $gt: new Date() },
      },
      { $inc: { registrations: 1 } },
      { session },
    );
    if (!live.matchedCount) throw unavailable();
    const active = await Wedding.collection.updateOne(
      { _id: wedding._id, status: { $nin: ["ARCHIVED", "DELETED"] } },
      { $inc: { rsvpRevision: 1 } },
      { session },
    );
    if (!active.matchedCount) throw unavailable();
    await GuestModel.updateOne(
      {
        weddingId: wedding._id,
        householdKey: hashVerificationToken(token + ":" + values.visitorKey),
        deletedAt: null,
      },
      {
        $set: {
          fullName: values.name,
          phone: values.phone,
          householdStatus: values.status,
          householdCount: values.attendeeCount,
          maxPartySize: Math.max(1, values.attendeeCount),
          rsvpTokenHash: hashVerificationToken(householdToken),
          rsvpExpiresAt: link.expiresAt,
          rsvpRevokedAt: null,
        },
        $setOnInsert: {
          invitationTokenHash: hashVerificationToken(createVerificationToken()),
        },
      },
      { session, upsert: true },
    );
  });
  return {
    name: values.name,
    phone: values.phone,
    status: values.status,
    attendeeCount: values.attendeeCount,
    path: "/invite/households/" + householdToken,
  };
}

async function resolveHouseholdToken(token: string) {
  if (!invitationTokenSchema.safeParse(token).success) throw unavailable();
  await connectToDatabase();
  const guest = await GuestModel.findOne({
    rsvpTokenHash: hashVerificationToken(token),
    rsvpExpiresAt: { $gt: new Date() },
    rsvpRevokedAt: null,
    deletedAt: null,
  })
    .select("+householdKey")
    .lean();
  if (!guest?.householdKey) throw unavailable();
  const wedding = await Wedding.findOne({
    _id: guest.weddingId,
    status: { $nin: ["ARCHIVED", "DELETED"] },
  }).lean();
  if (!wedding) throw unavailable();
  return { guest, wedding };
}

function householdView(guest: {
  fullName: string;
  phone?: string | null;
  householdStatus?: string | null;
  householdCount?: number | null;
}) {
  if (!guest.householdStatus || guest.householdCount == null)
    throw unavailable();
  return {
    name: guest.fullName,
    phone: guest.phone ?? "",
    status: guest.householdStatus as "YES" | "NO",
    attendeeCount: guest.householdCount,
  };
}

export async function readHouseholdByToken(token: string) {
  const { guest } = await resolveHouseholdToken(token);
  return householdView(guest);
}

export async function getHouseholdInvitation(token: string) {
  const { guest, wedding } = await resolveHouseholdToken(token);
  return {
    wedding: {
      weddingName: wedding.weddingName,
      partnerOneName: wedding.partnerOneName,
      partnerTwoName: wedding.partnerTwoName,
      weddingDate: wedding.weddingDate?.toISOString() ?? null,
      timezone: wedding.timezone,
    },
    response: householdView(guest),
    events: await invitationSchedule(wedding._id),
  };
}

export async function updateHouseholdByToken(token: string, input: unknown) {
  const values = householdUpdate.parse(input);
  const { guest, wedding } = await resolveHouseholdToken(token);
  await GuestModel.updateOne(
    {
      _id: guest._id,
      weddingId: wedding._id,
      rsvpTokenHash: hashVerificationToken(token),
      rsvpExpiresAt: { $gt: new Date() },
      rsvpRevokedAt: null,
      deletedAt: null,
    },
    {
      $set: {
        fullName: values.name,
        phone: values.phone,
        householdStatus: values.status,
        householdCount: values.attendeeCount,
        maxPartySize: Math.max(1, values.attendeeCount),
      },
    },
  );
  return {
    name: values.name,
    phone: values.phone,
    status: values.status,
    attendeeCount: values.attendeeCount,
  };
}
