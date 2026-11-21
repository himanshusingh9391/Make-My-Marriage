"use client";
import { useState } from "react";
import common from "../events/events.module.css";
type LinkState = { url: string; expiresAt: string } | null;
export default function SharedInvitation({
  weddingId,
  initial,
}: {
  weddingId: string;
  initial: LinkState;
}) {
  const [link, setLink] = useState(initial),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function change(method: "POST" | "DELETE", body?: unknown) {
    if (
      link &&
      !confirm(
        method === "DELETE"
          ? "Revoke this shared invitation?"
          : "Replace the current shared invitation link?",
      )
    )
      return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(
        "/api/v1/weddings/" + weddingId + "/shared-invitation",
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result = await response.json();
      if (!result.success) throw new Error(result.error.message);
      setLink(method === "DELETE" ? null : result.data);
      setNotice(
        method === "DELETE"
          ? "Shared invitation revoked."
          : "Your link is ready to share.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={common.card}>
      <h2>Share a wedding invitation</h2>
      <p>
        Share one link. Each household can accept or decline and enter how many
        people are coming.
      </p>
      {link && (
        <>
          <label>
            Shared invitation link
            <input
              value={link.url}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <div className={common.actions}>
            <button
              className={common.primary}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link.url);
                  setNotice("Invitation link copied.");
                } catch {
                  setNotice("Select the link above and copy it.");
                }
              }}
            >
              Copy link
            </button>
            <a
              className={common.secondary}
              target="_blank"
              rel="noreferrer"
              href={link.url}
            >
              Preview invitation
            </a>
            <a
              className={common.secondary}
              target="_blank"
              rel="noreferrer"
              href={"https://wa.me/?text=" + encodeURIComponent(link.url)}
            >
              Share on WhatsApp
            </a>
            <button
              className={common.secondary}
              disabled={busy}
              onClick={() => change("DELETE")}
            >
              Revoke link
            </button>
          </div>
        </>
      )}
      {!link && (
        <button
          className={common.primary}
          disabled={busy}
          onClick={() => change("POST", {})}
        >
          {busy ? "Creating…" : "Create link"}
        </button>
      )}
      <p role="status">{notice}</p>
    </section>
  );
}
