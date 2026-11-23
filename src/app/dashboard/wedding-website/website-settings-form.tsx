"use client";

import { useState, type FormEvent } from "react";
import styles from "./website.module.css";

type Settings = {
  slug: string;
  websitePublished: boolean;
  theme: string;
  livestreamUrl: string;
};

export default function WebsiteSettingsForm({
  weddingId,
  initial,
}: {
  weddingId: string;
  initial: Settings;
}) {
  const [settings, setSettings] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window === "undefined"
      ? "http://localhost:3000"
      : window.location.origin);
  const publicUrl = new URL("/wedding/" + initial.slug, origin).toString();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const next = {
      websitePublished: data.get("websitePublished") === "on",
      theme: String(data.get("theme")),
      livestreamUrl: String(data.get("livestreamUrl") ?? ""),
    };

    try {
      const response = await fetch(
        "/api/v1/weddings/" + weddingId + "/website",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(
          result.error?.message ?? "Could not save website settings.",
        );
      }
      setSettings((current) => ({ ...current, ...result.data }));
      setMessage("Website settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setMessage("Public website link copied.");
    } catch {
      setMessage("Copy the public website link from the field above.");
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.linkBox}>
        <label htmlFor="public-wedding-link">PUBLIC WEBSITE LINK</label>
        <input id="public-wedding-link" readOnly value={publicUrl} />
        <div className={styles.actions}>
          <button
            type="button"
            onClick={copyLink}
            disabled={!publicUrl || !settings.websitePublished}
          >
            Copy link
          </button>
          {settings.websitePublished && publicUrl && (
            <a href={publicUrl} target="_blank" rel="noreferrer">
              Preview website
            </a>
          )}
        </div>
        {!settings.websitePublished && (
          <p>Publish the website to make this link available to everyone.</p>
        )}
      </div>

      <form onSubmit={save}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            name="websitePublished"
            defaultChecked={settings.websitePublished}
          />
          <span>Publish website</span>
        </label>
        <p>
          Anyone with this link can view the wedding details, itinerary, and
          photos in your gallery.
        </p>

        <label>
          Website style
          <select name="theme" defaultValue={settings.theme}>
            <option value="ELEGANT_ROYAL">Elegant &amp; Royal</option>
            <option value="MINIMAL_MODERN">Minimal &amp; Modern</option>
            <option value="TRADITIONAL_INDIAN">Traditional Indian</option>
          </select>
        </label>

        <label>
          Livestream link (optional)
          <input
            name="livestreamUrl"
            type="url"
            placeholder="https://…"
            defaultValue={settings.livestreamUrl}
          />
        </label>

        <p>
          All non-cancelled events and uploaded gallery photos appear on the
          public website. Cancelled events remain hidden.
        </p>
        <button disabled={busy}>
          {busy ? "Saving…" : "Save website settings"}
        </button>
        <p role="status">{message}</p>
      </form>
    </div>
  );
}
