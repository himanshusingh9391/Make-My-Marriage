import { NextRequest } from "next/server";
import { saveRsvps } from "@/features/rsvp/service";
import { guardRsvpRequest } from "@/features/rsvp/request";
import { withErrorHandling } from "@/lib/http/with-error-handling";
import { successResponse } from "@/lib/http/responses";
export const runtime = "nodejs";
type Context = { params: Promise<{ token: string; eventId: string }> };
export const PUT = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const { token, eventId } = await context.params;
    await guardRsvpRequest(request, token, true);
    const response = successResponse(
      await saveRsvps(token, {
        responses: [
          { eventId, response: await request.json().catch(() => null) },
        ],
      }),
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  },
);
