"use client";
import { useState } from "react";
import Link from "next/link";
import styles from "../invitations/accept/invitation-acceptance.module.css";
export default function GuestAcceptance({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState("");
  async function accept() {
    setPending(true); setMessage("");
    try {
      const response = await fetch("/api/v1/guest-invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const result = await response.json() as { data?: { weddingName: string }; error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? "Could not accept this invitation.");
      if (!result.data) throw new Error("Could not read the invitation response. Please try again.");
      setAccepted(true); setMessage(`Your invitation to ${result.data.weddingName} is accepted.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setPending(false); }
  }
  return <main className={styles.page}><header className={styles.header}><Link href="/" className={styles.brand}>make my <strong>marriage</strong></Link></header><section className={styles.card}>
    <p className={styles.eyebrow}>A PLACE IN THE CELEBRATION</p><h1>{accepted ? "Invitation accepted" : "You’re invited"}</h1>
    <p className={styles.copy}>Join the celebration as a guest. No account or dashboard access is needed.</p>
    {!accepted && <button type="button" className={styles.primary} disabled={pending || !token} onClick={() => void accept()}>{pending ? "Accepting…" : "Accept invitation"}</button>}
    <p role="status" className={styles.message}>{message || (!token ? "This invitation link is missing its token." : "")}</p>
  </section></main>;
}
