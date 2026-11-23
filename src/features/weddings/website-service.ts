import "server-only";
import mongoose, { type Types } from "mongoose";
import { Wedding } from "@/features/auth/models/wedding";
import { hashVerificationToken } from "@/features/auth/security";
import { WeddingEvent } from "@/features/events/model";
import { getActiveWeddingGuestQrPath } from "@/features/gallery/guest-access";
import { AppError } from "@/lib/http/app-error";
import { connectToDatabase } from "@/lib/db/mongoose";
import { authorizeWeddingPlanning } from "./access";
import { WeddingSettings } from "./models/wedding-settings";
import type { WebsiteSettingsInput } from "./website-schema";

const defaults = {
  websitePublished: false,
  theme: "ELEGANT_ROYAL" as const,
  livestreamUrl: "",
};

export async function getWebsiteSettings(
  userId: Types.ObjectId,
  weddingId: string,
) {
  const wedding = await authorizeWeddingPlanning(userId, weddingId);
  const settings = await WeddingSettings.findOne({
    weddingId: wedding._id,
  }).lean();
  return {
    slug: wedding.slug,
    websitePublished: settings?.websitePublished ?? false,
    theme: settings?.theme ?? defaults.theme,
    livestreamUrl: settings?.livestreamUrl ?? defaults.livestreamUrl,
  };
}

