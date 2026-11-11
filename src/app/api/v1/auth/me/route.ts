import { NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/service";
import { SESSION_COOKIE_NAME } from "@/features/auth/security";
import { AppError } from "@/lib/http/app-error";
import { successResponse } from "@/lib/http/responses";
import { withErrorHandling } from "@/lib/http/with-error-handling";

export const runtime = "nodejs";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await getSessionUser(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!user) throw new AppError("Sign in to continue.", "UNAUTHENTICATED", 401);
  return successResponse({
    user: {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
    },
  });
});
