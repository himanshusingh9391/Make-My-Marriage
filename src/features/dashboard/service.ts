import "server-only";
import mongoose, { type Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Wedding, type WeddingDocument } from "@/features/auth/models/wedding";
import { WeddingSettings } from "@/features/weddings/models/wedding-settings";
import { WeddingMembership } from "@/features/weddings/models/wedding-membership";
import { User } from "@/features/auth/models/user";

type ExpenseTotal = {
  _id: null;
  totalAmountMinor: number;
};

export async function getOwnerDashboard(userId: Types.ObjectId, selectedWeddingId?: string) {
  await connectToDatabase();
  if (selectedWeddingId) {
    if (!mongoose.isValidObjectId(selectedWeddingId)) return null;
    const wedding = await Wedding.findOne({ _id: selectedWeddingId, status: { $ne: "DELETED" } })
      .select("weddingName partnerOneName partnerTwoName weddingDate weddingDateIsTentative city status ownerUserId")
      .lean();
    if (!wedding) return null;
    const isOwner = wedding.ownerUserId.toString() === userId.toString();
    if (!isOwner && !(await WeddingMembership.exists({ weddingId: wedding._id, userId }))) return null;
    return loadDashboard(wedding, userId);
  }
  const ownedWedding = await Wedding.findOne({ ownerUserId: userId, status: { $ne: "DELETED" } })
    .sort({ createdAt: -1 })
    .select("weddingName partnerOneName partnerTwoName weddingDate weddingDateIsTentative city status ownerUserId")
    .lean();
  const membership = ownedWedding ? null : await WeddingMembership.findOne({ userId }).sort({ joinedAt: -1 }).lean();
  const wedding = ownedWedding ?? (membership ? await Wedding.findOne({ _id: membership.weddingId, status: { $ne: "DELETED" } })
    .select("weddingName partnerOneName partnerTwoName weddingDate weddingDateIsTentative city status ownerUserId")
    .lean() : null);

  if (!wedding) return null;

  return loadDashboard(wedding, userId);
}

type DashboardWedding = Pick<WeddingDocument,
  "_id" | "ownerUserId" | "weddingName" | "partnerOneName" | "partnerTwoName" | "weddingDate" | "weddingDateIsTentative" | "city" | "status"
>;

async function loadDashboard(wedding: DashboardWedding, userId: Types.ObjectId) {

  const settings = await WeddingSettings.findOne({ weddingId: wedding._id }).lean();
  const memberships = await WeddingMembership.find({ weddingId: wedding._id }).sort({ joinedAt: 1 }).lean();
  const users = await User.find({ _id: { $in: [wedding.ownerUserId, ...memberships.map((member) => member.userId)] } }).select("fullName").lean();
  const names = new Map(users.map((user) => [user._id.toString(), user.fullName]));
  const team = [
    { id: wedding.ownerUserId.toString(), fullName: names.get(wedding.ownerUserId.toString()) ?? "Wedding owner", role: "Owner" },
    ...memberships.map((member) => ({ id: member.userId.toString(), fullName: names.get(member.userId.toString()) ?? "Wedding member", role: member.role === "ADMIN" ? "Admin" : "Manager" })),
  ];

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
    team,
    canManageInvitations: wedding.ownerUserId.toString() === userId.toString() || memberships.some(member => member.userId.toString() === userId.toString() && ["ADMIN", "MANAGER"].includes(member.role)),
    accountRole: team.find((member) => member.id === userId.toString())?.role ?? "Member",
    wedding: {
      id: wedding._id.toString(),
      name: wedding.weddingName,
      description: settings?.description ?? "",
      partnerOneName: wedding.partnerOneName,
      partnerTwoName: wedding.partnerTwoName,
      weddingDate: wedding.weddingDate?.toISOString() ?? null,
      weddingDateIsTentative: wedding.weddingDateIsTentative ?? Boolean(wedding.weddingDate),
      city: wedding.city,
      status: wedding.status,
    },
    canEditWedding: wedding.ownerUserId.toString() === userId.toString(),
    stats: {
      eventCount,
      guestCount,
      taskCount,
      expenseTotalMinor: expenseTotals?.totalAmountMinor ?? 0,
    },
  };
}
