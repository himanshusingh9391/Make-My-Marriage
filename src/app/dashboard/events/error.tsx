"use client";
import Link from "next/link";
import styles from "./events.module.css";
export default function EventsError({ reset }: { reset: () => void }) {
  return (
    <section className={styles.card} role="alert">
      <h2>We couldn’t load your events</h2>
      <p>Your changes may not have been saved. Please try again.</p>
      <div className={styles.actions}>
        <button className={styles.primary} onClick={reset}>
          Try again
        </button>
        <Link className={styles.secondary} href="/dashboard">
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
