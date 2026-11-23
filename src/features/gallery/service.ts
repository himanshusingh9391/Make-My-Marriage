import "server-only";
import crypto from "node:crypto";
import mongoose, { Types } from "mongoose";
import { WeddingEvent } from "@/features/events/model";
import { authorizeWeddingPlanning } from "@/features/weddings/access";
import { connectToDatabase } from "@/lib/db/mongoose";
import { requireCloudinaryConfig } from "@/lib/env/env";
import { AppError } from "@/lib/http/app-error";

import { validImageHeader } from "./guest-validation";
type Photo = {
  guestShared?: boolean;
  _id: Types.ObjectId;
  weddingId: Types.ObjectId;
  eventId: Types.ObjectId | null;
  objectKey: string;
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  createdAt: Date;
};
const permitted = new Set(["image/jpeg", "image/png", "image/webp"]);
function photos() {
  return mongoose.connection.db!.collection<Photo>("photos");
}
export async function listPhotos(userId: Types.ObjectId, weddingId: string) {
  const wedding = await authorizeWeddingPlanning(userId, weddingId);
  await connectToDatabase();
  return photos()
    .find({ weddingId: wedding._id })
    .sort({ createdAt: -1 })
    .toArray();
}
export async function uploadPhotos(
  userId: Types.ObjectId,
  weddingId: string,
  eventId: string | null,
  files: File[],
) {
  const wedding = await authorizeWeddingPlanning(userId, weddingId, true);
  if (
    eventId &&
    !(await WeddingEvent.exists({
      _id: eventId,
      weddingId: wedding._id,
      deletedAt: null,
      status: { $ne: "CANCELLED" },
    }))
  ) {
    throw new AppError("Choose an active event for this wedding.", "INVALID_EVENT", 400);
  }
  return storeAlbumPhotos(wedding._id, eventId, files, false);
}
export async function listAlbumPhotos(
  weddingId: Types.ObjectId,
  eventId: Types.ObjectId | null | undefined,
) {
  return photos()
    .find({
      weddingId,
      ...(eventId === undefined ? {} : { eventId }),
      guestShared: true,
    })
    .sort({ createdAt: -1 })
    .project<{ secureUrl: string }>({ secureUrl: 1, _id: 0 })
    .toArray();
}
export async function storeAlbumPhotos(
  weddingId: Types.ObjectId,
  eventId: string | null,
  files: File[],
  guestShared: boolean,
) {
  if (!files.length || files.length > 20)
    throw new AppError("Choose 1–20 photos.", "INVALID_PHOTOS", 400);
  if (
    files.some(
      (file) => !permitted.has(file.type) || file.size > 10 * 1024 * 1024,
    )
  )
    throw new AppError(
      "Use JPEG, PNG, or WebP files up to 10 MB each.",
      "INVALID_PHOTOS",
      400,
    );
  if (eventId && !Types.ObjectId.isValid(eventId))
    throw new AppError("Invalid event.", "INVALID_EVENT", 400);
  const config = requireCloudinaryConfig();
  const folder = `make-my-marriage/${weddingId.toString()}`;
  const records: Photo[] = [];
  for (const file of files) {
    if (
      !validImageHeader(
        file.name,
        file.type,
        new Uint8Array(await file.slice(0, 12).arrayBuffer()),
      )
    )
      throw new AppError("Invalid image format.", "INVALID_PHOTOS", 400);
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `photo-${crypto.randomUUID()}`;
    const signature = crypto
      .createHash("sha1")
      .update(
        `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${config.apiSecret}`,
      )
      .digest("hex");
    const form = new FormData();
    form.set("file", file);
    form.set("api_key", config.apiKey);
    form.set("timestamp", String(timestamp));
    form.set("folder", folder);
    form.set("public_id", publicId);
    form.set("signature", signature);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
      { method: "POST", body: form },
    );
    const result = (await response.json()) as {
      public_id?: string;
      secure_url?: string;
      width?: number;
      height?: number;
      error?: { message?: string };
    };
    if (!response.ok || !result.public_id || !result.secure_url)
      throw new AppError(
        result.error?.message ?? "Cloudinary could not upload this image.",
        "PHOTO_UPLOAD_FAILED",
        502,
      );
    records.push({
      _id: new Types.ObjectId(),
      weddingId,
      guestShared,
      eventId: eventId ? new Types.ObjectId(eventId) : null,
      objectKey: result.public_id,
      publicId: result.public_id,
      secureUrl: result.secure_url,
      width: result.width ?? 0,
      height: result.height ?? 0,
      createdAt: new Date(),
    });
  }
  await photos().insertMany(records);
  return records;
}

export async function deletePhoto(
  userId: Types.ObjectId,
  weddingId: string,
  photoId: string,
) {
  const wedding = await authorizeWeddingPlanning(userId, weddingId, true);
  if (!Types.ObjectId.isValid(photoId))
    throw new AppError("Photo not found.", "PHOTO_NOT_FOUND", 404);
  await connectToDatabase();
  const photo = await photos().findOne({
    _id: new Types.ObjectId(photoId),
    weddingId: wedding._id,
  });
  if (!photo) throw new AppError("Photo not found.", "PHOTO_NOT_FOUND", 404);
  const config = requireCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash("sha1")
    .update(
      `public_id=${photo.publicId}&timestamp=${timestamp}${config.apiSecret}`,
    )
    .digest("hex");
  const form = new FormData();
  form.set("public_id", photo.publicId);
  form.set("timestamp", String(timestamp));
  form.set("api_key", config.apiKey);
  form.set("signature", signature);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`,
    { method: "POST", body: form },
  );
  if (!response.ok)
    throw new AppError(
      "Cloudinary could not remove this photo.",
      "PHOTO_DELETE_FAILED",
      502,
    );
  await photos().deleteOne({ _id: photo._id, weddingId: wedding._id });
  return { photoId, removed: true };
}
