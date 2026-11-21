"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { guestInputSchema } from "@/features/guests/schemas";
import layout from "./guests.module.css";
import { type GuestOptions, type GuestView } from "@/features/guests/schemas";
import { PlanningSection, PlanningField } from "../components/planning-form";
import styles from "../events/events.module.css";

export default function GuestForm({
  weddingId,
  options,
  guest,
  readOnly,
}: {
  weddingId: string;
  options: GuestOptions;
  guest?: GuestView;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const base = `/dashboard/guests?workspace=${weddingId}`;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const guard = (e: MouseEvent) => {
      if (
        e.target instanceof Element &&
        e.target.closest("a[href]") &&
        !window.confirm("Discard your unsaved guest changes?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guard, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guard, true);
    };
  }, [dirty]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || readOnly) return;
    setError("");
    try {
      const form = new FormData(e.currentTarget);
      const parsed = guestInputSchema.safeParse({
        fullName: form.get("fullName"),
        email: form.get("email"),
        phone: form.get("phone"),
        groupName: form.get("groupName"),
        notes: form.get("notes"),
        maxPartySize: Number(form.get("maxPartySize")),
        eventIds: form.getAll("eventIds"),
      });
      if (!parsed.success)
        throw new Error(
          parsed.error.issues[0]?.message ?? "Please review the guest details.",
        );
      const input = parsed.data;
      setBusy(true);
      const response = await fetch(
        `/api/v1/weddings/${weddingId}/guests${guest ? `/${guest.id}` : ""}`,
        {
          method: guest ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...input,
            ...(guest ? { expectedUpdatedAt: guest.updatedAt } : {}),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(
          result.error?.message ??
            "Could not save the guest. Please try again.",
        );
      setDirty(false);
      router.push(`${base}&saved=1`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save the guest. Please try again.",
      );
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      onChange={() => setDirty(true)}
      className={styles.form}
    >
      {error && (
        <p role="alert" tabIndex={-1} ref={errorRef} className={styles.error}>
          {error}
        </p>
      )}
      <div className={layout.editor}>
        <div className={styles.form}>
          <PlanningSection
            title="1. Guest details"
            description="One guest record represents one person or family group. Adding a guest does not send an invitation."
            disabled={busy || readOnly}
          >
            <PlanningField label="Guest name *">
              <input
                name="fullName"
                required
                maxLength={120}
                defaultValue={guest?.fullName}
                placeholder="e.g. Akshay Saini"
                autoComplete="name"
              />
            </PlanningField>
            <div className={styles.grid}>
              <PlanningField label="Email (optional)">
                <input
                  type="email"
                  name="email"
                  maxLength={254}
                  defaultValue={guest?.email}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </PlanningField>
              <PlanningField label="Phone (optional)">
                <input
                  type="tel"
                  name="phone"
                  maxLength={30}
                  defaultValue={guest?.phone}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                />
              </PlanningField>
            </div>
            {guest?.email && (
              <p className={styles.help}>
                Changing the email invalidates the previous invitation link.
                Send a new invitation from Members when needed.
              </p>
            )}
          </PlanningSection>
          <PlanningSection
            title="2. Invitation planning"
            description="Make room for everyone in the group."
            disabled={busy || readOnly}
          >
            <PlanningField label="Maximum party size *">
              <input
                type="number"
                name="maxPartySize"
                required
                min={1}
                max={1000}
                step={1}
                defaultValue={guest?.maxPartySize ?? 1}
              />
            </PlanningField>
            <p className={styles.notice}>
              Includes the named guest. For example, enter 4 for a family of
              four. This limit applies to each selected event.
            </p>
            <h3 className={layout.label}>Invited events (optional)</h3>
            <p className={styles.help}>
              Choose the celebrations this guest is invited to.
            </p>
            <div className={layout.eventChoices}>
              {options.events.map((event) => (
                <label className={layout.check} key={event.id}>
                  <input
                    type="checkbox"
                    name="eventIds"
                    value={event.id}
                    defaultChecked={guest?.eventIds.includes(event.id)}
                  />
                  <span>
                    {event.name}
                    <small>
                      {new Intl.DateTimeFormat("en-IN", {
                        dateStyle: "long",
                        timeZone: options.timezone,
                      }).format(new Date(event.date))}
                    </small>
                  </span>
                </label>
              ))}
              {guest?.events
                .filter((e) => !options.events.some((o) => o.id === e.id))
                .map((e) => (
                  <label className={layout.check} key={e.id}>
                    <input
                      type="checkbox"
                      name="eventIds"
                      value={e.id}
                      defaultChecked
                    />
                    <span>{e.name}</span>
                  </label>
                ))}
              {!options.events.length && !guest?.events.length && (
                <p className={styles.notice}>
                  No active events yet. You can add this guest now and choose
                  events later.
                </p>
              )}
            </div>
          </PlanningSection>
          <PlanningSection
            title="3. Additional details"
            description="Helpful details for your wedding team."
            disabled={busy || readOnly}
          >
            <PlanningField label="Group or family name (optional)">
              <input
                name="groupName"
                maxLength={120}
                defaultValue={guest?.groupName}
                placeholder="e.g. Saini family"
              />
            </PlanningField>
            <PlanningField label="Notes (optional)">
              <textarea
                name="notes"
                rows={4}
                maxLength={2000}
                defaultValue={guest?.notes}
                placeholder="Anything helpful for your wedding team?"
              />
            </PlanningField>
            <p className={styles.help}>
              Notes are private to your wedding team.
            </p>
          </PlanningSection>
        </div>
        <aside className={layout.aside}>
          <p className={styles.eyebrow}>PLANNING TOGETHER</p>
          <h2>Every guest has a place.</h2>
          <p>
            Keep families together in your guest list and choose the
            celebrations they will share with you.
          </p>
          <dl>
            <dt>RSVP status</dt>
            <dd>
              {guest?.rsvpStatus === "YES"
                ? "Attending"
                : guest?.rsvpStatus === "NO"
                  ? "Declined"
                  : guest?.rsvpStatus === "MIXED"
                    ? "Mixed responses"
                    : "Pending"}
            </dd>
            <dt>Attendance</dt>
            <dd>
              {guest?.events.some((e) => e.status !== "PENDING")
                ? "See event responses below"
                : "Awaiting response"}
            </dd>
          </dl>
          {guest?.events.map((e) => (
            <p key={e.id}>
              <strong>{e.name}</strong>
              <br />
              {e.status === "YES"
                ? e.attendeeCount + " attending"
                : e.status === "NO"
                  ? "Declined"
                  : "Awaiting response"}
              {e.guestMessage && (
                <>
                  <br />
                  <small>Guest message: {e.guestMessage}</small>
                </>
              )}
            </p>
          ))}
          <hr />
          <p>
            A family of four needs one guest record with a maximum party size of
            four, including the named guest.
          </p>
          <p>
            Invitation acceptance and event RSVPs are separate. No email is sent
            when you save this form.
          </p>
        </aside>
      </div>
      <div className={styles.footer}>
        <span aria-live="polite">
          {dirty ? "Unsaved changes" : "Every guest has a place"}
        </span>
        <div className={styles.actions}>
          <button
            type="button"
            disabled={busy}
            className={styles.secondary}
            onClick={() => {
              if (
                !dirty ||
                window.confirm("Discard your unsaved guest changes?")
              )
                router.push(base);
            }}
          >
            Cancel
          </button>
          {!readOnly && (
            <button className={styles.primary} disabled={busy}>
              {busy ? "Saving…" : guest ? "Save changes" : "Create guest"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
