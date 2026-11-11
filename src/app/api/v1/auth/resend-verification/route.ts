import { NextRequest } from "next/server";
import { enforceAuthRateLimit, resendVerificationForEmail } from "@/features/auth/service";
import { emailSchema } from "@/features/auth/schemas";
import { successResponse } from "@/lib/http/responses";
import { withErrorHandling } from "@/lib/http/with-error-handling";

export const runtime = "nodejs";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const { email } = emailSchema.parse(body);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  await enforceAuthRateLimit("resend-verification", ip, email, 3);
  await resendVerificationForEmail(email);
  return successResponse({ message: "If the account needs verification, a link has been sent." });
});
