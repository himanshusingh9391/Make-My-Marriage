import { NextRequest, NextResponse } from "next/server";
import { revokeSession } from "@/features/auth/service";
import { SESSION_COOKIE_NAME } from "@/features/auth/security";
import { withErrorHandling } from "@/lib/http/with-error-handling";

export const runtime = "nodejs";

export const POST = withErrorHandling(async (request: NextRequest) => {
  await revokeSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const response = NextResponse.json({ success: true, data: { message: "Signed out." } });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return response;
});
