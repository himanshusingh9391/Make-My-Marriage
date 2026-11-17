"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailPlus, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import styles from "./members.module.css";

type Member = { id: string; fullName: string; email: string; role: "OWNER" | "ADMIN" | "MANAGER"; joinedAt: string };
type Invitation = { id: string; email: string; role: "ADMIN" | "MANAGER"; status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED"; deliveryStatus: "PENDING" | "SENT" | "FAILED"; expiresAt: string; createdAt: string; sentAt: string | null; deliveryError: string | null };
type Roster = { wedding: { id: string; title: string }; members: Member[]; invitations: Invitation[]; counts: { pending: number; accepted: number }; pagination: { page: number; hasMore: boolean } };
type ViewState = "standard" | "empty-pending" | "solo-admin" | "loading" | "recovery-error";
type Props = { weddingId: string; initialData: Roster; canManage: boolean; currentUserId: string; isOwner: boolean };

async function parseResponse(response: Response): Promise<{ data?: Roster | { email?: string; role?: string }; error?: { message?: string } }> {
  const payload: unknown = await response.json().catch(() => null);
  if (typeof payload !== "object" || payload === null) return {};
  const record = payload as Record<string, unknown>;
  return {
    data: typeof record.data === "object" && record.data !== null ? record.data as Roster : undefined,
    error: typeof record.error === "object" && record.error !== null ? record.error as { message?: string } : undefined,
  };
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value)); }

