import AuthShell from "../auth-shell";
import { ForgotPasswordForm } from "../auth-forms";

export const metadata = { title: "Account Recovery | Make My Marriage" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell mode="recovery">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
