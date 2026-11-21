import { NextRequest } from "next/server";
import { eventRequestUser } from "@/features/events/request";
import { eventSchema, eventParamsSchema } from "@/features/events/schemas";
import { getEvent, saveEvent, deleteEvent } from "@/features/events/service";
import { successResponse } from "@/lib/http/responses";
import { withErrorHandling } from "@/lib/http/with-error-handling";
export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string; eventId: string }> };
export const GET = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await eventRequestUser(request);
    const { weddingId, eventId } = eventParamsSchema.parse(
      await context.params,
    );
    return successResponse(await getEvent(user._id, weddingId, eventId));
  },
);
export const PATCH = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await eventRequestUser(request, true);
    const { weddingId, eventId } = eventParamsSchema.parse(
      await context.params,
    );
    const input = eventSchema.parse(await request.json().catch(() => null));
    return successResponse(
      await saveEvent(user._id, weddingId, input, eventId),
    );
  },
);
export const DELETE = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await eventRequestUser(request, true);
    const { weddingId, eventId } = eventParamsSchema.parse(
      await context.params,
    );
    return successResponse(await deleteEvent(user._id, weddingId, eventId));
  },
);
