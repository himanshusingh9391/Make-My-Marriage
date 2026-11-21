"use client";
import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import styles from "../../[token]/invitation.module.css";
type Answer = {
  name: string;
  phone: string;
  status: "YES" | "NO";
  attendeeCount: number;
};
export default function Join({
  token,
  children,
}: {
  token: string;
  children: ReactNode;
}) {
  const [answer, setAnswer] = useState<Answer | null>(null),
    [editing, setEditing] = useState(true),
    [status, setStatus] = useState(""),
    [key, setKey] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const endpoint = "/api/v1/guest/invitations/open/" + token;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const storage = "wedding-rsvp:" + token;
        let visitorKey = localStorage.getItem(storage);
        if (!visitorKey) {
          visitorKey = crypto.randomUUID();
          localStorage.setItem(storage, visitorKey);
          setKey(visitorKey);
          return;
        }
        const response = await fetch(endpoint, {
          headers: { "x-household-key": visitorKey },
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!result.success) throw Error(result.error.message);
        if (result.data) {
          localStorage.removeItem(storage);
          const freshKey = crypto.randomUUID();
          localStorage.setItem(storage, freshKey);
          setKey(freshKey);
          return;
        }
        setKey(visitorKey);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Please reload the invitation.",
          );
      }
    }
    void load();
    return () => controller.abort();
  }, [token, endpoint]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          phone: form.get("phone"),
          status,
          attendeeCount: status === "YES" ? Number(form.get("count")) : 0,
          visitorKey: key,
        }),
      });
      const result = await response.json();
      if (!result.success) throw Error(result.error.message);
      if (typeof result.data?.path !== "string")
        throw Error(
          "Your private RSVP link could not be created. Please try again.",
        );
      setAnswer(result.data);
      localStorage.removeItem("wedding-rsvp:" + token);
      window.location.assign(result.data.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section id="attendance" className={styles.summary} aria-live="polite">
        <div>
          <p className={styles.eyebrow}>
            RSVP ·{" "}
            {answer
              ? answer.status === "YES"
                ? "Confirmed attending"
                : "Declined"
              : "Pending"}
          </p>
          <h2>
            {answer
              ? answer.status === "YES"
                ? "We look forward to celebrating with you!"
                : "Thank you for letting us know."
              : "Will you be joining us?"}
          </h2>
          <p>
            {answer
              ? answer.name +
                (answer.status === "YES"
                  ? " · " + answer.attendeeCount + " attending"
                  : " · Declined")
              : "Please let us know your plans for you and your family."}
          </p>
        </div>
        <a
          href="#formal-rsvp"
          className={styles.primary}
          onClick={() => {
            setStatus(answer?.status ?? "");
            setEditing(true);
            requestAnimationFrame(() =>
              document.getElementById("formal-rsvp")?.scrollIntoView(),
            );
          }}
        >
          {answer ? "Update response" : "Respond to invitation"}
        </a>
      </section>
      {children}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {editing && (
        <section id="formal-rsvp" className={styles.formSection}>
          <form onSubmit={submit} className={styles.form}>
            <div className={styles.formHeading}>
              <p className={styles.eyebrow}>Guest response portal</p>
              <h2>Formal RSVP</h2>
            </div>
            <label className={styles.field}>
              Your name or family name
              <input
                name="name"
                defaultValue={answer?.name}
                autoComplete="name"
                maxLength={120}
                required
              />
            </label>
            <label className={styles.field}>
              Mobile number <small>(optional)</small>
              <input
                name="phone"
                type="tel"
                defaultValue={answer?.phone}
                autoComplete="tel"
                inputMode="tel"
                maxLength={30}
                placeholder="e.g. +91 98765 43210"
              />
            </label>
            <fieldset className={styles.responseFields}>
              <legend>Will you be joining us?</legend>
              <div className={styles.choices}>
                {(["YES", "NO"] as const).map((v) => (
                  <label key={v} className={status === v ? styles.chosen : ""}>
                    <input
                      type="radio"
                      name="status"
                      required
                      checked={status === v}
                      onChange={() => setStatus(v)}
                    />
                    {v === "YES"
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
                  defaultValue={answer?.attendeeCount || 1}
                  required
                />
                <small>Include yourself in the total.</small>
              </label>
            )}
            <div className={styles.formFooter}>
              <small>You can update your response in this browser.</small>
              <div>
                {answer && (
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                )}
                <button disabled={!key || busy} className={styles.primary}>
                  {busy ? "Saving…" : answer ? "Save changes" : "Send RSVP"}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
