import { NextRequest } from "next/server";
import { enforceAuthRateLimit, verifyEmailAddress } from "@/features/auth/service";
import { verificationSchema } from "@/features/auth/schemas";
import { successResponse } from "@/lib/http/responses";
import { withErrorHandling } from "@/lib/http/with-error-handling";

export const runtime = "nodejs";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const { token } = verificationSchema.parse(body);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  await enforceAuthRateLimit("verify-email", ip, token, 10);
  await verifyEmailAddress(token);
  return successResponse({ message: "Email verified. You can now sign in." });
});
