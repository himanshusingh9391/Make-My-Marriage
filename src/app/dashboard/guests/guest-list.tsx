"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UsersRound } from "lucide-react";
import type {
  GuestListData,
  GuestOptions,
  GuestQuery,
  GuestView,
} from "@/features/guests/schemas";
import styles from "./guests.module.css";
import common from "../events/events.module.css";
const labels: Record<string, string> = {
  PENDING: "Pending",
  YES: "Attending",
  NO: "Declined",
  MIXED: "Mixed responses",
};
export default function GuestList({
  data,
  options,
  query,
  weddingId,
  readOnly,
  saved,
  listPath = "/dashboard/guests",
}: {
  data: GuestListData;
  options: GuestOptions;
  query: GuestQuery;
  weddingId: string;
  readOnly: boolean;
  saved: boolean;
  listPath?: "/dashboard/guests" | "/dashboard/rsvp";
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<GuestView | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const base = `${listPath}?workspace=${weddingId}`;
  const filtered = Boolean(query.q || query.eventId || query.rsvpStatus);
  function pageLink(page: number) {
    const params = new URLSearchParams({
      workspace: weddingId,
      page: String(page),
    });
    if (query.q) params.set("q", query.q);
    if (query.eventId) params.set("eventId", query.eventId);
    if (query.rsvpStatus) params.set("rsvpStatus", query.rsvpStatus);
    return `${listPath}?${params}`;
  }
  async function remove() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/weddings/${weddingId}/guests/${selected.id}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(
          result.error?.message ?? "Could not remove this guest.",
        );
      dialog.current?.close();
      setSelected(null);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not remove this guest. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {saved && (
        <p className={common.notice} role="status">
          Guest saved. No invitation email was sent.
        </p>
      )}
      <form action={listPath} className={styles.filters}>
        <input type="hidden" name="workspace" value={weddingId} />
        <div className={styles.filterGrid}>
          <label>
            Search guests
            <input
              name="q"
              defaultValue={query.q}
              maxLength={120}
              placeholder="Search by name, email, or phone"
              type="search"
            />
          </label>
          <label>
            Event
            <select name="eventId" defaultValue={query.eventId ?? ""}>
              <option value="">All events</option>
              {query.eventId &&
                !options.events.some((e) => e.id === query.eventId) && (
                  <option value={query.eventId}>Unavailable event</option>
                )}
              {options.events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            RSVP status
            <select name="rsvpStatus" defaultValue={query.rsvpStatus ?? ""}>
              <option value="">All RSVP statuses</option>
              {Object.entries(labels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.filterFooter}>
          <span>
            {data.total} guest {data.total === 1 ? "group" : "groups"}{" "}
            {filtered ? "match your filters" : "in your guest list"}
          </span>
          <div className={common.actions}>
            {filtered && (
              <Link href={base} className={common.secondary}>
                Clear filters
              </Link>
            )}
            <button className={common.secondary}>Apply filters</button>
          </div>
        </div>
      </form>
      {!data.guests.length ? (
        <section className={common.empty}>
          <UsersRound size={34} strokeWidth={1.3} />
          <h2>
            {filtered || query.page > 1
              ? "No guests found."
              : "Your celebration starts with your people."}
          </h2>
          <p>
            {filtered || query.page > 1
              ? "Try different filters or return to your guest list."
              : "Add your first guest or family group to begin organising your guest list."}
          </p>
          {filtered || query.page > 1 ? (
            <Link className={common.secondary} href={base}>
              View all guests
            </Link>
          ) : (
            !readOnly && (
              <Link
                className={common.primary}
                href={`/dashboard/guests/new?workspace=${weddingId}`}
              >
                + Add your first guest
              </Link>
            )
          )}
        </section>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={common.srOnly}>
              Wedding guests and event responses
            </caption>
            <thead>
              <tr>
                {[
                  "Guest name / group",
                  "Contact details",
                  "Invited events",
                  "Max party",
                  "RSVP status",
                  "Attendance",
                  "Actions",
                ].map((h) => (
                  <th scope="col" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.guests.map((g) => (
                <tr key={g.id}>
                  <td data-label="Guest name / group">
                    <strong className={styles.name}>{g.fullName}</strong>
                    {g.groupName && <small>{g.groupName}</small>}
                  </td>
                  <td data-label="Contact details">
                    {g.email && <span>{g.email}</span>}
                    {g.phone && <span>{g.phone}</span>}
                    {!g.email && !g.phone && <span>Not provided</span>}
                  </td>
                  <td data-label="Invited events">
                    {g.events.length
                      ? g.events.map((e) => <span key={e.id}>{e.name}</span>)
                      : "No events selected"}
                  </td>
                  <td data-label="Max party">
                    <strong>{g.maxPartySize}</strong>
                    <small>Including named guest</small>
                  </td>
                  <td data-label="RSVP status">
                    <span className={common.badge}>
                      {labels[g.rsvpStatus] ?? "Pending"}
                    </span>
                  </td>
                  <td data-label="Attendance">
                    {g.householdCount !== undefined
                      ? g.householdCount + " attending"
                      : g.rsvpStatus === "PENDING"
                        ? "Awaiting response"
                        : g.events.map((e) => (
                            <small key={e.id}>
                              {e.name}:{" "}
                              {e.status === "YES"
                                ? `${e.attendeeCount} attending`
                                : e.status === "NO"
                                  ? "Declined"
                                  : "Awaiting response"}
                            </small>
                          ))}
                  </td>
                  <td data-label="Actions">
                    <div className={styles.rowActions}>
                      <Link
                        href={`/dashboard/guests/${g.id}?workspace=${weddingId}`}
                      >
                        Details
                      </Link>
                      {!readOnly && (
                        <>
                          <Link
                            href={`/dashboard/guests/${g.id}?workspace=${weddingId}&edit=1`}
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            disabled={busy || refreshing}
                            onClick={() => {
                              setSelected(g);
                              setError("");
                              dialog.current?.showModal();
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav aria-label="Guest list pages" className={common.pagination}>
        <span>
          Page {data.page}
          {data.total > 0 ? ` · ${data.total} guest groups` : ""}
        </span>
        {data.page > 1 && <Link href={pageLink(data.page - 1)}>Previous</Link>}
        {data.hasMore && <Link href={pageLink(data.page + 1)}>Next</Link>}
      </nav>
      <dialog
        className={styles.dialog}
        ref={dialog}
        aria-labelledby="remove-guest-title"
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <h2 id="remove-guest-title">Remove this guest?</h2>
        <p>
          {selected?.fullName} will be removed from your guest list and their
          invitation link will stop working. Their existing RSVP history is
          retained.
        </p>
        {error && (
          <p className={common.error} role="alert">
            {error}
          </p>
        )}
        <div className={common.actions}>
          <button
            type="button"
            className={common.secondary}
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            Keep guest
          </button>
          <button
            type="button"
            className={common.danger}
            disabled={busy}
            onClick={remove}
          >
            {busy ? "Removing…" : "Remove guest"}
          </button>
        </div>
      </dialog>
    </>
  );
}
