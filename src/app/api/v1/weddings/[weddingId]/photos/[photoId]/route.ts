import { NextRequest } from "next/server";
import { deletePhoto } from "@/features/gallery/service";
import { successResponse } from "@/lib/http/responses";
import { requireSessionRequest } from "@/lib/http/session-request";
import { withErrorHandling } from "@/lib/http/with-error-handling";

export const runtime = "nodejs";

export const DELETE = withErrorHandling(
  async (
    request: NextRequest,
    context: { params: Promise<{ weddingId: string; photoId: string }> },
  ) => {
    const user = await requireSessionRequest(request, true);
    const { weddingId, photoId } = await context.params;
    return successResponse(await deletePhoto(user._id, weddingId, photoId));
  },
);
