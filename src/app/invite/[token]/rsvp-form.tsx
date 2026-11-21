"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import type { PersonalInvitation } from "@/features/rsvp/schemas";
import styles from "./invitation.module.css";
type Choice = {
  status: "PENDING" | "YES" | "NO";
  attendeeCount: number;
  guestMessage: string;
};
function ResponseFields({
  id,
  label,
  max,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  max: number;
  value: Choice;
  onChange: (v: Choice) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className={styles.responseFields} disabled={disabled}>
      <legend>{label}</legend>
      <div className={styles.choices}>
        {(["YES", "NO"] as const).map((status) => (
          <label
            key={status}
            className={value.status === status ? styles.chosen : ""}
          >
            <input
              type="radio"
              name={id}
              checked={value.status === status}
              onChange={() =>
                onChange({
                  ...value,
                  status,
                  attendeeCount:
                    status === "YES"
                      ? Math.max(1, Math.min(value.attendeeCount || 1, max))
                      : 0,
                })
              }
            />
            <span>
              {status === "YES"
                ? "Yes, joyfully accepting!"
                : "Regretfully declining"}
              <small>
                {status === "YES"
                  ? "We’re excited to celebrate with you."
                  : "We will celebrate with you in spirit."}
              </small>
            </span>
          </label>
        ))}
      </div>
      {value.status === "YES" && (
        <label className={styles.field}>
          Total number attending
          <select
            value={value.attendeeCount || 1}
            onChange={(e) =>
              onChange({ ...value, attendeeCount: Number(e.target.value) })
            }
          >
            {Array.from({ length: max }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} {i === 0 ? "person" : "people"}
              </option>
            ))}
          </select>
          <small>
            Includes the named guest. Your invitation allows up to {max} people.
          </small>
        </label>
      )}
      <label className={styles.field}>
        A message for the wedding team (optional)
        <textarea
          rows={3}
          maxLength={1000}
          value={value.guestMessage}
          onChange={(e) => onChange({ ...value, guestMessage: e.target.value })}
        />
      </label>
    </fieldset>
  );
}
export default function RsvpForm({
  data,
  token,
  onSaved,
  onCancel,
}: {
  data: PersonalInvitation;
  token: string;
  onSaved: (value: PersonalInvitation) => void;
  onCancel: () => void;
}) {
  const eligible = data.events.filter((e) => !e.closed);
  const max = Math.min(...eligible.map((e) => e.maxAttendees));
  const first = eligible[0];
  const [same, setSame] = useState(
    eligible.length === data.events.length &&
      new Set(eligible.map((e) => `${e.status}:${e.attendeeCount}`)).size <= 1,
  );
  const [choice, setChoice] = useState<Choice>({
    status: first.status,
    attendeeCount: first.attendeeCount || 1,
    guestMessage: first.guestMessage,
  });
  const [choices, setChoices] = useState<Record<string, Choice>>(
    Object.fromEntries(
      eligible.map((e) => [
        e.id,
        {
          status: e.status,
          attendeeCount: e.attendeeCount || 1,
          guestMessage: e.guestMessage,
        },
      ]),
    ),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const responses = eligible
      .map((event) => ({
        eventId: event.id,
        response: same ? choice : choices[event.id],
      }))
      .filter((r) => r.response.status !== "PENDING")
      .map((r) => ({
        ...r,
        response: {
          ...r.response,
          attendeeCount:
            r.response.status === "NO" ? 0 : r.response.attendeeCount,
        },
      }));
    if (!responses.length) {
      setError("Please choose whether you will be joining us.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(
        `/api/v1/guest/invitations/${encodeURIComponent(token)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ responses }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(
          result.error?.message ??
            "Your response could not be saved. Please try again.",
        );
      setDirty(false);
      onSaved(result.data);
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : "Your response could not be saved. Please try again.",
      );
      setBusy(false);
    }
  }
  return (
    <form
      className={styles.form}
      onSubmit={submit}
      onChange={() => setDirty(true)}
    >
      <div className={styles.formHeading}>
        <div>
          <p className={styles.eyebrow}>GUEST RESPONSE PORTAL</p>
          <h2>Formal RSVP</h2>
        </div>
        <p>
          Private invitation for
          <br />
          <strong>{data.guestName}</strong>
        </p>
      </div>
      {error && (
        <p role="alert" tabIndex={-1} ref={errorRef} className={styles.error}>
          {error}
        </p>
      )}
      {eligible.length > 1 && (
        <label className={styles.same}>
          <input
            type="checkbox"
            checked={same}
            disabled={busy}
            onChange={(e) => {
              setSame(e.target.checked);
              if (e.target.checked)
                setChoice((previous) => ({
                  ...previous,
                  attendeeCount: Math.min(previous.attendeeCount || 1, max),
                }));
            }}
          />
          Use the same response for every open event
        </label>
      )}
      {eligible.length < data.events.length && (
        <p className={styles.notice}>
          Some RSVP deadlines have passed. You can still respond to the open
          events below.
        </p>
      )}
      {same ? (
        <ResponseFields
          id="all-events"
          label={`Will ${data.guestName} be joining us?`}
          max={max}
          value={choice}
          onChange={setChoice}
          disabled={busy}
        />
      ) : (
        eligible.map((e) => (
          <ResponseFields
            key={e.id}
            id={e.id}
            label={e.name}
            max={e.maxAttendees}
            value={choices[e.id]}
            onChange={(value) =>
              setChoices((previous) => ({ ...previous, [e.id]: value }))
            }
            disabled={busy}
          />
        ))
      )}
      <p className={styles.notice}>
        {same
          ? "Your response applies to all open events on this invitation."
          : "Your responses apply to the selected events."}{" "}
        You can update them using this same link before each RSVP deadline.
      </p>
      <div className={styles.formFooter}>
        <small>Shared privately with the wedding team</small>
        <div>
          <button
            type="button"
            className={styles.secondary}
            disabled={busy}
            onClick={() => {
              if (
                !dirty ||
                window.confirm("Discard your unsaved RSVP changes?")
              )
                onCancel();
            }}
          >
            Cancel
          </button>
          <button className={styles.primary} disabled={busy}>
            {busy
              ? "Saving…"
              : data.events.some((e) => e.status !== "PENDING")
                ? "Save changes"
                : "Send RSVP"}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </form>
  );
}
