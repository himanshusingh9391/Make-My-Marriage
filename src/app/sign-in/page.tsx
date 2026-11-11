import AuthShell from "../auth-shell";
import { SignInForm } from "../auth-forms";

export const metadata = { title: "Sign In | Make My Marriage" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    registered?: string | string[];
    verify?: string | string[];
  }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell mode="sign-in">
      <SignInForm
        registered={params.registered === "1"}
        verificationRequired={params.verify === "1"}
      />
    </AuthShell>
  );
}
