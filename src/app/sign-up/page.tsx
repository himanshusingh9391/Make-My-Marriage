import AuthShell from "../auth-shell";
import { SignUpForm } from "../auth-forms";

export const metadata = {
  title: "Create Your Wedding Suite | Make My Marriage",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ nextTo?: string | string[] }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell mode="sign-up">
      <SignUpForm
        nextTo={typeof params.nextTo === "string" ? params.nextTo : undefined}
      />
    </AuthShell>
  );
}
