import AuthShell from "../auth-shell";
import { ResetPasswordForm } from "../auth-forms";

export const metadata = { title: "Reset Password | Make My Marriage" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <AuthShell mode="recovery">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
