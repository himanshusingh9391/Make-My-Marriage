"use client";
import { useEffect, useRef, useState } from "react";
import {
  Heart,
  CalendarDays,
  MapPin,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import type { PersonalInvitation } from "@/features/rsvp/schemas";
import InvitationHero from "../invitation-hero";
import RsvpForm from "./rsvp-form";
import styles from "./invitation.module.css";
export default function Invitation({
  initial,
  token,
}: {
  initial: PersonalInvitation;
  token: string;
}) {
  const [data, setData] = useState(initial),
    [editing, setEditing] = useState(
      initial.events.some((e) => e.status === "PENDING"),
    ),
    [saved, setSaved] = useState(false);
  const form = useRef<HTMLElement>(null);
  const summary = useRef<HTMLElement>(null);
  const [syncError, setSyncError] = useState("");
  useEffect(() => {
    if (editing) return;
    let disposed = false;
    let running = false;
    const controller = new AbortController();
    const sync = async () => {
      if (running || document.visibilityState !== "visible") return;
      running = true;
      try {
        const response = await fetch(
          `/api/v1/guest/invitations/${encodeURIComponent(token)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = await response.json();
        if (!disposed) {
          if (response.ok && result.success) {
            setData(result.data);
            setSyncError("");
          } else
            setSyncError(
              result.error?.message ?? "Could not refresh your invitation.",
            );
        }
      } catch {
        if (!disposed)
          setSyncError(
            "Connection interrupted. Your saved response is safe; reconnect to see updates.",
          );
      } finally {
        running = false;
      }
    };
    const timer = window.setInterval(sync, 15000);
    window.addEventListener("focus", sync);
    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", sync);
    };
  }, [editing, token]);
  const allYes =
    data.events.length > 0 && data.events.every((e) => e.status === "YES");
  const allNo =
    data.events.length > 0 && data.events.every((e) => e.status === "NO");
  const pending = data.events.every((e) => e.status === "PENDING");
  const sameCount = new Set(data.events.map((e) => e.attendeeCount)).size === 1;
  const max = data.events.length
    ? Math.min(...data.events.map((e) => e.maxAttendees))
    : 0;
  const editable = data.events.some((e) => !e.closed);
  const date = (value: string) =>
    new Intl.DateTimeFormat("en-IN", {
      dateStyle: "long",
      timeZone: data.timezone,
    }).format(new Date(value));
  const time = (value: string) =>
    new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: data.timezone,
    }).format(new Date(value));
  function respond() {
    setEditing(true);
    setTimeout(() => {
      form.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
      form.current?.focus({ preventScroll: true });
    }, 0);
  }
  return (
    <main className={styles.content}>
      {syncError && (
        <p role="status" className={styles.error}>
          {syncError}
        </p>
      )}
      <InvitationHero data={data} />
      <section
        className={styles.summary}
        ref={summary}
        tabIndex={-1}
        aria-label="Your RSVP status"
      >
        <div>
          <p className={styles.eyebrow}>
            {allYes ? <CheckCircle2 size={15} /> : <Heart size={15} />} RSVP
            STATUS:{" "}
            {allYes
              ? "CONFIRMED ATTENDING"
              : allNo
                ? "DECLINED"
                : pending
                  ? "PENDING"
                  : "PARTIALLY RESPONDED"}
          </p>
          <h2>
            {allYes
              ? "We look forward to celebrating with you!"
              : allNo
                ? "Thank you for letting us know."
                : "Will you be joining us?"}
          </h2>
          <p>
            {allYes && sameCount
              ? `${data.guestName} · Attending ${data.events[0].attendeeCount} ${data.events[0].attendeeCount === 1 ? "person" : "people"}.`
              : allNo
                ? "We’ll celebrate with you in spirit."
                : "Please let us know your attendance plans for you and your family."}
          </p>
          <small>
            You can update your response using this same link before the event’s
            RSVP deadline.
          </small>
          {saved && (
            <p role="status" className={styles.success}>
              Your RSVP has been saved.
            </p>
          )}
        </div>
        <div className={styles.summaryAction}>
          {editable && (
            <button className={styles.primary} onClick={respond}>
              {pending ? "Respond to invitation" : "Update response"}
              <ArrowRight size={16} />
            </button>
          )}
          {max > 0 && (
            <small>
              Reserved for up to {max} people
              {new Set(data.events.map((e) => e.maxAttendees)).size > 1
                ? " (limits vary by event)"
                : ""}
            </small>
          )}
          {!editable && data.events.length > 0 && (
            <small>
              RSVP deadlines have passed. Please contact the wedding team.
            </small>
          )}
        </div>
      </section>
      <section className={styles.itinerary}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>YOUR PERSONAL SCHEDULE</p>
          <h2>Celebration Itinerary</h2>
          <span />
          <p>
            All ceremony schedules are displayed in{" "}
            <strong>{data.timezone}</strong>.
          </p>
          <small>
            Only ceremonies designated for {data.guestName} are displayed below.
          </small>
        </div>
        {!data.events.length && (
          <p className={styles.notice}>
            Your celebrations are being arranged. The wedding team will add your
            events here soon.
          </p>
        )}
        {data.events.map((e, index) => (
          <article className={styles.event} key={e.id}>
            <div className={styles.dateTile}>
              <small>CELEBRATION {String(index + 1).padStart(2, "0")}</small>
              <strong>
                {new Intl.DateTimeFormat("en-IN", {
                  day: "2-digit",
                  timeZone: data.timezone,
                }).format(new Date(e.startDate))}
              </strong>
              <span>
                {new Intl.DateTimeFormat("en-IN", {
                  month: "short",
                  year: "numeric",
                  timeZone: data.timezone,
                }).format(new Date(e.startDate))}
              </span>
            </div>
            <div className={styles.eventBody}>
              <p className={styles.eyebrow}>YOU’RE INVITED</p>
              <h3>{e.name}</h3>
              <p>
                <CalendarDays size={16} />
                <span>
                  {date(e.startDate)}, {time(e.startDate)}
                  {e.endDate ? ` – ${date(e.endDate)}, ${time(e.endDate)}` : ""}
                </span>
              </p>
              {e.venueName && (
                <p>
                  <MapPin size={16} />
                  {e.venueName}
                </p>
              )}
              {e.address && <p>{e.address}</p>}
              {e.description && (
                <p className={styles.description}>{e.description}</p>
              )}
              {e.dressCode && (
                <p>
                  <Sparkles size={16} />
                  <span>
                    <small>DRESS CODE</small>
                    <br />
                    {e.dressCode}
                  </span>
                </p>
              )}
              <p className={styles.eventStatus}>
                {e.status === "YES"
                  ? `${e.attendeeCount} attending`
                  : e.status === "NO"
                    ? "Regretfully declining"
                    : "Awaiting your response"}
              </p>
              {e.deadline && (
                <small>
                  {e.closed ? "RSVP closed" : "Please respond by"} ·{" "}
                  {date(e.deadline)}, {time(e.deadline)}
                </small>
              )}
            </div>
          </article>
        ))}
      </section>
      {editing && editable && (
        <section className={styles.formSection} ref={form} tabIndex={-1}>
          <RsvpForm
            key={JSON.stringify(data.events)}
            data={data}
            token={token}
            onSaved={(updated) => {
              setData(updated);
              setSaved(true);
              if (typeof BroadcastChannel !== "undefined") {
                const channel = new BroadcastChannel("wedding-rsvp-updates");
                channel.postMessage("updated");
                channel.close();
              }
              setEditing(false);
              summary.current?.scrollIntoView({ block: "center" });
              summary.current?.focus({ preventScroll: true });
            }}
            onCancel={() => {
              setEditing(false);
              summary.current?.focus();
            }}
          />
        </section>
      )}
    </main>
  );
}
