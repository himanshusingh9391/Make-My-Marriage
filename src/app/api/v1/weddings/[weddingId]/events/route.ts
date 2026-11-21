import { NextRequest } from "next/server";
import { eventRequestUser } from "@/features/events/request";
import {
  eventSchema,
  eventPageSchema,
  objectIdSchema,
} from "@/features/events/schemas";
import { listEvents, saveEvent } from "@/features/events/service";
import { successResponse } from "@/lib/http/responses";
import { withErrorHandling } from "@/lib/http/with-error-handling";
export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string }> };
export const GET = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await eventRequestUser(request);
    const weddingId = objectIdSchema.parse((await context.params).weddingId);
    return successResponse(
      await listEvents(
        user._id,
        weddingId,
        eventPageSchema.parse(
          request.nextUrl.searchParams.get("page") ?? undefined,
        ),
      ),
    );
  },
);
export const POST = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await eventRequestUser(request, true);
    const weddingId = objectIdSchema.parse((await context.params).weddingId);
    const input = eventSchema.parse(await request.json().catch(() => null));
    return successResponse(await saveEvent(user._id, weddingId, input), 201);
  },
);
