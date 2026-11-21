import type { ReactNode } from "react";
import styles from "../events/events.module.css";

/** Shared form building blocks for the wedding planning pages. */
export function PlanningSection({
  title,
  description,
  disabled,
  children,
}: {
  title: string;
  description: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset disabled={disabled} className={styles.card}>
      <legend className={styles.srOnly}>{title}</legend>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </fieldset>
  );
}
export function PlanningField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}
export function PlanningHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.heading}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p className={styles.intro}>{description}</p>
      </div>
      {action}
    </div>
  );
}
