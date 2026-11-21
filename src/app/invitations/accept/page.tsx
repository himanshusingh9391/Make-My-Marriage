import SiteLogo from "../../site-logo";
import InvitationAcceptance from "./invitation-acceptance";
import styles from "./invitation-acceptance.module.css";

export const metadata = {
  title: "Accept Wedding Invitation | Make My Marriage",
};

export default async function InvitationAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <main className={styles.page}>
      <meta name="referrer" content="no-referrer" />
      <header className={styles.header}>
        <SiteLogo />
        <span>PRIVATE WEDDING SUITE</span>
      </header>
      <InvitationAcceptance token={token} />
      <footer className={styles.footer}>
        Made for the moments you’ll remember
      </footer>
    </main>
  );
}
