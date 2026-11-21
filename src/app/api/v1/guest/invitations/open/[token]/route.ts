import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/http/with-error-handling";
import { successResponse } from "@/lib/http/responses";
import {
  registerSharedGuest,
  readHousehold,
} from "@/features/rsvp/shared-links";
import { guardRsvpRequest } from "@/features/rsvp/request";
export const POST = withErrorHandling(
  async (
    request: NextRequest,
    context: { params: Promise<{ token: string }> },
  ) => {
    const { token } = await context.params;
    await guardRsvpRequest(request, token, true);
    return successResponse(
      await registerSharedGuest(token, await request.json()),
      201,
    );
  },
);

export const GET = withErrorHandling(
  async (
    request: NextRequest,
    context: { params: Promise<{ token: string }> },
  ) => {
    const { token } = await context.params;
    await guardRsvpRequest(request, token);
    return successResponse(
      await readHousehold(token, request.headers.get("x-household-key") ?? ""),
    );
  },
);