export default function MembersManager({ weddingId, initialData, canManage, currentUserId, isOwner }: Props) {
  const router = useRouter();
  const [roster, setRoster] = useState(initialData);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [viewState, setViewState] = useState<ViewState>("standard");
  const [loadError, setLoadError] = useState(false);

  async function refresh(page = 1) {
    try {
      const response = await fetch(`/api/v1/weddings/${weddingId}/members?page=${page}`, { cache: "no-store" });
      const result = await parseResponse(response);
      if (!response.ok || !result.data || !("members" in result.data)) throw new Error("Could not load the latest wedding members.");
      const updated = result.data;
      setRoster(previous => page === 1 ? updated : { ...updated, invitations: [...previous.invitations, ...updated.invitations] });
      setLoadError(false);
      return true;
    } catch {
      setLoadError(true);
      return false;
    }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true); setError(""); setNotice("");
    const formData = new FormData(form);
    try {
      const response = await fetch(`/api/v1/weddings/${weddingId}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email"), role: formData.get("role") }),
      });
      const result = await parseResponse(response);
      if (!response.ok) throw new Error(result.error?.message ?? "We could not send this invitation.");
      form.reset();
      setNotice("Invitation sent. The link expires in 7 days.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not send this invitation.");
      await refresh();
    } finally { setPending(false); }
  }

  async function revoke(invitationId: string) {
    if (!window.confirm("Revoke this invitation? Its link will no longer work.")) return;
    setPending(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/v1/weddings/${weddingId}/invitations/${invitationId}`, { method: "DELETE" });
      const result = await parseResponse(response);
      if (!response.ok) throw new Error(result.error?.message ?? "We could not cancel this invitation.");
      setNotice("Invitation cancelled. Its link can no longer be used.");
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "We could not cancel this invitation."); }
    finally { setPending(false); }
  }

  async function remove(member: Member) {
    if (!window.confirm(`Remove ${member.fullName} from this wedding? Their account will remain, but wedding access will end.`)) return;
    setPending(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/v1/weddings/${weddingId}/members/${member.id}`, { method: "DELETE" });
      const result = await parseResponse(response);
      if (!response.ok) throw new Error(result.error?.message ?? "Could not remove this member.");
      await refresh(); router.refresh(); setNotice("Member removed from this wedding.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not remove this member."); }
    finally { setPending(false); }
  }

  function focusInvite() {
    document.getElementById("member-email")?.focus();
    document.getElementById("inviteForm")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function retry() {
    setPending(true);
    const refreshed = await refresh();
    setPending(false);
    if (refreshed) setViewState("standard");
  }

  const previewError = viewState === "recovery-error" || loadError;
  const previewLoading = viewState === "loading";
  const previewMembers = viewState === "solo-admin" ? roster.members.filter((member) => member.role === "OWNER") : roster.members;
  const activeInvitations = viewState === "empty-pending" || viewState === "solo-admin"
    ? []
    : roster.invitations.filter((invitation) => invitation.status === "PENDING");
  const history = viewState === "solo-admin" ? [] : roster.invitations.filter((invitation) => invitation.status !== "PENDING");

  return <>
    <div className={styles.pageActions}>
      <div><p className={styles.stateLabel}>VIEW SIMULATION <span>Preview only · does not change your wedding data</span></p>
        <div className={styles.stateControls} aria-label="Members page preview states">
          {(["standard", "empty-pending", "solo-admin", "loading", "recovery-error"] as const).map((state) => {
            const labels: Record<ViewState, string> = { standard: "Standard (Active + Pending)", "empty-pending": "Empty Pending", "solo-admin": "Solo Admin Only", loading: "Loading State", "recovery-error": "Recovery Error" };
            return <button key={state} type="button" className={`${styles.stateButton} ${viewState === state ? styles.stateButtonActive : ""}`} aria-pressed={viewState === state} onClick={() => { setLoadError(false); setViewState(state); }}>{labels[state]}</button>;
          })}
        </div>
      </div>
      {canManage && <div className={styles.actionGroup}><button type="button" className={styles.primaryButton} onClick={focusInvite}><UsersRound size={16} />Invite Member</button><a className={styles.secondaryButton} href="#guestInvitations"><MailPlus size={16} />Send Invitation</a></div>}
    </div>

    <div className={styles.summary}>
      <div><span><UsersRound size={18} /></span><strong>{previewMembers.length}</strong><small>active members</small></div>
      <div><span><MailPlus size={18} /></span><strong>{viewState === "solo-admin" || viewState === "empty-pending" ? 0 : roster.counts.pending}</strong><small>pending member invitations</small></div>
      <div><span><ShieldCheck size={18} /></span><strong>{roster.counts.accepted}</strong><small>accepted member invitations</small></div>
    </div>

    {viewState === "solo-admin" && <p className={styles.previewNotice} role="status">Solo admin preview: only the wedding owner is shown. No member records were changed.</p>}
    {previewLoading ? <section className={styles.card} aria-label="Loading wedding members" aria-busy="true"><div className={styles.cardHeader}><div><h2>Wedding members</h2><p>Loading the latest workspace access…</p></div></div><div className={styles.skeletonList}><span /><span /><span /></div></section>
      : previewError ? <section className={styles.recoveryCard} role="alert"><span className={styles.recoveryIcon}><ShieldCheck size={22} /></span><div><p className={styles.stateLabel}>WORKSPACE CONNECTION</p><h2>We couldn’t load wedding members</h2><p>Your invitation data is still protected. Try loading the list again, or return to the wedding overview.</p><div className={styles.recoveryActions}><button type="button" className={styles.primaryButton} disabled={pending} onClick={() => void retry()}>{pending ? "Retrying…" : "Try again"}</button><Link className={styles.secondaryButton} href={`/dashboard?workspace=${weddingId}`}>Back to overview</Link></div></div></section>
        : <section className={styles.card} aria-labelledby="active-members-title">
          <div className={styles.cardHeader}><div><h2 id="active-members-title">Wedding members</h2><p>People with access to this celebration</p></div><span className={styles.count}>{previewMembers.length}</span></div>
          {previewMembers.length ? <div className={styles.memberList}>{previewMembers.map((member) => <article className={styles.memberRow} key={member.id}>
            <span className={styles.avatar}>{member.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("")}</span>
            <span className={styles.identity}><strong>{member.fullName}</strong><small>{member.email}</small></span>
            <span className={`${styles.roleBadge} ${member.role === "OWNER" ? styles.ownerBadge : ""}`}>{member.role === "OWNER" ? <ShieldCheck size={13} /> : <UserRound size={13} />}{member.role}</span>
            <span className={styles.joined}>Joined {formatDate(member.joinedAt)}{canManage && member.role !== "OWNER" && member.id !== currentUserId && (isOwner || member.role === "MANAGER") && <button type="button" className={styles.revokeButton} disabled={pending} onClick={() => void remove(member)}>Remove</button>}</span>
          </article>)}</div> : <div className={styles.empty}><UsersRound size={21} /><strong>No members to show</strong><span>When a family member accepts an invitation, they’ll appear here.</span></div>}
        </section>}

    {canManage ? <section className={styles.card} id="inviteForm" aria-labelledby="invite-title">
      <div className={styles.cardHeader}><div><h2 id="invite-title">Invite a wedding member</h2><p>Add another Admin or Manager whenever you need. Each person receives their own secure invitation.</p></div><MailPlus className={styles.headerIcon} size={20} /></div>
      <form className={styles.inviteForm} onSubmit={invite}>
        <label>Email address<input id="member-email" name="email" type="email" required maxLength={254} placeholder="name@example.com" autoComplete="email" /></label>
        <label>Access level<select name="role" defaultValue="MANAGER"><option value="ADMIN">Admin</option><option value="MANAGER">Manager</option></select></label>
        <p className={styles.expiry}>Invitations expire automatically after 7 days. The invited person must sign in with this email.</p>
        <button className={styles.primaryButton} disabled={pending} type="submit"><MailPlus size={16} />{pending ? "Sending…" : "Send member invitation"}</button>
      </form>
      {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.notice} role="status">{notice}</p>}
    </section> : <p className={styles.managerNote}>You can view this member list. Only wedding members can invite or cancel invitations.</p>}

    <section className={styles.card} aria-labelledby="pending-title" aria-busy={previewLoading}>
      <div className={styles.cardHeader}><div><h2 id="pending-title">Pending invitations</h2><p>Invitations waiting to be accepted</p></div><span className={styles.count}>{activeInvitations.length}</span></div>
      {previewLoading ? <div className={styles.skeletonList} aria-label="Loading invitations"><span /><span /></div> : activeInvitations.length ? <div className={styles.invitationList}>{activeInvitations.map((invitation) => <article className={styles.invitationRow} key={invitation.id}>
        <span className={styles.invitationIcon}><MailPlus size={17} /></span><span className={styles.identity}><strong>{invitation.email}</strong><small>{invitation.role} · Expires {formatDate(invitation.expiresAt)}</small></span>
        <span className={`${styles.delivery} ${invitation.deliveryStatus === "SENT" ? styles.delivered : styles.deliveryFailed}`}>{invitation.deliveryStatus === "SENT" ? "Sent" : invitation.deliveryStatus === "FAILED" ? "Delivery failed" : "Sending"}</span>
        {canManage && <button className={styles.revokeButton} disabled={pending} onClick={() => void revoke(invitation.id)} type="button">Revoke</button>}
      </article>)}</div> : <div className={styles.empty}><MailPlus size={21} /><strong>No pending invitations</strong><span>When you invite someone, their status will appear here.</span></div>}
    </section>
    {!previewError && !previewLoading && history.length > 0 && <section className={styles.card} aria-labelledby="history-title"><div className={styles.cardHeader}><div><h2 id="history-title">Invitation history</h2><p>Accepted, cancelled, and expired links</p></div></div><div className={styles.invitationList}>{history.map((invitation) => <article className={styles.invitationRow} key={invitation.id}><span className={styles.invitationIcon}><MailPlus size={17} /></span><span className={styles.identity}><strong>{invitation.email}</strong><small>{invitation.role} · Created {formatDate(invitation.createdAt)}{invitation.deliveryStatus === "FAILED" ? " · Delivery failed; you can send a new invitation." : ""}</small></span><span className={styles.historyStatus}>{invitation.status.toLowerCase()}</span></article>)}</div></section>}
    <div className={styles.actionGroup}><button className={styles.secondaryButton} type="button" disabled={pending} onClick={() => void retry()}>Refresh member status</button>{roster.pagination.hasMore && <button className={styles.secondaryButton} type="button" disabled={pending} onClick={() => { setPending(true); void refresh(roster.pagination.page + 1).finally(() => setPending(false)); }}>Load more member invitations</button>}</div>
    <aside className={styles.privacy}><ShieldCheck size={18} /><p><strong>Private wedding suite</strong><span>Invitation links are single-use, expire after 7 days, and are only accepted by the invited email account.</span></p></aside>
  </>;
}
