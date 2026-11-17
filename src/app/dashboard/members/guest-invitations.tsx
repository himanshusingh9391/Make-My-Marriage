"use client";
import { useState, type FormEvent } from "react";
import { MailPlus, CheckCircle2 } from "lucide-react";
import styles from "./members.module.css";

type Guest = { id: string; fullName: string; email: string; status: string; sentAt: string | null; expiresAt: string };
type GuestRoster = { invitations: Guest[]; counts: { pending: number; accepted: number }; pagination: { page: number; hasMore: boolean } };
export default function GuestInvitations({ weddingId, initialData }: { weddingId: string; initialData: GuestRoster }) {
  const [data, setData] = useState(initialData);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const endpoint = `/api/v1/weddings/${weddingId}/guest-invitations`;
  async function refresh(page = 1) {
    const response = await fetch(`${endpoint}?page=${page}`, { cache: "no-store" });
    const result = await response.json() as { data?: GuestRoster; error?: { message?: string } };
    if (!response.ok || !result.data) throw new Error(result.error?.message ?? "Could not refresh guest invitations.");
    const updated = result.data;
    setData(previous => page === 1 ? updated : { ...updated, invitations: [...previous.invitations, ...updated.invitations] });
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: name, email }) });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? "Could not send invitation.");
      setName(""); setEmail(""); setMessage("Guest invitation sent. You can invite another relative below.");
      await refresh();
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Please try again."); }
    finally { setPending(false); }
  }
  async function revoke(guest: Guest) {
    if (!window.confirm(`Revoke the pending invitation for ${guest.fullName}?`)) return;
    setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch(`${endpoint}?guestId=${guest.id}`, { method: "DELETE" });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? "Could not revoke invitation.");
      await refresh(); setMessage("Guest invitation revoked.");
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Please try again."); }
    finally { setPending(false); }
  }
  return <section className={styles.card} id="guestInvitations" aria-labelledby="guest-title">
    <div className={styles.cardHeader}><div><h2 id="guest-title">Invite family &amp; relatives</h2><p>Guest invitations only — no Admin or Manager access</p></div><MailPlus size={20} /></div>
    <div className={styles.summary}>
      <div><span><MailPlus size={18} /></span><strong>{data.counts.pending}</strong><small>pending guest invitations</small></div>
      <div><span><CheckCircle2 size={18} /></span><strong>{data.counts.accepted}</strong><small>accepted guest invitations</small></div>
    </div>
    <form className={styles.inviteForm} onSubmit={send}>
      <label>Guest name<input id="guest-name" required maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="Relative’s full name" /></label>
      <label>Email address<input type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="relative@example.com" /></label>
      <p className={styles.expiry}>Accept without an account. Links expire in 7 days. Event-specific RSVPs are separate.</p>
      <button type="submit" className={styles.primaryButton} disabled={pending}><MailPlus size={16} />{pending ? "Please wait…" : "Send Invitation"}</button>
    </form>
    {error && <p role="alert" className={styles.error}>{error}</p>}{message && <p role="status" className={styles.notice}>{message}</p>}
    <div className={styles.invitationList}>{data.invitations.map(guest => <article className={styles.invitationRow} key={guest.id}>
      <span className={styles.invitationIcon}><MailPlus size={17} /></span>
      <span className={styles.identity}><strong>{guest.fullName}</strong><small>{guest.email}</small><small>Guest · Expires {new Date(guest.expiresAt).toLocaleDateString("en-IN")}</small></span>
      <span className={styles.historyStatus}>{guest.status.toLowerCase()}</span>
      {guest.status === "PENDING" ? <button type="button" className={styles.revokeButton} disabled={pending} onClick={() => void revoke(guest)}>Revoke</button> : ["FAILED", "REVOKED", "EXPIRED"].includes(guest.status) ? <button type="button" className={styles.secondaryButton} disabled={pending} onClick={() => { setName(guest.fullName); setEmail(guest.email); document.getElementById("guest-name")?.focus(); }}>Re-invite</button> : null}
    </article>)}</div>
    {!data.invitations.length && <p className={styles.empty}>No guest invitations yet. Invite your first relative above.</p>}
    <div className={styles.actionGroup}>
      <button type="button" className={styles.secondaryButton} disabled={pending} onClick={() => { setPending(true); void refresh().catch(() => setError("Could not refresh. Please try again.")).finally(() => setPending(false)); }}>Refresh status</button>
      {data.pagination.hasMore && <button type="button" className={styles.secondaryButton} disabled={pending} onClick={() => { setPending(true); void refresh(data.pagination.page + 1).catch(() => setError("Could not load more invitations.")).finally(() => setPending(false)); }}>Load more invitations</button>}
    </div>
  </section>;
}
