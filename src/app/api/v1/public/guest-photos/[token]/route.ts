import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/http/with-error-handling";
import { successResponse } from "@/lib/http/responses";
import { albumInput } from "@/features/gallery/guest-validation";
import {
  resolveAlbum,
  resolveUploadEvent,
} from "@/features/gallery/guest-access";
import { storeAlbumPhotos } from "@/features/gallery/service";
import { AppError } from "@/lib/http/app-error";
import { enforceAuthRateLimit } from "@/features/auth/service";
export const POST = withErrorHandling(
  async (request: NextRequest, ctx: { params: Promise<{ token: string }> }) => {
    const album = await resolveAlbum((await ctx.params).token);
    await enforceAuthRateLimit(
      "guest-photo-upload",
      album.weddingId.toString(),
      (album.eventId?.toString() ?? "general") +
        Math.floor(Date.now() / 900000),
      120,
    );
    const length = Number(request.headers.get("content-length"));
    if (!length || length > 10 * 1024 * 1024 + 65536)
      throw new AppError("Choose one image up to 10 MB.", "INVALID_SIZE", 413);
    const data = await request.formData();
    const file = data.get("photo");
    if (!(file instanceof File))
      throw new AppError("Choose a photo.", "INVALID_PHOTO", 400);
    const { eventId } = albumInput.parse({
      eventId: data.get("eventId") || null,
    });
    await storeAlbumPhotos(
      album.weddingId,
      await resolveUploadEvent(album, eventId),
      [file],
      true,
    );
    return successResponse({ uploaded: true }, 201);
  },
);
