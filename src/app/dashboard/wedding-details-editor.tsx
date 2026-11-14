"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import styles from "./dashboard.module.css";

type WeddingDetails = {
  id: string;
  title: string;
  description: string;
  partnerOneName: string;
  partnerTwoName: string;
  city: string;
  weddingDate: string | null;
  weddingDateIsTentative: boolean;
};

type ApiResult = { success?: boolean; error?: { message?: string } };

export default function WeddingDetailsEditor({ wedding }: { wedding: WeddingDetails }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSuccess(false);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/v1/weddings/${wedding.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          partnerOneName: form.get("partnerOneName"),
          partnerTwoName: form.get("partnerTwoName"),
          city: form.get("city"),
          weddingDate: form.get("weddingDate") || null,
          weddingDateIsTentative: form.get("weddingDateIsTentative") === "on",
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const result = typeof payload === "object" && payload !== null ? payload as ApiResult : {};
      if (!response.ok || result.success !== true) {
        throw new Error(result.error?.message ?? "We could not save your wedding details. Please try again.");
      }
      setEditing(false);
      setSuccess(true);
      router.refresh();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "We could not save your wedding details. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.detailsEditor}>
      {!editing ? (
        <div className={styles.detailsEditorActions}>
          {success && <p className={styles.detailsSuccess} role="status">Wedding details updated.</p>}
          <button className={styles.editDetailsButton} type="button" onClick={() => { setSuccess(false); setEditing(true); }}>
            Edit wedding details
          </button>
        </div>
      ) : (
        <form className={styles.detailsForm} onSubmit={onSubmit}>
          <div className={styles.detailsFormHeading}>
            <p className={styles.eyebrow}>WEDDING DETAILS</p>
            <h3>Edit your celebration</h3>
            <p>Changes are saved to this wedding workspace.</p>
          </div>
          <div className={styles.setupGrid}>
            <div className={styles.setupField}><label htmlFor="edit-title">Wedding title</label><input className={styles.setupInput} id="edit-title" name="title" defaultValue={wedding.title} required maxLength={160} /></div>
            <div className={styles.setupField}><label htmlFor="edit-partner-one">Bride / Partner one full name</label><input className={styles.setupInput} id="edit-partner-one" name="partnerOneName" defaultValue={wedding.partnerOneName} required maxLength={120} /></div>
            <div className={styles.setupField}><label htmlFor="edit-partner-two">Groom / Partner two full name</label><input className={styles.setupInput} id="edit-partner-two" name="partnerTwoName" defaultValue={wedding.partnerTwoName} required maxLength={120} /></div>
            <div className={styles.setupField}><label htmlFor="edit-city">City or place</label><input className={styles.setupInput} id="edit-city" name="city" defaultValue={wedding.city} required maxLength={120} /></div>
            <div className={styles.setupField}><label htmlFor="edit-date">Wedding date</label><input className={styles.setupInput} id="edit-date" name="weddingDate" type="date" defaultValue={wedding.weddingDate ?? ""} /></div>
            <div className={styles.setupField}><label htmlFor="edit-description">Description</label><textarea className={styles.setupInput} id="edit-description" name="description" defaultValue={wedding.description} maxLength={1200} rows={3} /></div>
          </div>
          <label className={styles.setupTentative}><input type="checkbox" name="weddingDateIsTentative" defaultChecked={wedding.weddingDateIsTentative} /><span>This date is tentative</span></label>
          <p className={styles.detailsPrivacy}>Your wedding details are private to your account.</p>
          <div className={styles.setupActions}>
            <button className={styles.cancelDetailsButton} type="button" disabled={pending} onClick={() => { setError(""); setEditing(false); }}>Cancel</button>
            <button className={styles.setupButton} type="submit" disabled={pending}>{pending ? "Saving changes…" : "Save changes"}</button>
          </div>
          {error && <p className={styles.setupError} role="alert">{error}</p>}
        </form>
      )}
    </div>
  );
}
