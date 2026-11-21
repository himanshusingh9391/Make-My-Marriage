import "server-only";
import { type Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Wedding } from "@/features/auth/models/wedding";
import { WeddingMembership } from "./models/wedding-membership";
import { AppError } from "@/lib/http/app-error";
import { z } from "zod";
const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid resource ID");

export async function authorizeWeddingPlanning(
  userId: Types.ObjectId,
  weddingId: string,
  write = false,
) {
  objectIdSchema.parse(weddingId);
  await connectToDatabase();
  const wedding = await Wedding.findOne({
    _id: weddingId,
    status: { $ne: "DELETED" },
  }).lean();
  if (
    !wedding ||
    (wedding.ownerUserId.toString() !== userId.toString() &&
      !(await WeddingMembership.exists({
        weddingId: wedding._id,
        userId,
        role: { $in: ["ADMIN", "MANAGER"] },
      })))
  )
    throw new AppError(
      "Wedding workspace not found.",
      "WEDDING_NOT_FOUND",
      404,
    );
  if (write && wedding.status === "ARCHIVED")
    throw new AppError(
      "Archived weddings are read-only.",
      "WEDDING_ARCHIVED",
      409,
    );
  return wedding;
}
