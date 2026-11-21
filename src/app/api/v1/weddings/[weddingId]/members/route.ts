import { NextRequest } from "next/server";
import { getSessionUser, enforceAuthRateLimit } from "@/features/auth/service";
import { SESSION_COOKIE_NAME } from "@/features/auth/security";
import {
  createWeddingInvitation,
  listWeddingMembers,
} from "@/features/weddings/invitations-service";
import {
  createWeddingInvitationSchema,
  invitationPageSchema,
} from "@/features/weddings/invitation-schemas";
import { AppError } from "@/lib/http/app-error";
import { successResponse } from "@/lib/http/responses";
import { withErrorHandling } from "@/lib/http/with-error-handling";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ weddingId: string }> };

function verifySameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    (origin && origin !== request.nextUrl.origin) ||
    fetchSite === "cross-site"
  ) {
    throw new AppError(
      "This request could not be verified.",
      "CSRF_VALIDATION_FAILED",
      403,
    );
  }
}

export const GET = withErrorHandling(
  async (request: NextRequest, context: RouteContext) => {
    const user = await getSessionUser(
      request.cookies.get(SESSION_COOKIE_NAME)?.value,
    );
    if (!user)
      throw new AppError("Sign in to continue.", "UNAUTHENTICATED", 401);
    const { weddingId } = await context.params;
    const { page } = invitationPageSchema.parse({
      page: request.nextUrl.searchParams.get("page") ?? undefined,
    });
    return successResponse(await listWeddingMembers(user._id, weddingId, page));
  },
);

export const POST = withErrorHandling(
  async (request: NextRequest, context: RouteContext) => {
    verifySameOrigin(request);
    const user = await getSessionUser(
      request.cookies.get(SESSION_COOKIE_NAME)?.value,
    );
    if (!user)
      throw new AppError("Sign in to continue.", "UNAUTHENTICATED", 401);
    const body: unknown = await request.json().catch(() => null);
    const input = createWeddingInvitationSchema.parse(body);
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    await enforceAuthRateLimit("wedding-invitation", ip, input.email, 8);
    const { weddingId } = await context.params;
    return successResponse(
      await createWeddingInvitation(user._id, weddingId, input),
      201,
    );
  },
);
