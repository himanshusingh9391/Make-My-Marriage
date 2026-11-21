import "server-only";
import { Types } from "mongoose";
import { authorizeWeddingPlanning } from "@/features/weddings/access";
import { WeddingMembership } from "@/features/weddings/models/wedding-membership";
import { User } from "@/features/auth/models/user";
import { WeddingEvent } from "@/features/events/model";
import { AppError } from "@/lib/http/app-error";
import { WeddingTask, type TaskDocument } from "./model";
import {
  createTaskSchema,
  updateTaskSchema,
  taskIdSchema,
  taskQuerySchema,
  type TaskInput,
  type TaskUpdate,
  type TaskView,
  type TaskOptions,
  type TaskQuery,
  type TaskListData,
} from "./schemas";
import { weddingToday, isTaskOverdue } from "./dates";

export async function taskOptions(
  userId: Types.ObjectId,
  weddingId: string,
): Promise<TaskOptions> {
  const wedding = await authorizeWeddingPlanning(userId, weddingId);
  const members = await WeddingMembership.find({
    weddingId: wedding._id,
    role: { $in: ["ADMIN", "MANAGER"] },
  })
    .select("userId role")
    .lean();
  const [users, events] = await Promise.all([
    User.find({
      _id: { $in: [wedding.ownerUserId, ...members.map((m) => m.userId)] },
      status: "ACTIVE",
    })
      .select("fullName")
      .lean(),
    WeddingEvent.find({
      weddingId: wedding._id,
      deletedAt: null,
      status: { $ne: "CANCELLED" },
    })
      .sort({ startDate: 1 })
      .select("name")
      .lean(),
  ]);
  return {
    timezone: wedding.timezone,
    members: users.map((u) => ({
      id: u._id.toString(),
      name: u.fullName,
      role: u._id.equals(wedding.ownerUserId)
        ? "Owner"
        : members.find((m) => m.userId.equals(u._id))?.role === "ADMIN"
          ? "Admin"
          : "Manager",
    })),
    events: events.map((e) => ({ id: e._id.toString(), name: e.name })),
  };
}

async function views(
  tasks: TaskDocument[],
  weddingId: Types.ObjectId,
  timezone: string,
): Promise<TaskView[]> {
  const memberIds = tasks.flatMap((t) =>
    t.assignedUserId ? [t.assignedUserId] : [],
  );
  const eventIds = tasks.flatMap((t) => (t.eventId ? [t.eventId] : []));
  const [users, events] = await Promise.all([
    User.find({ _id: { $in: memberIds } })
      .select("fullName")
      .lean(),
    WeddingEvent.find({ _id: { $in: eventIds }, weddingId })
      .select("name deletedAt status")
      .lean(),
  ]);
  const today = weddingToday(timezone);
  return tasks.map((t) => ({
    id: t._id.toString(),
    title: t.title,
    description: t.description,
    assignedUserId: t.assignedUserId?.toString() ?? null,
    eventId: t.eventId?.toString() ?? null,
    dueDate: t.dueDate ?? null,
    priority: t.priority,
    status: t.status,
    category: t.category,
    notes: t.notes,
    updatedAt: t.updatedAt.toISOString(),
    completedAt: t.completedAt?.toISOString() ?? null,
    overdue: isTaskOverdue(t.dueDate ?? null, t.status, today),
    memberName: t.assignedUserId
      ? (users.find((u) => u._id.equals(t.assignedUserId!))?.fullName ??
        "Former member")
      : "Unassigned",
    eventName: t.eventId
      ? (() => {
          const event = events.find((e) => e._id.equals(t.eventId!));
          return event
            ? `${event.name}${event.deletedAt ? " (removed)" : event.status === "CANCELLED" ? " (cancelled)" : ""}`
            : "Unavailable event";
        })()
      : "General wedding task",
  }));
}

export async function listTasks(
  userId: Types.ObjectId,
  weddingId: string,
  input: TaskQuery,
): Promise<TaskListData> {
  const wedding = await authorizeWeddingPlanning(userId, weddingId);
  const query = taskQuerySchema.parse(input);
  const scope = { weddingId: wedding._id, deletedAt: null };
  const conditions: Record<string, unknown>[] = [scope];
  if (query.tab === "mine") conditions.push({ assignedUserId: userId });
  if (query.tab === "completed") conditions.push({ status: "COMPLETED" });
  if (query.status) conditions.push({ status: query.status });
  if (query.priority) conditions.push({ priority: query.priority });
  if (query.eventId)
    conditions.push({
      eventId:
        query.eventId === "general" ? null : new Types.ObjectId(query.eventId),
    });
  if (query.assignedUserId)
    conditions.push({
      assignedUserId:
        query.assignedUserId === "unassigned"
          ? null
          : new Types.ObjectId(query.assignedUserId),
    });
  const filter = { $and: conditions };
  const [tasks, total, all, mine, completed] = await Promise.all([
    WeddingTask.find(filter)
      .sort({ dueDate: 1, createdAt: -1, _id: 1 })
      .skip((query.page - 1) * 25)
      .limit(25)
      .lean(),
    WeddingTask.countDocuments(filter),
    WeddingTask.countDocuments(scope),
    WeddingTask.countDocuments({ ...scope, assignedUserId: userId }),
    WeddingTask.countDocuments({ ...scope, status: "COMPLETED" }),
  ]);
  return {
    tasks: await views(tasks, wedding._id, wedding.timezone),
    counts: { all, mine, completed },
    pagination: { page: query.page, total, hasMore: query.page * 25 < total },
  };
}

