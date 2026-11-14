"use client";

import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthHeading, AuthPrimaryButton, authStyles as styles } from "./auth-shell";

type ApiEnvelope = {
  success?: boolean;
  data?: { message?: string; emailVerificationRequired?: boolean };
  error?: { message?: string };
};

async function readApiResponse(response: Response): Promise<ApiEnvelope> {
  const payload: unknown = await response.json().catch(() => null);
  if (typeof payload !== "object" || payload === null) return {};
  const record = payload as Record<string, unknown>;
  const data = typeof record.data === "object" && record.data !== null
    ? record.data as Record<string, unknown>
    : undefined;
  const error = typeof record.error === "object" && record.error !== null
    ? record.error as Record<string, unknown>
    : undefined;

  return {
    success: record.success === true,
    data: data
      ? {
          ...(typeof data.message === "string" ? { message: data.message } : {}),
          ...(typeof data.emailVerificationRequired === "boolean"
            ? { emailVerificationRequired: data.emailVerificationRequired }
            : {}),
        }
      : undefined,
    error: typeof error?.message === "string" ? { message: error.message } : undefined,
  };
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.authField}>
      <div className={styles.authFieldLabelRow}>
        <label htmlFor={id}>{label}</label>
        {hint && <span>{hint}</span>}
      </div>
      <div className={styles.authInputWrap}>
        <LockKeyhole size={18} aria-hidden="true" />
        <input
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          autoComplete={id === "new-password" ? "new-password" : "current-password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          minLength={id === "new-password" ? 12 : undefined}
          maxLength={128}
          pattern={id === "new-password" ? "(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{12,128}" : undefined}
          title={id === "new-password" ? "Use at least 12 characters with lowercase, uppercase, a number, and a symbol." : undefined}
          placeholder={id === "new-password" ? "Create a secure password" : "Enter your password"}
        />
        <button
          className={styles.passwordToggle}
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

function GoogleOption() {
  return (
    <>
      <div className={styles.authDivider}><span>Or continue with</span></div>
      <button className={styles.authProviderButton} type="button" disabled title="Google sign-in is not configured yet">
        <span className={styles.googleMark} aria-hidden="true">G</span>
        Google sign-in · coming soon
      </button>
    </>
  );
}

export function SignInForm({
  registered = false,
  verificationRequired = false,
}: {
  registered?: boolean;
  verificationRequired?: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(
    registered
      ? verificationRequired
        ? "Your account was created. Verify your email before signing in."
        : "Your account is ready. Sign in to set up your wedding."
      : "",
  );
  const [messageType, setMessageType] = useState<"error" | "success">(
    registered ? "success" : "error",
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password,
          rememberMe: formData.get("rememberMe") === "on",
        }),
      });
      const payload = await readApiResponse(response);
      if (!response.ok) throw new Error(payload.error?.message ?? "We could not sign you in. Please try again.");
      router.replace("/dashboard");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "We could not sign you in. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AuthHeading
        eyebrow="Wedding suite access"
        title="Welcome back"
        description="Enter your credentials to continue curating your celebrations."
      />
      <form className={styles.authForm} onSubmit={onSubmit}>
        <div className={styles.authField}>
          <div className={styles.authFieldLabelRow}>
            <label htmlFor="email">Member email</label><span>Confidential</span>
          </div>
          <div className={styles.authInputWrap}>
            <Mail size={18} aria-hidden="true" />
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="couple@example.com" />
          </div>
        </div>
        <PasswordField id="current-password" label="Vault password" value={password} onChange={setPassword} />
        <div className={styles.authOptions}>
          <label className={styles.rememberLabel}><input type="checkbox" name="rememberMe" /> <span>Remember for 30 days</span></label>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        <AuthPrimaryButton disabled={pending}>{pending ? "Signing in…" : "Access wedding suite"}</AuthPrimaryButton>
        <GoogleOption />
        {message && <p className={messageType === "error" ? styles.authError : styles.authSuccess} role="status">{message}</p>}
      </form>
      {message === "Verify your email before signing in." && (
        <p className={styles.authSwitch}><Link href="/resend-verification">Resend the verification email</Link></p>
      )}
      <p className={styles.authSwitch}>New here? <Link href="/sign-up">Create an account</Link></p>
      <p className={styles.authPrivacy}><LockKeyhole size={14} aria-hidden="true" /> Protected account access · Your guest details stay private</p>
    </>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          password,
        }),
      });
      const payload = await readApiResponse(response);
      if (!response.ok) throw new Error(payload.error?.message ?? "We could not create your account.");
      const verificationParam = payload.data?.emailVerificationRequired ? "&verify=1" : "";
      router.replace(`/sign-in?registered=1${verificationParam}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not create your account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AuthHeading
        eyebrow="New account"
        title="Begin your story"
        description="Create your account first. You’ll add your wedding details after signing in."
      />
      <form className={styles.authForm} onSubmit={onSubmit}>
        <div className={styles.authField}>
          <label htmlFor="full-name">Full name</label>
          <div className={styles.authInputWrap}><UserRound size={17} aria-hidden="true" /><input id="full-name" name="fullName" autoComplete="name" required maxLength={120} placeholder="Your full name" /></div>
        </div>
        <div className={styles.authField}>
          <div className={styles.authFieldLabelRow}><label htmlFor="register-email">Email</label><span>Confidential</span></div>
          <div className={styles.authInputWrap}><Mail size={17} aria-hidden="true" /><input id="register-email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></div>
        </div>
        <PasswordField id="new-password" label="Create vault password" hint="At least 12 characters" value={password} onChange={setPassword} />
        <AuthPrimaryButton disabled={pending}>{pending ? "Creating your account…" : "Create account"}</AuthPrimaryButton>
        {message && <p className={styles.authError} role="status">{message}</p>}
      </form>
      <p className={styles.authSwitch}>Already have an account? <Link href="/sign-in">Sign in</Link></p>
      <p className={styles.authPrivacy}><LockKeyhole size={14} aria-hidden="true" /> Protected account access · Your guest details stay private</p>
    </>
  );
}
export function VerificationStatus({ token }: { token: string }) {
  const [message, setMessage] = useState(
    token ? "Verifying your email…" : "This verification link is missing its token.",
  );
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    if (!token) {
      return () => { active = false; };
    }

    fetch("/api/v1/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const payload = await readApiResponse(response);
        if (!response.ok) throw new Error(payload.error?.message ?? "This link is invalid or expired.");
        if (active) {
          setSuccess(true);
          setMessage(payload.data?.message ?? "Your email is verified. You can sign in now.");
        }
      })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : "Verification failed. Please try again.");
      });

    return () => { active = false; };
  }, [token]);

  return (
    <div className={styles.verifyStatus}>
      <AuthHeading eyebrow="Email verification" title={success ? "Your story can begin." : "Confirming your email."} description={message} />
      {success && <Link className={styles.authPrimaryButton} href="/sign-in"><span>Continue to sign in</span><Mail size={18} aria-hidden="true" /></Link>}
      {!success && <Link className={styles.authTextLink} href="/sign-up">Return to sign up</Link>}
    </div>
  );
}

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const email = new FormData(event.currentTarget).get("email");
    try {
      const response = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await readApiResponse(response);
      if (!response.ok) throw new Error(payload.error?.message ?? "Please try again shortly.");
      setError(false);
      setMessage(payload.data?.message ?? "If an account matches that email, a reset link has been sent.");
    } catch (issue) {
      setError(true);
      setMessage(issue instanceof Error ? issue.message : "Please try again shortly.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AuthHeading eyebrow="Account recovery" title="A fresh beginning" description="Enter your account email and we’ll send a secure password reset link." />
      <form className={styles.authForm} onSubmit={onSubmit}>
        <div className={styles.authField}><label htmlFor="recovery-email">Member email</label><div className={styles.authInputWrap}><Mail size={18} aria-hidden="true" /><input id="recovery-email" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="couple@example.com" /></div></div>
        <AuthPrimaryButton disabled={pending}>{pending ? "Sending…" : "Send reset link"}</AuthPrimaryButton>
        {message && <p className={error ? styles.authError : styles.authSuccess} role="status">{message}</p>}
      </form>
      <p className={styles.authSwitch}><Link href="/sign-in">Return to sign in</Link></p>
    </>
  );
}

export function ResendVerificationForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const email = new FormData(event.currentTarget).get("email");
    try {
      const response = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await readApiResponse(response);
      if (!response.ok) throw new Error(payload.error?.message ?? "Please try again shortly.");
      setError(false);
      setMessage(payload.data?.message ?? "If the account needs verification, a link has been sent.");
    } catch (issue) {
      setError(true);
      setMessage(issue instanceof Error ? issue.message : "Please try again shortly.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AuthHeading eyebrow="Email verification" title="Check your inbox." description="Enter the email used to create your wedding suite and we’ll send a fresh verification link if it’s still needed." />
      <form className={styles.authForm} onSubmit={onSubmit}>
        <div className={styles.authField}><label htmlFor="verification-email">Wedding email</label><div className={styles.authInputWrap}><Mail size={18} aria-hidden="true" /><input id="verification-email" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="couple@example.com" /></div></div>
        <AuthPrimaryButton disabled={pending}>{pending ? "Sending…" : "Send verification link"}</AuthPrimaryButton>
        {message && <p className={error ? styles.authError : styles.authSuccess} role="status">{message}</p>}
      </form>
      <p className={styles.authSwitch}><Link href="/sign-in">Return to sign in</Link></p>
    </>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await readApiResponse(response);
      if (!response.ok) throw new Error(payload.error?.message ?? "This reset link is invalid or expired.");
      setSuccess(true);
      setMessage(payload.data?.message ?? "Your password has been reset.");
      setPassword("");
    } catch (issue) {
      setSuccess(false);
      setMessage(issue instanceof Error ? issue.message : "Password reset failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AuthHeading eyebrow="Choose a new password" title="Your suite, secured." description="Use at least 12 characters with a mix of letters, numbers and symbols." />
      <form className={styles.authForm} onSubmit={onSubmit}>
        <PasswordField id="new-password" label="New vault password" value={password} onChange={setPassword} />
        <AuthPrimaryButton disabled={pending || !token}>{pending ? "Updating…" : "Reset password"}</AuthPrimaryButton>
        {message && <p className={success ? styles.authSuccess : styles.authError} role="status">{message}</p>}
      </form>
      {success && <p className={styles.authSwitch}><Link href="/sign-in">Continue to sign in</Link></p>}
    </>
  );
}
