import { NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/service";
import { SESSION_COOKIE_NAME } from "@/features/auth/security";
import { revokeWeddingInvitation } from "@/features/weddings/invitations-service";
import { AppError } from "@/lib/http/app-error";
import { successResponse } from "@/lib/http/responses";
import { withErrorHandling } from "@/lib/http/with-error-handling";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ weddingId: string; invitationId: string }> };

export const DELETE = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const origin = request.headers.get("origin");
  if ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new AppError("This request could not be verified.", "CSRF_VALIDATION_FAILED", 403);
  }
  const user = await getSessionUser(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!user) throw new AppError("Sign in to continue.", "UNAUTHENTICATED", 401);
  const { weddingId, invitationId } = await context.params;
  return successResponse(await revokeWeddingInvitation(user._id, weddingId, invitationId));
});
