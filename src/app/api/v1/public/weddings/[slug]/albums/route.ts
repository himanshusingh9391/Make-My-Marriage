import { NextRequest } from "next/server";
import { getPublicWeddingWebsite } from "@/features/weddings/website-service";
import { successResponse } from "@/lib/http/responses";
import { withErrorHandling } from "@/lib/http/with-error-handling";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(
  async (
    _request: NextRequest,
    context: { params: Promise<{ slug: string }> },
  ) => {
    const { slug } = await context.params;
    const website = await getPublicWeddingWebsite(slug);
    return successResponse({ photos: website.gallery });
  },
);
