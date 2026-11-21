import styles from "./events.module.css";
export default function LoadingEvents() {
  return (
    <div className={styles.card} role="status" aria-live="polite">
      Loading your celebrations…
    </div>
  );
}
