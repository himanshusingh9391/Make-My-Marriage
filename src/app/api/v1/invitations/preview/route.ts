import { NextRequest } from "next/server";
import { getInvitationPreview } from "@/features/weddings/invitations-service";
import { invitationTokenSchema } from "@/features/weddings/invitation-schemas";
import { successResponse } from "@/lib/http/responses";
import { withErrorHandling } from "@/lib/http/with-error-handling";

export const runtime = "nodejs";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  const input = invitationTokenSchema.parse(body);
  return successResponse(await getInvitationPreview(input.token));
});
