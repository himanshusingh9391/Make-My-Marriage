import { NextRequest } from "next/server";
import { getPersonalInvitation, saveRsvps } from "@/features/rsvp/service";
import { guardRsvpRequest } from "@/features/rsvp/request";
import { withErrorHandling } from "@/lib/http/with-error-handling";
import { successResponse } from "@/lib/http/responses";
export const runtime = "nodejs";
type Context = { params: Promise<{ token: string }> };
export const GET = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const { token } = await context.params;
    await guardRsvpRequest(request, token);
    const response = successResponse(await getPersonalInvitation(token));
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  },
);
export const PUT = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const { token } = await context.params;
    await guardRsvpRequest(request, token, true);
    const response = successResponse(
      await saveRsvps(token, await request.json().catch(() => null)),
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  },
);
