"use client";
import { useState } from "react";
import common from "../events/events.module.css";
import styles from "./guests.module.css";
export default function RsvpShare({
  weddingId,
  guestId,
  guestName,
  initial,
  readOnly,
}: {
  weddingId: string;
  guestId: string;
  guestName: string;
  initial: { active: boolean; expiresAt: string | null };
  readOnly: boolean;
}) {
  const [state, setState] = useState(initial),
    [url, setUrl] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [previousInitial, setPreviousInitial] = useState(initial);
  if (
    previousInitial.active !== initial.active ||
    previousInitial.expiresAt !== initial.expiresAt
  ) {
    setPreviousInitial(initial);
    setState(initial);
    if (state.expiresAt !== initial.expiresAt || !initial.active) setUrl("");
  }
  async function change(method: "POST" | "DELETE") {
    if (busy) return;
    if (
      (method === "DELETE" || state.active) &&
      !window.confirm(
        method === "DELETE"
          ? "Revoke this guest’s RSVP link? Existing responses will be kept."
          : "Generate a new link? The previous RSVP link will stop working.",
      )
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/v1/weddings/${weddingId}/guests/${guestId}/rsvp-link`,
        { method },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.error?.message ?? "Could not update the link.");
      setState({
        active: result.data.active,
        expiresAt: result.data.expiresAt ?? null,
      });
      setUrl(result.data.url ?? "");
      setMessage(
        method === "POST"
          ? "Your personal invitation link is ready to share."
          : "Link revoked. Existing RSVP responses are kept.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Invitation link copied.");
    } catch {
      setError("Copy was unavailable. Select and copy the link below.");
    }
  }
  return (
    <section
      className={`${common.card} ${styles.share}`}
      aria-labelledby="rsvp-sharing"
    >
      <h2 id="rsvp-sharing">Personal invitation & RSVP</h2>
      <p>
        Share {guestName}’s private invitation with their family. No sign-up or
        login is needed. Anyone with this link can view and update this guest’s
        response.
      </p>
      <p className={common.notice}>
        {state.active
          ? `Active link · expires ${new Date(state.expiresAt!).toLocaleDateString("en-IN")}`
          : "No active RSVP link"}
        . Creating a share link does not send email.
      </p>
      {state.active && !url && (
        <p>
          The existing link cannot be retrieved. Generate a new one if you need
          to copy it again.
        </p>
      )}
      {error && (
        <p role="alert" className={common.error}>
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {url && (
        <>
          <label className={styles.shareLabel}>
            Invitation link
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <div className={common.actions}>
            <button type="button" className={common.primary} onClick={copy}>
              Copy link
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className={common.secondary}
            >
              Preview invitation
            </a>
            <a
              className={common.secondary}
              href={`https://wa.me/?text=${encodeURIComponent(`You're invited! View your personal invitation and RSVP: ${url}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Share on WhatsApp
            </a>
          </div>
          {/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(url) && (
            <p className={common.notice}>
              This local link opens only on this computer. To share with other
              people online, deploy the app and set its public app URL to your
              live address.
            </p>
          )}
        </>
      )}
      {!readOnly && (
        <div className={common.actions}>
          <button
            type="button"
            className={common.secondary}
            disabled={busy}
            onClick={() => change("POST")}
          >
            {busy
              ? "Please wait…"
              : state.active
                ? "Generate new link"
                : "Create invitation link"}
          </button>
          {state.active && (
            <button
              type="button"
              className={common.danger}
              disabled={busy}
              onClick={() => change("DELETE")}
            >
              Revoke link
            </button>
          )}
        </div>
      )}
    </section>
  );
}
