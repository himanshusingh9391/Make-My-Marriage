"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function Upload({
  token,
  events,
}: {
  token: string;
  events: { id: string; name: string }[] | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        setBusy(true);
        setMessage("");
        try {
          const response = await fetch("/api/v1/public/guest-photos/" + token, {
            method: "POST",
            body: data,
          });
          if (!response.ok) {
            const result = await response.json();
            throw Error(result.error?.message ?? "Upload failed.");
          }
          form.reset();
          setMessage("Photo added.");
          router.refresh();
        } catch (err) {
          setMessage(err instanceof Error ? err.message : "Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {events && (
        <label>
          Event
          <select name="eventId" disabled={busy}>
            <option value="">General wedding memories</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Choose a photo (JPEG, PNG or WebP, up to 10 MB)
        <input
          name="photo"
          type="file"
          required
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
        />
      </label>
      <button disabled={busy}>{busy ? "Uploading…" : "Upload photo"}</button>
      <p role="status">{message}</p>
    </form>
  );
}