export async function getTask(
  userId: Types.ObjectId,
  weddingId: string,
  taskId: string,
) {
  const wedding = await authorizeWeddingPlanning(userId, weddingId);
  taskIdSchema.parse(taskId);
  const task = await WeddingTask.findOne({
    _id: taskId,
    weddingId: wedding._id,
    deletedAt: null,
  }).lean();
  if (!task) throw new AppError("Task not found.", "TASK_NOT_FOUND", 404);
  return (await views([task], wedding._id, wedding.timezone))[0];
}

async function validateLinks(
  weddingId: Types.ObjectId,
  ownerUserId: Types.ObjectId,
  input: TaskInput,
  previous?: TaskDocument,
) {
  if (
    input.assignedUserId &&
    input.assignedUserId !== previous?.assignedUserId?.toString()
  ) {
    const isMember =
      ownerUserId.toString() === input.assignedUserId ||
      (await WeddingMembership.exists({
        weddingId,
        userId: input.assignedUserId,
        role: { $in: ["ADMIN", "MANAGER"] },
      }));
    if (
      !isMember ||
      !(await User.exists({ _id: input.assignedUserId, status: "ACTIVE" }))
    )
      throw new AppError(
        "Choose an active member of this wedding.",
        "INVALID_TASK_ASSIGNEE",
        400,
      );
  }
  if (
    input.eventId &&
    input.eventId !== previous?.eventId?.toString() &&
    !(await WeddingEvent.exists({
      _id: input.eventId,
      weddingId,
      deletedAt: null,
      status: { $ne: "CANCELLED" },
    }))
  )
    throw new AppError(
      "Choose an active event from this wedding.",
      "INVALID_TASK_EVENT",
      400,
    );
}

export async function createTask(
  userId: Types.ObjectId,
  weddingId: string,
  input: TaskInput,
) {
  const wedding = await authorizeWeddingPlanning(userId, weddingId, true);
  const parsed = createTaskSchema.parse(input);
  await validateLinks(wedding._id, wedding.ownerUserId, parsed);
  const task = await WeddingTask.create({
    ...parsed,
    weddingId: wedding._id,
    completedAt: parsed.status === "COMPLETED" ? new Date() : null,
  });
  return (await views([task], wedding._id, wedding.timezone))[0];
}

export async function updateTask(
  userId: Types.ObjectId,
  weddingId: string,
  taskId: string,
  input: TaskUpdate,
) {
  const wedding = await authorizeWeddingPlanning(userId, weddingId, true);
  taskIdSchema.parse(taskId);
  const { expectedUpdatedAt, ...patch } = updateTaskSchema.parse(input);
  const previous = await WeddingTask.findOne({
    _id: taskId,
    weddingId: wedding._id,
    deletedAt: null,
  }).lean();
  if (!previous) throw new AppError("Task not found.", "TASK_NOT_FOUND", 404);
  const parsed = createTaskSchema.parse({
    title: previous.title,
    description: previous.description,
    assignedUserId: previous.assignedUserId?.toString() ?? null,
    eventId: previous.eventId?.toString() ?? null,
    dueDate: previous.dueDate,
    priority: previous.priority,
    status: previous.status,
    category: previous.category,
    notes: previous.notes,
    ...patch,
  });
  await validateLinks(wedding._id, wedding.ownerUserId, parsed, previous);
  const completedAt =
    parsed.status === "COMPLETED" ? (previous.completedAt ?? new Date()) : null;
  const task = await WeddingTask.findOneAndUpdate(
    {
      _id: taskId,
      weddingId: wedding._id,
      deletedAt: null,
      updatedAt: new Date(expectedUpdatedAt),
    },
    { $set: { ...parsed, completedAt } },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!task)
    throw new AppError(
      "This task changed. Refresh and review the latest details before trying again.",
      "TASK_CHANGED",
      409,
    );
  return (await views([task], wedding._id, wedding.timezone))[0];
}

export async function deleteTask(
  userId: Types.ObjectId,
  weddingId: string,
  taskId: string,
) {
  const wedding = await authorizeWeddingPlanning(userId, weddingId, true);
  taskIdSchema.parse(taskId);
  const task = await WeddingTask.findOneAndUpdate(
    { _id: taskId, weddingId: wedding._id, deletedAt: null },
    { $set: { deletedAt: new Date() } },
  );
  if (!task) throw new AppError("Task not found.", "TASK_NOT_FOUND", 404);
  return { taskId, removed: true };
}
