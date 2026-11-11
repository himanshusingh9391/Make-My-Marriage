import { NextRequest } from "next/server";
import { enforceAuthRateLimit, resetPassword } from "@/features/auth/service";
import { passwordResetSchema } from "@/features/auth/schemas";
import { successResponse } from "@/lib/http/responses";
import { withErrorHandling } from "@/lib/http/with-error-handling";

export const runtime = "nodejs";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const input = passwordResetSchema.parse(body);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  await enforceAuthRateLimit("reset-password", ip, input.token, 5);
  await resetPassword(input.token, input.password);
  return successResponse({ message: "Password reset. You can sign in with your new password." });
});
