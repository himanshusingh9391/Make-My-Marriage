import { ArrowRight, Heart, ShieldCheck, Sprout, Star } from "lucide-react";
import Link from "next/link";
import CelebrationImage from "./celebration-image";
import styles from "./auth.module.css";

type AuthShellProps = {
  children: React.ReactNode;
  mode: "sign-in" | "sign-up" | "verify" | "recovery";
};

const copy = {
  "sign-in": {
    badge: "Private member access",
    pill: "Curated patrimony",
    quote: "An atelier for celebrations of a lifetime.",
    caption: "Bespoke architectural itineraries",
  },
  "sign-up": {
    badge: "Private atelier access",
    pill: "Begin your heirloom",
    quote: "Every memorable celebration begins with thoughtful curation.",
    caption: "Curated Indian wedding experiences",
  },
  verify: {
    badge: "A thoughtful beginning",
    pill: "Your story starts here",
    quote: "A celebration of a lifetime, made personal from the very first step.",
    caption: "Make My Marriage",
  },
  recovery: {
    badge: "Private member access",
    pill: "Here for you",
    quote: "Your wedding suite is always yours to return to.",
    caption: "Confidential and curated",
  },
} satisfies Record<AuthShellProps["mode"], { badge: string; pill: string; quote: string; caption: string }>;

export default function AuthShell({ children, mode }: AuthShellProps) {
  const content = copy[mode];

  return (
    <main className={styles.authPage}>
      <header className={styles.authHeader}>
        <Link className={styles.authBrand} href="/" aria-label="Make My Marriage home">
          <Sprout aria-hidden="true" size={22} strokeWidth={1.6} />
          <span>Make My Marriage</span>
        </Link>
      </header>

      <div className={styles.authLayout}>
        <aside className={styles.authVisual} aria-label="A wedding suite for your celebration">
          <CelebrationImage
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCCgaiafPP_eb7i2ZAAE1XeBFy77uYM0vY_K0KQCkQTDb5tHEAK5DmDgvydjlABLt5EEOyH9XRNoQjQxOWu7Bkkd6-u2dD_bRh_4Nq49yrodi5R3ma9QVP6jhqqTvA90Z2G4mAZbzZvBahkzxEYVPL-kJ9e9pWuDzYzbWrzl22yv3fqsrSNIDiCDkBFcSd-BmK7ITRen-6fn1h8NtB6kyw6CT2H5Ad-kUlifwT6Hme-"
            fallbackSrc="/images/wedding-couple.svg"
            alt="A couple celebrating together in a heritage wedding courtyard"
            fallbackLabel="A celebration to remember"
            fill
            unoptimized
            sizes="(max-width: 850px) 100vw, 50vw"
            className={styles.authPhoto}
          />
          <div className={styles.authImageScrim} aria-hidden="true" />
          <div className={styles.authPhotoBadge}><ShieldCheck size={14} aria-hidden="true" /> {content.badge}</div>
          <div className={styles.authQuoteCard}>
            <div className={styles.authQuoteMeta}>
              <span>{content.pill}</span>
              <i aria-hidden="true" />
              <span>The Royal Pavilions</span>
            </div>
            <blockquote>“{content.quote}”</blockquote>
            <div className={styles.authQuoteFooter}>
              <span>{content.caption}</span>
              <span className={styles.authStars} aria-label="Five stars">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star key={index} size={13} fill="currentColor" strokeWidth={1.2} aria-hidden="true" />
                ))}
              </span>
            </div>
          </div>
          <span className={styles.authEst}>EST. 2024</span>
        </aside>

        <section className={styles.authContent}>
          <div className={styles.authFormWrap}>{children}</div>
        </section>
      </div>

      <footer className={styles.authFooter}>
        <Heart size={12} aria-hidden="true" /> Architectural wedding suite · Confidential &amp; curated
      </footer>
    </main>
  );
}

export function AuthHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className={styles.authHeading}>
      <p className={styles.authEyebrow}><i aria-hidden="true" />{eyebrow}</p>
      <h1>{title}</h1>
      <p className={styles.authDescription}>{description}</p>
    </div>
  );
}

export function AuthPrimaryButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button className={styles.authPrimaryButton} type="submit" disabled={disabled}>
      <span>{children}</span><ArrowRight size={18} aria-hidden="true" />
    </button>
  );
}

export { styles as authStyles };
