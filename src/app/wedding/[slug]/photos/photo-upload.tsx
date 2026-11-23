"use client";

import { useState, type FormEvent } from "react";
import styles from "./photos.module.css";

type EventChoice = { eventKey: string; name: string };

export default function PhotoUpload({ slug, events }: { slug: string; events: EventChoice[] }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/v1/public/weddings/${encodeURIComponent(slug)}/photos`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message ?? "Photo upload failed.");
      setMessage("Your photo has been added. Thank you for sharing it!");
      event.currentTarget.reset();
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form className={styles.form} onSubmit={submit}>
    <label className={styles.fileLabel}>Choose a photo<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
    <p>JPEG, PNG, or WebP · up to 10 MB</p>
    {events.length > 0 && <label>Celebration (optional)<select name="eventKey" defaultValue=""><option value="">Wedding memories</option>{events.map((item) => <option key={item.eventKey} value={item.eventKey}>{item.name}</option>)}</select></label>}
    <button disabled={busy}>{busy ? "Uploading…" : "Share photo"}</button>
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}
