import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { taskPriorities, taskStatuses } from "./schemas";
const schema = new Schema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, default: "", maxlength: 2000 },
    assignedUserId: { type: Schema.Types.ObjectId, default: null },
    eventId: { type: Schema.Types.ObjectId, default: null },
    dueDate: { type: String, default: null },
    priority: {
      type: String,
      enum: taskPriorities,
      required: true,
      default: "MEDIUM",
    },
    status: {
      type: String,
      enum: taskStatuses,
      required: true,
      default: "TODO",
    },
    category: { type: String, default: "", maxlength: 100 },
    notes: { type: String, default: "", maxlength: 2000 },
    completedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { collection: "tasks", timestamps: true },
);
schema.index({ weddingId: 1, status: 1, dueDate: 1 });
schema.index({ weddingId: 1, assignedUserId: 1, dueDate: 1 });
schema.index({ weddingId: 1, eventId: 1, dueDate: 1 });
export type TaskDocument = InferSchemaType<typeof schema> & {
  _id: mongoose.Types.ObjectId;
};
export const WeddingTask =
  (mongoose.models.WeddingTask as Model<TaskDocument> | undefined) ??
  mongoose.model<TaskDocument>("WeddingTask", schema);
