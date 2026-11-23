import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/http/with-error-handling";
import { successResponse } from "@/lib/http/responses";
import { requireSessionRequest } from "@/lib/http/session-request";
import { listPhotos, uploadPhotos } from "@/features/gallery/service";
export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string }> };
export const GET = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request);
    const { weddingId } = await context.params;
    return successResponse(await listPhotos(user._id, weddingId));
  },
);
export const POST = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request, true);
    const { weddingId } = await context.params;
    const data = await request.formData();
    const files = data
      .getAll("photos")
      .filter((value): value is File => value instanceof File);
    return successResponse(
      await uploadPhotos(
        user._id,
        weddingId,
        typeof data.get("eventId") === "string"
          ? (data.get("eventId") as string)
          : null,
        files,
      ),
      201,
    );
  },
);
