import { Heart, CalendarDays } from "lucide-react";
import CelebrationImage from "../celebration-image";
import styles from "./[token]/invitation.module.css";
export default function InvitationHero({
  data,
}: {
  data: {
    guestName?: string;
    partnerOneName: string;
    partnerTwoName: string;
    description?: string;
    weddingDate: string | null;
    timezone: string;
    weddingName: string;
  };
}) {
  return (
    <>
      <section className={styles.intro}>
        <span className={styles.heart}>
          <Heart size={26} strokeWidth={1.2} />
        </span>
        <p className={styles.eyebrow}>PERSONAL INVITATION</p>
        {data.guestName && <p>An invitation for {data.guestName}</p>}
        <h1>
          {data.partnerOneName} <em>&</em> {data.partnerTwoName}
        </h1>
        <p className={styles.quote}>
          {data.description ||
            "Together with our families, we would love for you to celebrate with us as we embark on this journey of love and union."}
        </p>
        {data.weddingDate && (
          <p className={styles.date}>
            <CalendarDays size={16} />
            {new Intl.DateTimeFormat("en-IN", {
              dateStyle: "long",
              timeZone: data.timezone,
            }).format(new Date(data.weddingDate))}
          </p>
        )}
      </section>
      <section className={styles.hero} aria-label="Wedding celebration">
        <CelebrationImage
          src="https://lh3.googleusercontent.com/aida/ALJJyrBAoimJEJ3i88HTl-JgqA3IxtIqD8xfsyaoUIFsZ7FWVD-Kq4meifMuzcZ1jRhulY2TUqMuywXKDEOW56e04LbKKHlMWVklvQeWDkeiUWY7r1YI-nTkZx3tqhKW9HQLLqTHg9SDsIvi8GZExWB92sxTayzS2G0t7JlLbKEBOaOiA2-WkMbjOS5SAWtorWabz6ZL1BnXs9fiuHmbL2oyKwT-mlFhpQWrIWZszSrIkHKl"
          fallbackSrc="/images/mandap.svg"
          fallbackLabel="A celebration of love"
          alt="A wedding mandap decorated for the celebration"
          fill
          sizes="(max-width: 1100px) 100vw, 1100px"
          unoptimized
          loading="eager"
          referrerPolicy="no-referrer"
        />
        <div>
          <p className={styles.eyebrow}>A CELEBRATION OF LOVE</p>
          <h2>{data.weddingName}</h2>
        </div>
      </section>
    </>
  );
}
