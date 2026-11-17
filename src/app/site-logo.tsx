import { Heart } from "lucide-react";
import Link from "next/link";
import styles from "./site-logo.module.css";

export default function SiteLogo() {
  return (
    <Link className={styles.logo} href="/" aria-label="Make My Marriage home">
      <Heart aria-hidden="true" size={17} strokeWidth={1.5} />
      <span>Make My Marriage</span>
      <small>An Heirloom Chronicle</small>
    </Link>
  );
}
