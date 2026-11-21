"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarHeart,
  CheckCircle2,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";
import styles from "./invitation-acceptance.module.css";

type Preview = {
  email: string;
  role: "ADMIN" | "MANAGER";
  weddingName: string;
  coupleNames: string;
  status: string;
  weddingId: string;
};
type Envelope = {
  success?: boolean;
  data?: Preview;
  error?: { message?: string };
};

export default function InvitationAcceptance({ token }: { token: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(Boolean(token));
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const nextTo = token
    ? `/invitations/accept?token=${encodeURIComponent(token)}`
    : "/dashboard";

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetch("/api/v1/invitations/preview", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as Envelope;
        if (!response.ok)
          throw new Error(
            payload.error?.message ?? "This invitation link is invalid.",
          );
        if (active) setPreview(payload.data ?? null);
      })
      .catch((error: unknown) => {
        if (active)
          setMessage(
            error instanceof Error
              ? error.message
              : "This invitation link is invalid.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function accept() {
    setAccepting(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (response.status === 401) {
        router.push(`/sign-in?nextTo=${encodeURIComponent(nextTo)}`);
        return;
      }
      const payload = (await response.json()) as Envelope;
      if (!response.ok)
        throw new Error(
          payload.error?.message ?? "We could not accept this invitation.",
        );
      setAccepted(true);
      router.push(
        `/dashboard?workspace=${encodeURIComponent(payload.data?.weddingId ?? "")}`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not accept this invitation.",
      );
    } finally {
      setAccepting(false);
    }
  }

  const statusMessage =
    preview?.status === "EXPIRED"
      ? "This invitation has expired. Ask the wedding admin to send a new one."
      : preview?.status === "REVOKED"
        ? "This invitation was cancelled. Ask the wedding admin for a new link."
        : preview?.status === "ACCEPTED"
          ? "This invitation has already been used. Sign in to open your wedding suite."
          : "";

  return (
    <section className={styles.card}>
      <span className={styles.icon}>
        {accepted ? (
          <CheckCircle2 size={23} />
        ) : loading ? (
          <LoaderCircle size={23} className={styles.spin} />
        ) : (
          <CalendarHeart size={23} />
        )}
      </span>
      <p className={styles.eyebrow}>A PLACE IN THE CELEBRATION</p>
      <h1>
        {accepted
          ? "You’re part of the team."
          : loading
            ? "Opening your invitation…"
            : "You’re invited."}
      </h1>
      {preview && (
        <>
          <p className={styles.wedding}>{preview.weddingName}</p>
          {preview.coupleNames && (
            <p className={styles.couple}>{preview.coupleNames}</p>
          )}
          <p className={styles.invitedAs}>
            You’ve been invited as a{" "}
            <strong>{preview.role.toLowerCase()}</strong>.
          </p>
          <p className={styles.email}>
            <Mail size={15} /> Invitation sent to{" "}
            <strong>{preview.email}</strong>
          </p>
        </>
      )}
      {loading && (
        <p className={styles.copy}>
          Checking that this private invitation is still active.
        </p>
      )}
      {statusMessage && (
        <p className={styles.message} role="status">
          {statusMessage}
        </p>
      )}
      {(message || (!token && !loading)) && (
        <p className={styles.message} role="alert">
          {message || "This invitation link is missing its token."}
        </p>
      )}
      {!loading && preview?.status === "PENDING" && !accepted && (
        <>
          <button
            className={styles.primary}
            type="button"
            disabled={accepting}
            onClick={() => void accept()}
          >
            {accepting ? "Joining…" : "Accept invitation"}
          </button>
          <p className={styles.copy}>
            Already have an account?{" "}
            <Link href={`/sign-in?nextTo=${encodeURIComponent(nextTo)}`}>
              Sign in with the invited email
            </Link>
            .
          </p>
          <p className={styles.copy}>
            New to Make My Marriage?{" "}
            <Link href={`/sign-up?nextTo=${encodeURIComponent(nextTo)}`}>
              Create an account
            </Link>
            , then return to accept.
          </p>
        </>
      )}
      {preview?.status === "ACCEPTED" && (
        <Link
          className={styles.primaryLink}
          href={`/sign-in?nextTo=${encodeURIComponent(`/dashboard?workspace=${preview.weddingId}`)}`}
        >
          Go to sign in
        </Link>
      )}
      <div className={styles.privacy}>
        <ShieldCheck size={16} />
        <span>
          This link is private, single-use, and expires after 7 days. Only the
          invited email can join.
        </span>
      </div>
    </section>
  );
}
