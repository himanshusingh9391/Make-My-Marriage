import { NextRequest } from "next/server";
import { websiteSettingsInput } from "@/features/weddings/website-schema";
import {
  getWebsiteSettings,
  updateWebsiteSettings,
} from "@/features/weddings/website-service";
import { requireSessionRequest } from "@/lib/http/session-request";
import { successResponse } from "@/lib/http/responses";
import { withErrorHandling } from "@/lib/http/with-error-handling";

type Context = { params: Promise<{ weddingId: string }> };

export const GET = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request);
    const { weddingId } = await context.params;
    return successResponse(await getWebsiteSettings(user._id, weddingId));
  },
);

export const PATCH = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request, true);
    const input = websiteSettingsInput.parse(await request.json());
    const { weddingId } = await context.params;
    return successResponse(
      await updateWebsiteSettings(user._id, weddingId, input),
    );
  },
);
