import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/http/with-error-handling";
import { successResponse } from "@/lib/http/responses";
import {
  readHouseholdByToken,
  updateHouseholdByToken,
} from "@/features/rsvp/shared-links";
import { guardRsvpRequest } from "@/features/rsvp/request";

export const runtime = "nodejs";

type Context = { params: Promise<{ token: string }> };

export const GET = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const { token } = await context.params;
    await guardRsvpRequest(request, token);
    return successResponse(await readHouseholdByToken(token));
  },
);

export const PUT = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const { token } = await context.params;
    await guardRsvpRequest(request, token, true);
    return successResponse(
      await updateHouseholdByToken(token, await request.json()),
    );
  },
);
