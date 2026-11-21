"use client";

import { useState, type FormEvent } from "react";
import styles from "../../[token]/invitation.module.css";

type Answer = {
  name: string;
  phone: string;
  status: "YES" | "NO";
  attendeeCount: number;
};

export default function HouseholdRsvp({
  initial,
  token,
}: {
  initial: Answer;
  token: string;
}) {
  const [answer, setAnswer] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"YES" | "NO">(initial.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/v1/guest/invitations/households/" + encodeURIComponent(token),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.get("name"),
            phone: form.get("phone"),
            status,
            attendeeCount: status === "YES" ? Number(form.get("count")) : 0,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.error?.message ?? "Please try again.");
      setAnswer(result.data);
      setStatus(result.data.status);
      setEditing(false);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className={styles.summary} aria-live="polite">
        <div>
          <p className={styles.eyebrow}>
            RSVP ·{" "}
            {answer.status === "YES" ? "Confirmed attending" : "Declined"}
          </p>
          <h2>
            {answer.status === "YES"
              ? "We look forward to celebrating with you!"
              : "Thank you for letting us know."}
          </h2>
          <p>
            {answer.name}
            {answer.status === "YES"
              ? " · " + answer.attendeeCount + " attending"
              : " · Declined"}
          </p>
          <small>
            This private link is for your household. You can return here to
            update your response.
          </small>
        </div>
        <button
          type="button"
          className={styles.primary}
          onClick={() => setEditing(true)}
        >
          Update response
        </button>
      </section>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {editing && (
        <section className={styles.formSection}>
          <form className={styles.form} onSubmit={submit}>
            <div className={styles.formHeading}>
              <div>
                <p className={styles.eyebrow}>Guest response portal</p>
                <h2>Update RSVP</h2>
              </div>
              <p>
                Private invitation for
                <br />
                <strong>{answer.name}</strong>
              </p>
            </div>
            <label className={styles.field}>
              Your name or family name
              <input
                name="name"
                defaultValue={answer.name}
                maxLength={120}
                required
              />
            </label>
            <label className={styles.field}>
              Mobile number <small>(optional)</small>
              <input
                name="phone"
                type="tel"
                defaultValue={answer.phone}
                inputMode="tel"
                maxLength={30}
              />
            </label>
            <fieldset className={styles.responseFields}>
              <legend>Will you be joining us?</legend>
              <div className={styles.choices}>
                {(["YES", "NO"] as const).map((value) => (
                  <label
                    key={value}
                    className={status === value ? styles.chosen : ""}
                  >
                    <input
                      type="radio"
                      checked={status === value}
                      onChange={() => setStatus(value)}
                    />
                    {value === "YES"
                      ? "Yes, joyfully accepting!"
                      : "Regretfully declining"}
                  </label>
                ))}
              </div>
            </fieldset>
            {status === "YES" && (
              <label className={styles.field}>
                Total number attending
                <input
                  name="count"
                  type="number"
                  min={1}
                  max={1000}
                  defaultValue={answer.attendeeCount || 1}
                  required
                />
                <small>Include yourself in the total.</small>
              </label>
            )}
            <div className={styles.formFooter}>
              <small>Shared privately with the wedding team</small>
              <div>
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
                <button className={styles.primary} disabled={busy}>
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