export async function updateWebsiteSettings(
  userId: Types.ObjectId,
  weddingId: string,
  input: WebsiteSettingsInput,
) {
  const wedding = await authorizeWeddingPlanning(userId, weddingId, true);
  const settings = await WeddingSettings.findOneAndUpdate(
    { weddingId: wedding._id },
    { $set: input },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();
  await Wedding.updateOne(
    { _id: wedding._id },
    {
      $set: {
        publishedAt: input.websitePublished
          ? (wedding.publishedAt ?? new Date())
          : null,
      },
    },
  );
  return {
    slug: wedding.slug,
    websitePublished: settings?.websitePublished ?? false,
    theme: settings?.theme ?? defaults.theme,
    livestreamUrl: settings?.livestreamUrl ?? "",
  };
}

export async function getPublicWeddingWebsite(slug: string) {
  await connectToDatabase();
  const wedding = await Wedding.findOne({ slug, status: "ACTIVE" })
    .select(
      "slug weddingName partnerOneName partnerTwoName city weddingDate weddingDateIsTentative timezone",
    )
    .lean();
  if (!wedding) {
    throw new AppError(
      "Wedding website not found.",
      "WEDDING_WEBSITE_NOT_FOUND",
      404,
    );
  }

  const settings = await WeddingSettings.findOne({ weddingId: wedding._id })
    .select("websitePublished theme livestreamUrl description")
    .lean();
  if (!settings?.websitePublished) {
    throw new AppError(
      "Wedding website not found.",
      "WEDDING_WEBSITE_NOT_FOUND",
      404,
    );
  }

  const events = await WeddingEvent.find({
    weddingId: wedding._id,
    status: { $ne: "CANCELLED" },
    deletedAt: null,
  })
    .select("name type description startDate endDate timezone venue dressCode")
    .sort({ startDate: 1, _id: 1 })
    .lean();

  const eventIds = events.map((event) => event._id);
  const photoCollection = mongoose.connection.db!.collection<{
    _id: Types.ObjectId;
    secureUrl: string;
    eventId: Types.ObjectId | null;
    createdAt: Date;
  }>("photos");
  const photos = await photoCollection
    .find({
      weddingId: wedding._id,
      secureUrl: { $type: "string" },
      $or: [{ eventId: null }, { eventId: { $in: eventIds } }],
    })
    .project<{
      _id: Types.ObjectId;
      secureUrl: string;
      eventId: Types.ObjectId | null;
      createdAt: Date;
    }>({ secureUrl: 1, eventId: 1, createdAt: 1, _id: 1 })
    .sort({ createdAt: -1 })
    .toArray();
  const eventPhotoRows = eventIds.length
    ? await photoCollection
        .aggregate<{
          _id: Types.ObjectId;
          photoId: Types.ObjectId;
          secureUrl: string;
        }>([
          {
            $match: {
              weddingId: wedding._id,
              eventId: { $in: eventIds },
              secureUrl: { $type: "string" },
            },
          },
          { $sort: { createdAt: -1, _id: -1 } },
          {
            $group: {
              _id: "$eventId",
              photoId: { $first: "$_id" },
              secureUrl: { $first: "$secureUrl" },
            },
          },
        ])
        .toArray()
    : [];
  const eventPhotoById = new Map(
    eventPhotoRows.map((photo) => [
      photo._id.toString(),
      { id: photo.photoId.toString(), src: photo.secureUrl },
    ]),
  );
  const guestQrPath = await getActiveWeddingGuestQrPath(wedding._id);
  const engagementEvent = events.find((event) =>
    /engagement/i.test(event.name),
  );
  const engagementPhoto = engagementEvent
    ? eventPhotoById.get(engagementEvent._id.toString())
    : null;
  const latestPhoto = photos[0];
  const heroImage = engagementEvent
    ? (engagementPhoto?.src ?? latestPhoto?.secureUrl ?? null)
    : (latestPhoto?.secureUrl ?? null);
  const featuredPhotoIds = new Set(
    eventPhotoRows.map((photo) => photo.photoId.toString()),
  );
  const heroPhotoId = engagementPhoto?.id ?? latestPhoto?._id.toString();
  if (heroPhotoId) featuredPhotoIds.add(heroPhotoId);

  return {
    slug: wedding.slug,
    title: wedding.weddingName,
    partnerOneName: wedding.partnerOneName,
    partnerTwoName: wedding.partnerTwoName,
    city: wedding.city,
    weddingDate: wedding.weddingDate?.toISOString() ?? null,
    dateIsTentative: wedding.weddingDateIsTentative,
    timezone: wedding.timezone,
    description: settings.description ?? "",
    theme: settings.theme ?? defaults.theme,
    livestreamUrl: settings.livestreamUrl ?? "",
    showGallery: true,
    guestQrPath,
    heroImage,
    gallery: photos.map((photo) => photo.secureUrl),
    galleryItems: photos.map((photo) => ({
      src: photo.secureUrl,
      eventName:
        events.find(
          (event) => event._id.toString() === photo.eventId?.toString(),
        )?.name ?? "Wedding memories",
    })),
    additionalGalleryItems: photos
      .filter((photo) => !featuredPhotoIds.has(photo._id.toString()))
      .map((photo) => ({
        src: photo.secureUrl,
        eventName:
          events.find(
            (event) => event._id.toString() === photo.eventId?.toString(),
          )?.name ?? "Wedding memories",
      })),
    events: events.map((event) => ({
      eventKey: hashVerificationToken(event._id.toString()),
      name: event.name,
      type: event.type,
      description: event.description ?? "",
      startDate: event.startDate.toISOString(),
      endDate: event.endDate?.toISOString() ?? null,
      timezone: event.timezone,
      venueName: event.venue?.name ?? "",
      venueAddress: event.venue?.address ?? "",
      dressCode: event.dressCode ?? "",
      image: eventPhotoById.get(event._id.toString())?.src ?? null,
    })),
  };
}

export async function getPublicWeddingPhotoContext(slug: string) {
  await connectToDatabase();
  const wedding = await Wedding.findOne({ slug, status: "ACTIVE" })
    .select("weddingName")
    .lean();
  if (!wedding) {
    throw new AppError(
      "Wedding photo page not found.",
      "WEDDING_WEBSITE_NOT_FOUND",
      404,
    );
  }
  const settings = await WeddingSettings.findOne({ weddingId: wedding._id })
    .select("websitePublished")
    .lean();
  if (!settings?.websitePublished) {
    throw new AppError(
      "Wedding photo page not found.",
      "WEDDING_WEBSITE_NOT_FOUND",
      404,
    );
  }
  const guestQrPath = await getActiveWeddingGuestQrPath(wedding._id);
  if (!guestQrPath) {
    throw new AppError(
      "Guest photo sharing is not currently available.",
      "WEDDING_PHOTO_SHARING_UNAVAILABLE",
      404,
    );
  }
  const events = await WeddingEvent.find({
    weddingId: wedding._id,
    status: { $ne: "CANCELLED" },
    deletedAt: null,
  })
    .select("name")
    .sort({ startDate: 1, _id: 1 })
    .lean();
  return {
    weddingId: wedding._id,
    weddingName: wedding.weddingName,
    events: events.map((event) => ({
      id: event._id.toString(),
      eventKey: hashVerificationToken(event._id.toString()),
      name: event.name,
    })),
  };
}

export async function resolvePublicPhotoEvent(
  context: Awaited<ReturnType<typeof getPublicWeddingPhotoContext>>,
  eventKey: string | null,
) {
  if (!eventKey) return null;
  const event = context.events.find((item) => item.eventKey === eventKey);
  if (!event) {
    throw new AppError(
      "Choose an active event for this wedding.",
      "INVALID_EVENT",
      400,
    );
  }
  const eventId = event.id;
  if (!eventId) {
    throw new AppError(
      "Choose an active event for this wedding.",
      "INVALID_EVENT",
      400,
    );
  }
  const eventRecord = await WeddingEvent.findOne({
    _id: eventId,
    weddingId: context.weddingId,
    status: { $ne: "CANCELLED" },
    deletedAt: null,
  })
    .select("_id")
    .lean();
  if (!eventRecord) {
    throw new AppError(
      "Choose an active event for this wedding.",
      "INVALID_EVENT",
      400,
    );
  }
  return eventRecord._id.toString();
}
