import { NextRequest } from "next/server";
import { acceptGuestInvitation } from "@/features/guests/invitations";
import { invitationTokenSchema } from "@/features/weddings/invitation-schemas";
import { AppError } from "@/lib/http/app-error";
import { successResponse } from "@/lib/http/responses";
import { withErrorHandling } from "@/lib/http/with-error-handling";
export const runtime = "nodejs";
export const POST = withErrorHandling(async (request: NextRequest) => {
  const origin = request.headers.get("origin");
  if ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new AppError("This request could not be verified.", "CSRF_VALIDATION_FAILED", 403);
  const { token } = invitationTokenSchema.parse(await request.json().catch(() => null));
  return successResponse(await acceptGuestInvitation(token));
});
