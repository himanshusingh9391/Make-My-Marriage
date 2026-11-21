import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { eventTypes, eventStatuses } from "./schemas";

const schema = new Schema(
  {
    weddingId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, maxlength: 150 },
    type: { type: String, enum: eventTypes, required: true },
    description: { type: String, default: "" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    timezone: { type: String, required: true },
    venue: {
      name: { type: String, default: "" },
      address: { type: String, default: "" },
    },
    dressCode: { type: String, default: "" },
    notes: { type: String, default: "" },
    rsvpDeadline: { type: Date, default: null },
    maxAttendees: { type: Number, default: null },
    status: {
      type: String,
      enum: eventStatuses,
      default: "DRAFT",
      required: true,
    },
    deletedAt: { type: Date, default: null },
  },
  { collection: "events", timestamps: true, optimisticConcurrency: true },
);
schema.index({ weddingId: 1, startDate: 1 });
schema.index({ weddingId: 1, status: 1, startDate: 1 });
export type EventDocument = InferSchemaType<typeof schema> & {
  _id: mongoose.Types.ObjectId;
};
export const WeddingEvent =
  (mongoose.models.WeddingEvent as Model<EventDocument> | undefined) ??
  mongoose.model<EventDocument>("WeddingEvent", schema);
