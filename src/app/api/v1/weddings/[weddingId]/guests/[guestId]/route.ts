import { NextRequest } from "next/server";
import { requireSessionRequest } from "@/lib/http/session-request";
import { getGuest, saveGuest, deleteGuest } from "@/features/guests/service";
import { withErrorHandling } from "@/lib/http/with-error-handling";
import { successResponse } from "@/lib/http/responses";
export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string; guestId: string }> };
export const GET = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request);
    const p = await context.params;
    return successResponse(await getGuest(user._id, p.weddingId, p.guestId));
  },
);
export const PATCH = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request, true);
    const p = await context.params;
    return successResponse(
      await saveGuest(
        user._id,
        p.weddingId,
        await request.json().catch(() => null),
        p.guestId,
      ),
    );
  },
);
export const DELETE = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request, true);
    const p = await context.params;
    return successResponse(await deleteGuest(user._id, p.weddingId, p.guestId));
  },
);
