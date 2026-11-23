import { NextRequest } from "next/server";
import { enforceAuthRateLimit } from "@/features/auth/service";
import { storeAlbumPhotos } from "@/features/gallery/service";
import {
  getPublicWeddingPhotoContext,
  resolvePublicPhotoEvent,
} from "@/features/weddings/website-service";
import { publicPhotoUploadInput } from "@/features/weddings/public-photo-schema";
import { AppError } from "@/lib/http/app-error";
import { successResponse } from "@/lib/http/responses";
import { withErrorHandling } from "@/lib/http/with-error-handling";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withErrorHandling(
  async (
    request: NextRequest,
    context: { params: Promise<{ slug: string }> },
  ) => {
    const { slug } = await context.params;
    const album = await getPublicWeddingPhotoContext(slug);
    await enforceAuthRateLimit(
      "public-wedding-photo-upload",
      album.weddingId.toString(),
      slug + Math.floor(Date.now() / 900000),
      120,
    );
    const contentLength = Number(request.headers.get("content-length"));
    if (!contentLength || contentLength > 10 * 1024 * 1024 + 65536) {
      throw new AppError("Choose one image up to 10 MB.", "INVALID_SIZE", 413);
    }

    const data = await request.formData();
    const file = data.get("photo");
    if (!(file instanceof File)) {
      throw new AppError("Choose a photo.", "INVALID_PHOTO", 400);
    }
    const parsed = publicPhotoUploadInput.parse({
      eventKey: data.get("eventKey") || null,
    });
    const eventId = await resolvePublicPhotoEvent(album, parsed.eventKey);
    await storeAlbumPhotos(album.weddingId, eventId, [file], true);
    return successResponse({ uploaded: true }, 201);
  },
);
