"use client";
import styles from "./invitation.module.css";
export default function InvitationError({ retry }: { retry: () => void }) {
  return (
    <main className={styles.unavailable}>
      <h1>We couldn?t load your invitation</h1>
      <p>
        Please try again in a moment. Your existing response has not been
        removed.
      </p>
      <button className={styles.primary} onClick={retry}>
        Try again
      </button>
    </main>
  );
}
