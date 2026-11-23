import "server-only";
import { randomBytes, createHash, createHmac } from "node:crypto";
import mongoose, { Types } from "mongoose";
import { Wedding } from "@/features/auth/models/wedding";
import { WeddingEvent } from "@/features/events/model";
import { authorizeWeddingPlanning } from "@/features/weddings/access";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/http/app-error";
import { environment } from "@/lib/env/env";
import { albumToken } from "./guest-validation";
type Access = {
  _id: string;
  weddingId: Types.ObjectId;
  eventId: Types.ObjectId | null;
  weddingWide?: boolean;
  hash: string;
  generation?: string;
  expiresAt: Date;
};
const links = () =>
  mongoose.connection.db!.collection<Access>("galleryGuestLinks");
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function tokenForGeneration(weddingId: string, generation: string) {
  const secret = environment.TOKEN_HASH_SECRET;
  if (!secret) {
    throw new AppError(
      "Token security is not configured.",
      "SERVER_CONFIGURATION_ERROR",
      503,
    );
  }
  return createHmac("sha256", secret)
    .update(`guest-album:${weddingId}:${generation}`)
    .digest("base64url");
}
export async function manageLink(
  user: Types.ObjectId,
  id: string,
  revoke: boolean,
) {
  const wedding = await authorizeWeddingPlanning(user, id, true);
  const key = wedding._id.toString() + "/wedding";
  if (revoke) {
    await links().deleteMany({ weddingId: wedding._id });
    return null;
  }
  const generation = randomBytes(24).toString("base64url");
  const token = tokenForGeneration(wedding._id.toString(), generation);
  await links().replaceOne(
    { _id: key },
    {
      weddingId: wedding._id,
      eventId: null,
      weddingWide: true,
      generation,
      hash: digest(token),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    },
    { upsert: true },
  );
  return token;
}

export async function getActiveWeddingGuestQrPath(weddingId: Types.ObjectId) {
  await connectToDatabase();
  const link = await links().findOne({
    _id: weddingId.toString() + "/wedding",
    weddingId,
    weddingWide: true,
    generation: { $type: "string" },
    expiresAt: { $gt: new Date() },
  });
  if (!link?.generation) return null;
  const token = tokenForGeneration(weddingId.toString(), link.generation);
  return digest(token) === link.hash ? `/guest-photos/${token}` : null;
}
export async function resolveAlbum(token: string) {
  const missing = () =>
    new AppError(
      "This guest QR has expired or is unavailable.",
      "ALBUM_UNAVAILABLE",
      404,
    );
  if (!albumToken.safeParse(token).success) throw missing();
  await connectToDatabase();
  const link = await links().findOne({
    hash: digest(token),
    expiresAt: { $gt: new Date() },
  });
  if (!link) throw missing();
  const wedding = await Wedding.findOne({
    _id: link.weddingId,
    status: { $nin: ["ARCHIVED", "DELETED"] },
  }).lean();
  if (!wedding) throw missing();
  const event = link.eventId
    ? await WeddingEvent.findOne({
        _id: link.eventId,
        weddingId: wedding._id,
        deletedAt: null,
        status: { $ne: "CANCELLED" },
      })
        .select("name")
        .lean()
    : null;
  if (link.eventId && !event) throw missing();
  return {
    weddingId: wedding._id,
    weddingWide: link.weddingWide === true,
    eventId: link.eventId,
    title: event?.name ?? wedding.weddingName ?? "Wedding memories",
  };
}

export async function guestEventChoices(weddingId: Types.ObjectId) {
  const events = await WeddingEvent.find({
    weddingId,
    deletedAt: null,
    status: { $ne: "CANCELLED" },
  })
    .select("name")
    .sort({ startDate: 1, _id: 1 })
    .lean();
  return events.map((e) => ({ id: e._id.toString(), name: e.name }));
}
export async function resolveUploadEvent(
  album: Awaited<ReturnType<typeof resolveAlbum>>,
  choice: string | null,
) {
  if (!album.weddingWide) {
    if (choice && choice !== album.eventId?.toString())
      throw new AppError("Event unavailable.", "INVALID_EVENT", 400);
    return album.eventId?.toString() ?? null;
  }
  if (
    choice &&
    !(await WeddingEvent.exists({
      _id: choice,
      weddingId: album.weddingId,
      deletedAt: null,
      status: { $ne: "CANCELLED" },
    }))
  )
    throw new AppError("Event unavailable.", "INVALID_EVENT", 400);
  return choice;
}
