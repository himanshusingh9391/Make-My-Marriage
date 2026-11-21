import { NextRequest } from "next/server";
import { requireSessionRequest } from "@/lib/http/session-request";
import { guestQuerySchema } from "@/features/guests/schemas";
import { listGuests, saveGuest } from "@/features/guests/service";
import { withErrorHandling } from "@/lib/http/with-error-handling";
import { successResponse } from "@/lib/http/responses";
export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string }> };
export const GET = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request);
    return successResponse(
      await listGuests(
        user._id,
        (await context.params).weddingId,
        guestQuerySchema.parse(
          Object.fromEntries(request.nextUrl.searchParams),
        ),
      ),
    );
  },
);
export const POST = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request, true);
    return successResponse(
      await saveGuest(
        user._id,
        (await context.params).weddingId,
        await request.json().catch(() => null),
      ),
      201,
    );
  },
);
