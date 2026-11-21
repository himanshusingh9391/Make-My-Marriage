"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Clock3 } from "lucide-react";
import type { EventView } from "@/features/events/schemas";
import styles from "./events.module.css";

export default function EventList({
  events,
  weddingId,
  readOnly,
}: {
  events: EventView[];
  weddingId: string;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const [confirmation, setConfirmation] = useState<{
    event: EventView;
    action: "delete" | "cancel";
  } | null>(null);
  const confirmationRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (confirmation) confirmationRef.current?.focus();
  }, [confirmation]);
  async function act() {
    if (!confirmation || busy) return;
    const { event, action } = confirmation;
    setBusy(event.id);
    setError("");
    try {
      const payload = {
        name: event.name,
        type: event.type,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        venue: event.venue,
        dressCode: event.dressCode,
        notes: event.notes,
        rsvpDeadline: event.rsvpDeadline,
        maxAttendees: event.maxAttendees,
        status: "CANCELLED",
        expectedUpdatedAt: event.updatedAt,
      };
      const response = await fetch(
        `/api/v1/weddings/${weddingId}/events/${event.id}`,
        {
          method: action === "delete" ? "DELETE" : "PATCH",
          headers: { "Content-Type": "application/json" },
          ...(action === "cancel" ? { body: JSON.stringify(payload) } : {}),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.error?.message ?? "Unable to update the event.");
      setConfirmation(null);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update the event. Please try again.",
      );
    } finally {
      setBusy("");
    }
  }
  const format = (iso: string, timezone: string) =>
    new Intl.DateTimeFormat("en-IN", {
      timeZone: timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  return (
    <>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {confirmation && (
        <section
          className={styles.confirmation}
          aria-label="Confirm event action"
          ref={confirmationRef}
          tabIndex={-1}
        >
          <h2>
            {confirmation.action === "delete" ? "Delete" : "Cancel"}{" "}
            {confirmation.event.name}?
          </h2>
          <p>
            {confirmation.action === "delete"
              ? "This removes the event from your itinerary. This action cannot be undone here."
              : "The event will stay in your itinerary marked Cancelled. You can change its status later."}
          </p>
          <div className={styles.actions}>
            <button
              className={styles.secondary}
              disabled={Boolean(busy)}
              onClick={() => setConfirmation(null)}
            >
              Keep event
            </button>
            <button
              className={styles.danger}
              disabled={Boolean(busy)}
              onClick={act}
            >
              {busy ? "Updating…" : `Confirm ${confirmation.action}`}
            </button>
          </div>
        </section>
      )}
      {!events.length ? (
        <div className={styles.empty}>
          <CalendarDays size={32} />
          <h2>Make room for your first celebration</h2>
          <p>
            Add your ceremonies, gatherings, and special moments to begin your
            itinerary.
          </p>
          {!readOnly && (
            <Link
              className={styles.primary}
              href={`/dashboard/events?workspace=${weddingId}&mode=new`}
            >
              Add an event
            </Link>
          )}
        </div>
      ) : (
        <div className={styles.list}>
          {events.map((event) => (
            <article className={styles.event} key={event.id}>
              <div className={styles.dateTile}>
                <span>
                  {new Intl.DateTimeFormat("en", {
                    timeZone: event.timezone,
                    month: "short",
                  }).format(new Date(event.startDate))}
                </span>
                <strong>
                  {new Intl.DateTimeFormat("en", {
                    timeZone: event.timezone,
                    day: "2-digit",
                  }).format(new Date(event.startDate))}
                </strong>
              </div>
              <div className={styles.eventBody}>
                <div className={styles.eventTitle}>
                  <h2>{event.name}</h2>
                  <span className={styles.badge}>
                    {event.status.toLowerCase()}
                  </span>
                </div>
                <p className={styles.eyebrow}>{event.type.toLowerCase()}</p>
                <p>
                  <Clock3 size={14} aria-hidden="true" />
                  {format(event.startDate, event.timezone)}
                  {event.endDate
                    ? ` – ${format(event.endDate, event.timezone)}`
                    : " · End time undecided"}
                </p>
                <p>
                  <MapPin size={14} aria-hidden="true" />
                  {[event.venue.name, event.venue.address]
                    .filter(Boolean)
                    .join(" · ") || "Venue to be decided"}
                </p>
                {event.description && (
                  <p className={styles.description}>{event.description}</p>
                )}
                {event.dressCode && <p>Dress code: {event.dressCode}</p>}
                <div className={styles.actions}>
                  <Link
                    className={styles.secondary}
                    href={`/dashboard/events?workspace=${weddingId}&event=${event.id}`}
                  >
                    {readOnly ? "View details" : "Edit event"}
                  </Link>
                  <Link
                    className={styles.secondary}
                    href={`/dashboard/tasks?workspace=${weddingId}&eventId=${event.id}`}
                  >
                    Tasks
                  </Link>
                  {!readOnly && (
                    <>
                      {event.status !== "CANCELLED" && (
                        <button
                          disabled={Boolean(busy)}
                          className={styles.secondary}
                          onClick={() =>
                            setConfirmation({ event, action: "cancel" })
                          }
                        >
                          Cancel event
                        </button>
                      )}
                      <button
                        className={styles.danger}
                        disabled={Boolean(busy)}
                        onClick={() =>
                          setConfirmation({ event, action: "delete" })
                        }
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
