import { NextRequest } from "next/server";
import { authenticateUser, enforceAuthRateLimit } from "@/features/auth/service";
import { loginSchema } from "@/features/auth/schemas";
import { SESSION_COOKIE_NAME } from "@/features/auth/security";
import { AppError } from "@/lib/http/app-error";
import { successResponse } from "@/lib/http/responses";
import { withErrorHandling } from "@/lib/http/with-error-handling";
import { environment } from "@/lib/env/env";

export const runtime = "nodejs";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const input = loginSchema.parse(body);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  await enforceAuthRateLimit("login", ip, input.email);
  const result = await authenticateUser(input);
  const response = successResponse({
    user: {
      id: result.user._id.toString(),
      fullName: result.user.fullName,
      email: result.user.email,
    },
  });

  if (!environment.SESSION_SECRET) {
    throw new AppError("Session security is not configured.", "SERVER_CONFIGURATION_ERROR", 503);
  }

  response.cookies.set(SESSION_COOKIE_NAME, result.token, {
    httpOnly: true,
    secure: environment.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: result.expiresAt,
  });
  return response;
});
