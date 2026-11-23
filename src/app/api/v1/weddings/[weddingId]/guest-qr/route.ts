import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/http/with-error-handling";
import { successResponse } from "@/lib/http/responses";
import { requireSessionRequest } from "@/lib/http/session-request";
import { manageLink } from "@/features/gallery/guest-access";
const manage = withErrorHandling(
  async (
    request: NextRequest,
    ctx: { params: Promise<{ weddingId: string }> },
  ) => {
    const user = await requireSessionRequest(request, true);
    const token = await manageLink(
      user._id,
      (await ctx.params).weddingId,
      request.method === "DELETE",
    );
    return successResponse({ path: token ? "/guest-photos/" + token : null });
  },
);
export { manage as POST, manage as DELETE };
