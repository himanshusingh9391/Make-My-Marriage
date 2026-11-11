import AuthShell from "../auth-shell";
import { ResendVerificationForm } from "../auth-forms";

export const metadata = { title: "Verify Your Email | Make My Marriage" };

export default function ResendVerificationPage() {
  return (
    <AuthShell mode="verify">
      <ResendVerificationForm />
    </AuthShell>
  );
}
