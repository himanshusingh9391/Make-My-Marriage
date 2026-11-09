import { successResponse } from "@/lib/http/responses";

export const runtime = "nodejs";

export function GET() {
  return successResponse({ status: "ok", application: "Make My Marriage" });
}
