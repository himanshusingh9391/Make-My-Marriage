import AuthShell from "../auth-shell";
import { SignInForm } from "../auth-forms";

export const metadata = { title: "Sign In | Make My Marriage" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    registered?: string | string[];
    verify?: string | string[];
    nextTo?: string | string[];
  }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell mode="sign-in">
      <SignInForm
        registered={params.registered === "1"}
        verificationRequired={params.verify === "1"}
        nextTo={typeof params.nextTo === "string" ? params.nextTo : undefined}
      />
    </AuthShell>
  );
}
