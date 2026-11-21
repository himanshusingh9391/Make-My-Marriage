import { NextRequest } from "next/server";
import { requireSessionRequest } from "@/lib/http/session-request";
import { enforceAuthRateLimit } from "@/features/auth/service";
import {
  getRsvpLinkState,
  createRsvpLink,
  revokeRsvpLink,
} from "@/features/rsvp/service";
import { withErrorHandling } from "@/lib/http/with-error-handling";
import { successResponse } from "@/lib/http/responses";
export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string; guestId: string }> };
export const GET = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request);
    const p = await context.params;
    const response = successResponse(
      await getRsvpLinkState(user._id, p.weddingId, p.guestId),
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  },
);
export const POST = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request, true);
    const p = await context.params;
    await enforceAuthRateLimit("rsvp-link", user._id.toString(), p.guestId, 20);
    const response = successResponse(
      await createRsvpLink(user._id, p.weddingId, p.guestId),
      201,
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  },
);
export const DELETE = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request, true);
    const p = await context.params;
    return successResponse(
      await revokeRsvpLink(user._id, p.weddingId, p.guestId),
    );
  },
);
