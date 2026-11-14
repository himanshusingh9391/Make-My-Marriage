"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import styles from "./dashboard.module.css";

type ApiResult = { success?: boolean; error?: { message?: string } };

export default function WeddingSetupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/weddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerOneName: form.get("partnerOneName"),
          partnerTwoName: form.get("partnerTwoName"),
          city: form.get("city"),
          weddingDate: form.get("weddingDate") || undefined,
          weddingDateIsTentative: form.get("weddingDateIsTentative") === "on",
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const result = typeof payload === "object" && payload !== null ? payload as ApiResult : {};
      if (!response.ok || result.success !== true) {
        throw new Error(result.error?.message ?? "We could not save your wedding details. Please try again.");
      }
      router.refresh();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "We could not save your wedding details. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.setupCard} aria-labelledby="setup-title">
      <div className={styles.setupIntro}>
        <span className={styles.emptyIcon} aria-hidden="true">♡</span>
        <p className={styles.eyebrow}>YOUR FIRST WEDDING WORKSPACE</p>
        <h2 id="setup-title">Let’s make this celebration yours</h2>
        <p>Add your couple names and celebration details. You can leave the date blank until you have one.</p>
      </div>
      <form className={styles.setupForm} onSubmit={onSubmit}>
        <div className={styles.setupGrid}>
          <div className={styles.setupField}><label htmlFor="partner-one">Bride / Partner one full name</label><input className={styles.setupInput} id="partner-one" name="partnerOneName" autoComplete="off" required maxLength={120} /></div>
          <div className={styles.setupField}><label htmlFor="partner-two">Groom / Partner two full name</label><input className={styles.setupInput} id="partner-two" name="partnerTwoName" autoComplete="off" required maxLength={120} /></div>
          <div className={styles.setupField}><label htmlFor="wedding-city">City or place</label><input className={styles.setupInput} id="wedding-city" name="city" autoComplete="address-level2" required maxLength={120} placeholder="e.g. Jaipur" /></div>
          <div className={styles.setupField}><label htmlFor="wedding-date">Tentative wedding date</label><input className={styles.setupInput} id="wedding-date" name="weddingDate" type="date" /></div>
        </div>
        <label className={styles.setupTentative}><input type="checkbox" name="weddingDateIsTentative" defaultChecked /><span>This date is tentative</span></label>
        <div className={styles.setupActions}><span>Your details stay private in this account.</span><button className={styles.setupButton} type="submit" disabled={pending}>{pending ? "Saving details…" : "Save wedding details"}</button></div>
        {error && <p className={styles.setupError} role="alert">{error}</p>}
      </form>
    </section>
  );
}
