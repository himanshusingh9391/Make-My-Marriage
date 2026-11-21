import { z } from "zod";

export const taskStatuses = [
  "TODO",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export const taskPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const statusLabels = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
export const priorityLabels = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};
export const taskIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid resource ID");
export const taskParamsSchema = z.object({
  weddingId: taskIdSchema,
  taskId: taskIdSchema,
});
const fields = z
  .object({
    title: z.string().trim().min(1, "Enter a task title.").max(160),
    description: z.string().trim().max(2000),
    assignedUserId: taskIdSchema.nullable(),
    eventId: taskIdSchema.nullable(),
    dueDate: z.iso.date().nullable(),
    priority: z.enum(taskPriorities),
    status: z.enum(taskStatuses),
    category: z.string().trim().max(100),
    notes: z.string().trim().max(2000),
  })
  .strict();
export const createTaskSchema = fields.extend({
  description: fields.shape.description.default(""),
  assignedUserId: fields.shape.assignedUserId.default(null),
  eventId: fields.shape.eventId.default(null),
  dueDate: fields.shape.dueDate.default(null),
  priority: fields.shape.priority.default("MEDIUM"),
  status: fields.shape.status.default("TODO"),
  category: fields.shape.category.default(""),
  notes: fields.shape.notes.default(""),
});
export const updateTaskSchema = fields
  .partial()
  .extend({ expectedUpdatedAt: z.string().datetime() })
  .refine(
    (value) => Object.keys(value).some((key) => key !== "expectedUpdatedAt"),
    "Provide at least one field to update.",
  );
export const taskQuerySchema = z
  .object({
    tab: z.enum(["all", "mine", "completed"]).default("all"),
    status: z.enum(taskStatuses).optional(),
    priority: z.enum(taskPriorities).optional(),
    eventId: z.union([taskIdSchema, z.literal("general")]).optional(),
    assignedUserId: z.union([taskIdSchema, z.literal("unassigned")]).optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .strict();
export type TaskInput = z.infer<typeof createTaskSchema>;
export type TaskUpdate = z.infer<typeof updateTaskSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;
export type TaskView = TaskInput & {
  id: string;
  updatedAt: string;
  completedAt: string | null;
  overdue: boolean;
  memberName: string;
  eventName: string;
};
export type TaskOptions = {
  timezone: string;
  members: { id: string; name: string; role: string }[];
  events: { id: string; name: string }[];
};
export type TaskListData = {
  tasks: TaskView[];
  counts: { all: number; mine: number; completed: number };
  pagination: { page: number; total: number; hasMore: boolean };
};
