import "server-only";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/http/app-error";
import { createWeddingSlug } from "@/features/auth/security";
import { Wedding } from "@/features/auth/models/wedding";
import { WeddingSettings } from "./models/wedding-settings";
import {
  createWeddingSchema,
  updateWeddingSchema,
  type CreateWeddingInput,
  type UpdateWeddingInput,
} from "./schemas";
import type { Types } from "mongoose";

export async function createInitialWedding(ownerUserId: Types.ObjectId, input: CreateWeddingInput) {
  const parsed = createWeddingSchema.parse(input);
  await connectToDatabase();

  if (await Wedding.exists({ ownerUserId, status: { $ne: "DELETED" } })) {
    throw new AppError("Your wedding workspace has already been set up.", "WEDDING_ALREADY_EXISTS", 409);
  }

  const wedding = await Wedding.create({
    ownerUserId,
    weddingName: parsed.title,
    slug: createWeddingSlug(parsed.title),
    partnerOneName: parsed.partnerOneName,
    partnerTwoName: parsed.partnerTwoName,
    weddingDate: parsed.weddingDate ? new Date(`${parsed.weddingDate}T00:00:00.000Z`) : null,
    weddingDateIsTentative: parsed.weddingDate ? parsed.weddingDateIsTentative : false,
    city: parsed.city,
    timezone: "Asia/Kolkata",
    status: "ACTIVE",
  });

  try {
    await WeddingSettings.create({ weddingId: wedding._id, description: parsed.description });
  } catch (error) {
    await Wedding.deleteOne({ _id: wedding._id, ownerUserId });
    throw error;
  }

  return {
    weddingId: wedding._id.toString(),
    weddingName: wedding.weddingName,
    status: wedding.status,
  };
}

export async function getWeddingDetails(ownerUserId: Types.ObjectId, weddingId: string) {
  if (!mongoose.isValidObjectId(weddingId)) {
    throw new AppError("Wedding workspace not found.", "WEDDING_NOT_FOUND", 404);
  }
  await connectToDatabase();
  const wedding = await Wedding.findOne({
    _id: weddingId,
    ownerUserId,
    status: { $ne: "DELETED" },
  }).lean();
  if (!wedding) throw new AppError("Wedding workspace not found.", "WEDDING_NOT_FOUND", 404);

  const settings = await WeddingSettings.findOne({ weddingId: wedding._id }).lean();
  return {
    weddingId: wedding._id.toString(),
    title: wedding.weddingName,
    description: settings?.description ?? "",
    partnerOneName: wedding.partnerOneName,
    partnerTwoName: wedding.partnerTwoName,
    city: wedding.city,
    weddingDate: wedding.weddingDate?.toISOString().slice(0, 10) ?? null,
    weddingDateIsTentative: wedding.weddingDateIsTentative ?? Boolean(wedding.weddingDate),
    timezone: wedding.timezone,
    status: wedding.status,
  };
}

export async function updateWeddingDetails(
  ownerUserId: Types.ObjectId,
  weddingId: string,
  input: UpdateWeddingInput,
) {
  const parsed = updateWeddingSchema.parse(input);
  if (!mongoose.isValidObjectId(weddingId)) {
    throw new AppError("Wedding workspace not found.", "WEDDING_NOT_FOUND", 404);
  }
  await connectToDatabase();
  const weddingUpdates: {
    weddingName?: string;
    partnerOneName?: string;
    partnerTwoName?: string;
    city?: string;
    weddingDate?: Date | null;
    weddingDateIsTentative?: boolean;
  } = {};
  if (parsed.title !== undefined) weddingUpdates.weddingName = parsed.title;
  if (parsed.partnerOneName !== undefined) weddingUpdates.partnerOneName = parsed.partnerOneName;
  if (parsed.partnerTwoName !== undefined) weddingUpdates.partnerTwoName = parsed.partnerTwoName;
  if (parsed.city !== undefined) weddingUpdates.city = parsed.city;
  if (parsed.weddingDate !== undefined) {
    weddingUpdates.weddingDate = parsed.weddingDate ? new Date(`${parsed.weddingDate}T00:00:00.000Z`) : null;
  }
  if (parsed.weddingDateIsTentative !== undefined) {
    weddingUpdates.weddingDateIsTentative = parsed.weddingDateIsTentative;
  }

  const wedding = await Wedding.findOne({
    _id: weddingId,
    ownerUserId,
    status: { $ne: "DELETED" },
  });
  if (!wedding) throw new AppError("Wedding workspace not found.", "WEDDING_NOT_FOUND", 404);

  if (Object.keys(weddingUpdates).length > 0) {
    await Wedding.updateOne(
      { _id: weddingId, ownerUserId, status: { $ne: "DELETED" } },
      { $set: weddingUpdates },
      { runValidators: true },
    );
  }

  if (parsed.description !== undefined) {
    await WeddingSettings.findOneAndUpdate(
      { weddingId: wedding._id },
      { $set: { description: parsed.description } },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    );
  }

  return getWeddingDetails(ownerUserId, wedding._id.toString());
}
