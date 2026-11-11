import AuthShell from "../auth-shell";
import { SignUpForm } from "../auth-forms";

export const metadata = { title: "Create Your Wedding Suite | Make My Marriage" };

export default function SignUpPage() {
  return (
    <AuthShell mode="sign-up">
      <SignUpForm />
    </AuthShell>
  );
}
