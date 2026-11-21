import { NextRequest } from "next/server";
import { getSessionUser, enforceAuthRateLimit } from "@/features/auth/service";
import { SESSION_COOKIE_NAME } from "@/features/auth/security";
import {
  listGuestInvitations,
  sendGuestInvitation,
  revokeGuestInvitation,
  guestInviteSchema,
  guestIdSchema,
} from "@/features/guests/invitations";
import { invitationPageSchema } from "@/features/weddings/invitation-schemas";
import { AppError } from "@/lib/http/app-error";
import { successResponse } from "@/lib/http/responses";
import { withErrorHandling } from "@/lib/http/with-error-handling";

export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string }> };
async function authenticate(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (
    request.method !== "GET" &&
    ((origin && origin !== request.nextUrl.origin) ||
      request.headers.get("sec-fetch-site") === "cross-site")
  )
    throw new AppError(
      "This request could not be verified.",
      "CSRF_VALIDATION_FAILED",
      403,
    );
  const user = await getSessionUser(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!user) throw new AppError("Sign in to continue.", "UNAUTHENTICATED", 401);
  return user;
}
export const GET = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await authenticate(request);
    const { weddingId } = await context.params;
    const { page } = invitationPageSchema.parse({
      page: request.nextUrl.searchParams.get("page") ?? undefined,
    });
    return successResponse(
      await listGuestInvitations(user._id, weddingId, page),
    );
  },
);
export const POST = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await authenticate(request);
    const { weddingId } = await context.params;
    const input = guestInviteSchema.parse(
      await request.json().catch(() => null),
    );
    await enforceAuthRateLimit(
      "guest-invitation",
      user._id.toString(),
      input.email,
      8,
    );
    return successResponse(
      await sendGuestInvitation(user._id, weddingId, input),
      201,
    );
  },
);
export const DELETE = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await authenticate(request);
    const { weddingId } = await context.params;
    const guestId = guestIdSchema.parse(
      request.nextUrl.searchParams.get("guestId"),
    );
    return successResponse(
      await revokeGuestInvitation(user._id, weddingId, guestId),
    );
  },
);
