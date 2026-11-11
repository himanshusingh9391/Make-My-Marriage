import "server-only";
import mongoose, { type Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Wedding } from "@/features/auth/models/wedding";

type ExpenseTotal = {
  _id: null;
  totalAmountMinor: number;
};

export async function getOwnerDashboard(userId: Types.ObjectId) {
  await connectToDatabase();
  const wedding = await Wedding.findOne({ ownerUserId: userId })
    .sort({ createdAt: -1 })
    .select("weddingName partnerOneName partnerTwoName weddingDate city status")
    .lean();

  if (!wedding) return null;

  const database = mongoose.connection.db;
  if (!database) throw new Error("The MongoDB database handle is unavailable.");

  const weddingId = wedding._id;
  const [eventCount, guestCount, taskCount, expenseTotals] = await Promise.all([
    database.collection("events").countDocuments({ weddingId }),
    database.collection("guests").countDocuments({ weddingId }),
    database.collection("tasks").countDocuments({ weddingId }),
    database
      .collection("expenses")
      .aggregate<ExpenseTotal>([
        { $match: { weddingId } },
        { $group: { _id: null, totalAmountMinor: { $sum: "$amountMinor" } } },
      ])
      .next(),
  ]);

  return {
    wedding: {
      name: wedding.weddingName,
      partnerOneName: wedding.partnerOneName,
      partnerTwoName: wedding.partnerTwoName,
      weddingDate: wedding.weddingDate?.toISOString() ?? null,
      city: wedding.city,
      status: wedding.status,
    },
    stats: {
      eventCount,
      guestCount,
      taskCount,
      expenseTotalMinor: expenseTotals?.totalAmountMinor ?? 0,
    },
  };
}
