"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { eventTypes, type EventView } from "@/features/events/schemas";
import { localDateTime } from "@/features/events/dates";
import { readEventForm } from "@/features/events/form";
import styles from "./events.module.css";

export default function EventForm({
  weddingId,
  timezone,
  event,
  readOnly,
}: {
  weddingId: string;
  timezone: string;
  event?: EventView;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const base = `/dashboard/events?workspace=${weddingId}`;
  const start = event
    ? localDateTime(event.startDate, timezone).split("T")
    : ["", ""];
  const end = event?.endDate
    ? localDateTime(event.endDate, timezone).split("T")
    : ["", ""];
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const guardLink = (e: MouseEvent) => {
      if (
        e.target instanceof Element &&
        e.target.closest("a[href]") &&
        !window.confirm("Discard your unsaved event changes?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLink, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guardLink, true);
    };
  }, [dirty]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || readOnly) return;
    setError("");
    setBusy(true);
    try {
      const input = {
        ...readEventForm(new FormData(e.currentTarget), timezone),
        ...(event ? { expectedUpdatedAt: event.updatedAt } : {}),
      };
      const response = await fetch(
        `/api/v1/weddings/${weddingId}/events${event ? `/${event.id}` : ""}`,
        {
          method: event ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(
          result.error?.message ??
            "Unable to save this event. Please try again.",
        );
      setDirty(false);
      router.push(base);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save this event. Please try again.",
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
        <p className={styles.error} role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </p>
      )}
      <fieldset disabled={busy || readOnly} className={styles.card}>
        <legend className={styles.srOnly}>Event details</legend>
        <h2>1. Event details</h2>
        <p>Basic information and nature of this celebration.</p>
        <label>
          Event name *
          <input
            name="name"
            required
            maxLength={150}
            defaultValue={event?.name}
            placeholder="e.g. Engagement Ceremony"
          />
        </label>
        <label>
          Event type *
          <select name="type" required defaultValue={event?.type ?? "CUSTOM"}>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type[0] + type.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label>
          Description (optional)
          <textarea
            name="description"
            rows={3}
            maxLength={2000}
            defaultValue={event?.description}
            placeholder="Add schedule notes, themes, or special details for this event…"
          />
        </label>
      </fieldset>
      <fieldset disabled={busy || readOnly} className={styles.card}>
        <legend className={styles.srOnly}>Date and time</legend>
        <h2>2. Date &amp; time</h2>
        <p>Specify the planned schedule of your celebration.</p>
        <div className={styles.notice}>
          All times in {timezone}. All events follow the wedding time zone.
        </div>
        <div className={styles.grid}>
          <label>
            Start date *
            <input
              type="date"
              name="startDay"
              required
              defaultValue={start[0]}
            />
          </label>
          <label>
            Start time *
            <input
              type="time"
              name="startTime"
              required
              defaultValue={start[1]}
            />
          </label>
          <label>
            End date (optional)
            <input
              type="date"
              name="endDay"
              defaultValue={end[0]}
              aria-describedby="end-help"
            />
          </label>
          <label>
            End time (optional)
            <input
              type="time"
              name="endTime"
              defaultValue={end[1]}
              aria-describedby="end-help"
            />
          </label>
        </div>
        <p id="end-help" className={styles.help}>
          For an overnight event, choose the following day as its end date.
          Leave both end fields empty if the end time is undecided.
        </p>
      </fieldset>
      <fieldset disabled={busy || readOnly} className={styles.card}>
        <legend className={styles.srOnly}>Venue and additional details</legend>
        <h2>3. Venue &amp; additional details</h2>
        <p>
          Help everyone arrive in the right place, dressed for the occasion.
        </p>
        <label>
          Venue name (optional)
          <input
            name="venueName"
            maxLength={150}
            defaultValue={event?.venue.name}
            placeholder="e.g. Grand ballroom"
          />
        </label>
        <label>
          Address (optional)
          <input
            name="address"
            maxLength={500}
            defaultValue={event?.venue.address}
            placeholder="Venue address"
          />
        </label>
        <label>
          Dress code (optional)
          <input
            name="dressCode"
            maxLength={200}
            defaultValue={event?.dressCode}
            placeholder="e.g. Traditional pastels"
          />
        </label>
        <details className={styles.additional}>
          <summary>Planning settings (optional)</summary>
          <div className={styles.grid}>
            <label>
              Event status
              <select name="status" defaultValue={event?.status ?? "DRAFT"}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>
            <label>
              Maximum attendees
              <input
                type="number"
                min={1}
                max={1000000}
                step={1}
                name="maxAttendees"
                defaultValue={event?.maxAttendees ?? ""}
              />
            </label>
            <label>
              RSVP deadline
              <input
                type="datetime-local"
                name="rsvpDeadline"
                defaultValue={
                  event?.rsvpDeadline
                    ? localDateTime(event.rsvpDeadline, timezone)
                    : ""
                }
              />
            </label>
          </div>
          <label>
            Private planning notes
            <textarea
              name="notes"
              rows={3}
              maxLength={2000}
              defaultValue={event?.notes}
            />
          </label>
          <p className={styles.help}>
            Publishing sets the event status; it does not publish your wedding
            website or send invitations. Event-specific RSVP collection will be
            added separately.
          </p>
        </details>
      </fieldset>
      <div className={styles.footer}>
        <span aria-live="polite">
          {dirty
            ? "Unsaved changes"
            : "Your celebration, beautifully organised"}
        </span>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            disabled={busy}
            onClick={() => {
              if (
                !dirty ||
                window.confirm("Discard your unsaved event changes?")
              )
                router.push(base);
            }}
          >
            Cancel
          </button>
          {!readOnly && (
            <button type="submit" className={styles.primary} disabled={busy}>
              {busy ? "Saving…" : event ? "Save changes" : "Create event"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
