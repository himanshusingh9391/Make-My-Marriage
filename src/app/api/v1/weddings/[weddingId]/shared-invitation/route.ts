import { NextRequest } from "next/server";
import { requireSessionRequest } from "@/lib/http/session-request";
import { withErrorHandling } from "@/lib/http/with-error-handling";
import { successResponse } from "@/lib/http/responses";
import { setSharedLink, revokeSharedLink } from "@/features/rsvp/shared-links";
type Context = { params: Promise<{ weddingId: string }> };
export const POST = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request, true);
    return successResponse(
      await setSharedLink(
        user._id,
        (await context.params).weddingId,
        await request.json(),
      ),
      201,
    );
  },
);
export const DELETE = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request, true);
    await revokeSharedLink(user._id, (await context.params).weddingId);
    return successResponse({ active: false });
  },
);
