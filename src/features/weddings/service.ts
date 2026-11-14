import "server-only";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/http/app-error";
import { createWeddingSlug } from "@/features/auth/security";
import { Wedding } from "@/features/auth/models/wedding";
import { createWeddingSchema, type CreateWeddingInput } from "./schemas";
import type { Types } from "mongoose";

export async function createInitialWedding(ownerUserId: Types.ObjectId, input: CreateWeddingInput) {
  const parsed = createWeddingSchema.parse(input);
  await connectToDatabase();

  if (await Wedding.exists({ ownerUserId, status: { $ne: "DELETED" } })) {
    throw new AppError("Your wedding workspace has already been set up.", "WEDDING_ALREADY_EXISTS", 409);
  }

  const weddingName = `${parsed.partnerOneName} & ${parsed.partnerTwoName}`;
  const wedding = await Wedding.create({
    ownerUserId,
    weddingName,
    slug: createWeddingSlug(weddingName),
    partnerOneName: parsed.partnerOneName,
    partnerTwoName: parsed.partnerTwoName,
    weddingDate: parsed.weddingDate ? new Date(`${parsed.weddingDate}T00:00:00.000Z`) : null,
    weddingDateIsTentative: parsed.weddingDate ? parsed.weddingDateIsTentative : false,
    city: parsed.city,
    timezone: "Asia/Kolkata",
    status: "ACTIVE",
  });

  return {
    weddingId: wedding._id.toString(),
    weddingName: wedding.weddingName,
    status: wedding.status,
  };
}
