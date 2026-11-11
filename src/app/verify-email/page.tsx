import AuthShell from "../auth-shell";
import { VerificationStatus } from "../auth-forms";

export const metadata = { title: "Verify Your Email | Make My Marriage" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <AuthShell mode="verify">
      <VerificationStatus token={token} />
    </AuthShell>
  );
}
