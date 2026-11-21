import AuthShell from "../auth-shell";
import { ResendVerificationForm } from "../auth-forms";

export const metadata = { title: "Verify Your Email | Make My Marriage" };

export default async function ResendVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ nextTo?: string }>;
}) {
  const { nextTo } = await searchParams;
  return (
    <AuthShell mode="verify">
      <ResendVerificationForm nextTo={nextTo} />
    </AuthShell>
  );
}
