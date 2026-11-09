import {
  ArrowDown,
  ArrowRight,
  Camera,
  CheckCircle2,
  Heart,
  MapPin,
  Menu,
  ShieldCheck,
  Star,
  Upload,
} from "lucide-react";
import CelebrationImage from "./celebration-image";
import styles from "./home.module.css";

const photos = {
  couple: "https://lh3.googleusercontent.com/aida/ALJJyrCdpLL7nT4h9tT5i6XBYT2g-B5Hka4qwG_GkFLbGMBaX_o-vrrVlZ9MqIdR_M5-5hfT9T9YeYIKt5FID5bK2hiE-dlOqRCzHVIsw-UvzD2RVWHvSznXgooo3ZgqHN-Ykh9KO-OdL8kkV8b6CoQ6RGNSwUR8RW1HAwBCqT9JX2aovqrr-AjgZcO8BX5_YVCaR951UijreYn2wQPwLAstOJodUO-GJZ_cB0L2v7an9oUW_w",
  mandap: "https://lh3.googleusercontent.com/aida/ALJJyrBAoimJEJ3i88HTl-JgqA3IxtIqD8xfsyaoUIFsZ7FWVD-Kq4meifMuzcZ1jRhulY2TUqMuywXKDEOW56e04LbKKHlMWVklvQeWDkeiUWY7r1YI-nTkZx3tqhKW9HQLLqTHg9SDsIvi8GZExWB92sxTayzS2G0t7JlLbKEBOaOiA2-WkMbjOS5SAWtorWabz6ZL1BnXs9fiuHmbL2oyKwT-mlFhpQWrIWZszSrIkHKl",
  banquet: "https://lh3.googleusercontent.com/aida/ALJJyrCFckPBArDtPn4gU9tF3kL3qZw3mL5XCL8tmN9uYAF5tY7Q-oPyftXVrSrI42brQpPydPSXFm-Se0JDji1kT6SVTOEc374ucuPjZrQa1eyAcUs4KUOxaKKPm-JBuDoa1zO3bm9j6z9HRRu_ie5CiuE6Qi3MHJtll7whAo1CyHBoHEUOKS81SLgMq1WdvLxe2ORCF2w7DRjybFHh4bnp47At2__glNpNF07QzwFjwVyDhg",
  stationery: "https://lh3.googleusercontent.com/aida/ALJJyrCntZNFgsVjoAASpQ_eQi24bxsBimtrqV9mcwR0RjiKY0uCMjA4Widl4AMg6DIgfWW9QB6KBi7tlJd3Hd4NmN6tT3HZSqmkpW27nNBg2lNmD63anqxS8zRQXMsVCXXGaCpBDbJIZrW8nDh1oIG8Zi4CAdVDb04E_15skIi3p2BvDdj1TbcFtkM8MyxPjZcsf-_rITtw7zXuYBO9nWzAkum4g0tLiFrTajwF33uXWofQ3Q",
  qr: "/images/qr-preview.svg",
};

const ceremonies = [
  {
    day: "Thursday, Nov 20",
    time: "10:00 AM · Morning",
    name: "Ganesh Puja & Sacred Mangalashtak",
    description:
      "An intimate prayer gathering invoking Lord Ganesha’s blessings for auspicious beginnings, held at the private family temple within the palace colonnades.",
    venue: "Shiv Niwas Palace Courtyard",
    attire: "Saffron & Raw Silk",
  },
  {
    day: "Thursday, Nov 20",
    time: "3:30 PM · Afternoon",
    name: "Daylight Mehendi & Folk Sangeet",
    description:
      "Sun-drenched garden lawns with master Sojat henna artisans, vibrant Rajasthani ghoomar dancers, and afternoon chaat carts.",
    venue: "The Lotus Garden Lawns",
    attire: "Botanical Pastels & Leheriya",
  },
  {
    day: "Friday, Nov 21",
    time: "10:30 AM · Morning",
    name: "Sacred Haldi & Phoolon Ki Holi",
    description:
      "Fragrant yellow turmeric paste, cold-pressed sandalwood oils, and cascades of fresh marigold and desi gulab petals.",
    venue: "Manek Chowk Courtyard",
    attire: "Mustard Yellows & Ivory",
  },
  {
    day: "Saturday, Nov 22",
    time: "4:45 PM · Sunset Pheras",
    name: "The Royal Muhurtham & Mandap Vows",
    description:
      "Baraat arrival by vintage boat along Lake Pichola, Jaymala beneath carved pavilions, and seven sacred pheras around the agni as dusk falls.",
    venue: "Zenana Mahal Pavilion",
    attire: "Heirloom Zardozi & Royal Ivory",
  },
  {
    day: "Sunday, Nov 23",
    time: "7:30 PM · Evening",
    name: "Courtyard Reception & Candlelit Banquet",
    description:
      "A grand starlit soirée with live acoustic sufi and jazz ensembles, candlelit banquet tables, heartfelt toasts, and celebratory dancing.",
    venue: "Jagmandir Island Palace",
    attire: "Black Tie & Royal Velvet",
  },
];

const moments = [
  {
    image: photos.mandap,
    fallbackImage: "/images/mandap.svg",
    alt: "Marigold garlands framing the wedding mandap at sunset",
    eyebrow: "Zenana Mahal, Udaipur",
    title: "The Sunset Mandap & Sacred Pheras",
    description:
      "Marigold strings and white tuberose beneath carved sandstone cupolas as daylight settles over Lake Pichola.",
  },
  {
    image: photos.couple,
    fallbackImage: "/images/wedding-couple.svg",
    alt: "Aanya and Kabir sharing a joyful moment together",
    eyebrow: "Unscripted moments",
    title: "Pure Joy & Shared Laughter",
    description:
      "Hand in hand, basking in the morning breeze and the warmth of family blessings.",
  },
  {
    image: photos.banquet,
    fallbackImage: "/images/banquet.svg",
    alt: "A warm candlelit wedding banquet table",
    eyebrow: "Jagmandir Island Palace",
    title: "The Royal Candlelit Banquet",
    description:
      "Woven linen runners, handcrafted brass candelabras, and candlelight beneath historic vaulted arches.",
  },
  {
    image: photos.stationery,
    fallbackImage: "/images/stationery.svg",
    alt: "Botanical wedding stationery with a wax seal",
    eyebrow: "Artisanal letterpress",
    title: "Botanical Invitation Papeterie",
    description:
      "Deckle-edged cotton stationery, terracotta washes, and gold foil calligraphy sealed in brass wax.",
  },
];

const feasts = [
  {
    eyebrow: "Mewari heritage",
    title: "Royal Rajasthani Degchi",
    description:
      "Slow-simmered Dal Baati Churma, smoky Laal Maas with Mathania chillies, Ker Sangri with fresh fenugreek, and saffron rotis served on kansa thalis.",
  },
  {
    eyebrow: "Sweet indulgence",
    title: "Live Halwai & Mithai Carts",
    description:
      "Piping-hot Rabdi Jalebis, Ghewar with wild rose and pistachio, hand-churned Kesar Pista Kulfi, and warming Kashmiri Kahwa.",
  },
  {
    eyebrow: "Botanical libations",
    title: "Bespoke Cocktail Atelier",
    description:
      "Signature cocktails with vetiver, Udaipur lake oranges, marigold cordial, star anise, smoked sandalwood bitters, and fresh coconut water.",
  },
];

const blessings = [
  {
    quote:
      "Watching Aanya and Kabir find their home in one another has been the greatest gift of our lives. May your path always be paved with quiet understanding and laughter.",
    names: "Sunita & Rajesh Sharma",
    relation: "Parents of the Bride · New Delhi",
  },
  {
    quote:
      "From children playing in ancestral gardens to standing proudly under the mandap, Kabir’s warmth and Aanya’s grace bring our two families together in purest harmony.",
    names: "Veena & Harish Singhania",
    relation: "Parents of the Groom · Mumbai",
  },
  {
    quote:
      "You two bring out the calmest, happiest spark in each other. Here is to a hundred lifetimes of late-night chai, spontaneous travels, and unconditional companionship.",
    names: "Meera Sharma & Siddharth Rao",
    relation: "Sister & Brother-in-Law",
  },
];

const reviews = [
  {
    names: "Maharawal Vikramaditya & Nandini",
    relation: "Family Guest",
    quote:
      "The sunset pheras at Zenana Mahal surrounded by live sitar strains and delicate marigold scents were truly regal. Flawless hospitality and an unforgettable celebration of two wonderful families.",
    attended: "Attended Sunset Pheras & Candlelit Banquet · Udaipur",
  },
  {
    names: "Dr. Alistair & Priyanka Campbell",
    relation: "Close Friends",
    quote:
      "The royal Rajasthani banquet with slow-cooked Laal Maas and freshly made Ghewar was pure culinary poetry. Aanya and Kabir illuminated the whole palace.",
    attended: "Attended all 4 ceremonial days · London & Jaipur",
  },
];

function Stars({ label = "5 out of 5 stars" }: { label?: string }) {
  return (
    <span className={styles.stars} role="img" aria-label={label}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} aria-hidden="true" size={13} fill="currentColor" strokeWidth={1.3} />
      ))}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2>{title}</h2>
      <p className={styles.sectionDescription}>{description}</p>
    </div>
  );
}

function splitDescription(description: string, wordLimit = 10) {
  const words = description.trim().split(/\s+/);

  return {
    preview: words.slice(0, wordLimit).join(" "),
    remainder: words.slice(wordLimit).join(" "),
  };
}

export default function HomePage() {
  return (
    <div className={styles.page} id="top">
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <a className={styles.brand} href="#top" aria-label="Make My Marriage home">
            <Heart aria-hidden="true" size={17} strokeWidth={1.5} />
            <span>Make My Marriage</span>
            <small>An Heirloom Chronicle</small>
          </a>
          <nav className={styles.navigation} aria-label="Main navigation">
            <a href="#ceremonies">Ceremonies</a>
            <a href="#moments">Moments</a>
            <a href="#blessings">Blessings</a>
            <a href="#reviews">Reviews & Ratings</a>
            <a href="#photo-share">Photo Share</a>
          </nav>
          <div className={styles.headerActions}>
            <button
              className={styles.signIn}
              type="button"
              disabled
              title="Sign in will be available soon"
            >
              Sign in
            </button>
            <a className={styles.headerButton} href="#ceremonies">
              Start Planning <ArrowRight aria-hidden="true" size={14} />
            </a>
            <details className={styles.mobileMenu}>
              <summary aria-label="Open navigation menu">
                <Menu aria-hidden="true" size={18} />
                <span>Menu</span>
              </summary>
              <nav className={styles.mobileMenuPanel} aria-label="Mobile navigation">
                <a href="#ceremonies">Ceremonies</a>
                <a href="#moments">Moments</a>
                <a href="#blessings">Blessings</a>
                <a href="#reviews">Reviews & Ratings</a>
                <a href="#photo-share">Photo Share</a>
              </nav>
            </details>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.heroEyebrow}>An intimate royal celebration in Udaipur</p>
              <h1 id="hero-title">
                The Union of <em>Aanya & Kabir</em>
              </h1>
              <p className={styles.heroDescription}>
                With the cherished blessings of our parents, ancestors, and beloved families,
                we invite you to immerse in four days of timeless heritage rituals, sacred Vedic
                vows, and joyful camaraderie along the tranquil waters of Lake Pichola.
              </p>
              <div className={styles.eventFacts}>
                <div>
                  <span>Dates</span>
                  <strong>Nov 20 – 23, 2025</strong>
                </div>
                <div>
                  <span>Location</span>
                  <strong>Zenana Mahal, Udaipur</strong>
                </div>
                <div>
                  <span>Shubh Muhurtham</span>
                  <strong>Sunset Godhuli Bela</strong>
                </div>
              </div>
              <div className={styles.heroActions}>
                <a className={styles.primaryButton} href="#ceremonies">
                  Explore Ceremonial Itinerary <ArrowRight aria-hidden="true" size={16} />
                </a>
                <a className={styles.secondaryButton} href="#moments">
                  View Celebration Moments
                </a>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.heroImageFrame}>
                <CelebrationImage
                  src={photos.couple}
                  fallbackSrc="/images/wedding-couple.svg"
                  alt="Aanya and Kabir celebrating their wedding in Udaipur"
                  fallbackLabel="Wedding portrait"
                  fill
                  priority
                  unoptimized
                  sizes="(max-width: 760px) 100vw, 53vw"
                  className={styles.heroImage}
                />
                <div className={styles.imageCaption}>
                  <span>Aanya & Kabir · Zenana Mahal</span>
                  <span>November 2025</span>
                </div>
              </div>
              <span className={styles.heroImageOrnament} aria-hidden="true">❋</span>
            </div>
          </div>
        </section>

        <section className={styles.verse} aria-label="A wedding blessing">
          <Heart aria-hidden="true" size={18} fill="currentColor" strokeWidth={1.2} />
          <blockquote>
            “May the bond forged under sacred Agni bring warmth to two ancestral hearths, and may
            seven steps together bloom into a lifetime of grace and harmony.”
          </blockquote>
          <p>From the Rigvedic Vivaha Sukta · Sharma & Singhania Families</p>
        </section>

        <section className={`${styles.section} ${styles.ceremonySection}`} id="ceremonies">
          <div className={styles.sectionContainer}>
            <SectionHeading
              eyebrow="The ceremonial journey"
              title="Honoring Traditions Through Four Days"
              description="Each ceremonial chapter carries its own cadence, sacred significance, and joyous celebration."
            />
            <div className={styles.ceremonyList}>
              {ceremonies.map((ceremony, index) => (
                <article className={styles.ceremonyRow} key={ceremony.name}>
                  <div className={styles.ceremonyDate}>
                    <span className={styles.timelineDot} aria-hidden="true" />
                    <strong>{ceremony.day}</strong>
                    <span>{ceremony.time}</span>
                  </div>
                  <div className={styles.ceremonyDetails}>
                    <span className={styles.ritualNumber}>0{index + 1} / 05</span>
                    <h3>{ceremony.name}</h3>
                    <p>{ceremony.description}</p>
                  </div>
                  <div className={styles.ceremonyMeta}>
                    <span><MapPin aria-hidden="true" size={13} /> {ceremony.venue}</span>
                    <span>{ceremony.attire}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.momentsSection}`} id="moments">
          <div className={styles.sectionContainer}>
            <SectionHeading
              eyebrow="Moments of the marriage"
              title="An Heirloom Visual Chronicle"
              description="Captured in unscripted daylight and soft golden-hour serenity—every sacred step, quiet glance, and heartfelt feast."
            />
            <div className={styles.momentsGrid}>
              {moments.map((moment) => {
                const description = splitDescription(moment.description);

                return (
                  <article className={styles.momentCard} key={moment.title}>
                    <div className={styles.momentImageFrame}>
                      <CelebrationImage
                        src={moment.image}
                        fallbackSrc={moment.fallbackImage}
                        alt={moment.alt}
                        fallbackLabel={moment.eyebrow}
                        fill
                        unoptimized
                        sizes="(max-width: 700px) 100vw, 50vw"
                        className={styles.momentImage}
                      />
                    </div>
                    <div className={styles.momentCopy}>
                      <span className={styles.momentEyebrow}>{moment.eyebrow}</span>
                      <h3>{moment.title}</h3>
                      <details className={styles.momentReadMore}>
                        <summary>
                          <span>{description.preview}{description.remainder ? "…" : ""}</span>
                          {description.remainder && (
                            <span className={styles.readMoreLabel}>
                              <span className={styles.seeMore}>See more</span>
                              <span className={styles.seeLess}>See less</span>
                            </span>
                          )}
                        </summary>
                        {description.remainder && <p>{description.remainder}</p>}
                      </details>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.feastSection}`} id="feasts">
          <div className={styles.sectionContainer}>
            <SectionHeading
              eyebrow="A sensory celebration"
              title="The Decor, Aromas & Royal Feasts"
              description="Curated culinary courses celebrating Mewari royal recipes and contemporary pan-Indian artistry."
            />
            <div className={styles.feastGrid}>
              {feasts.map((feast, index) => (
                <article className={styles.feastCard} key={feast.title}>
                  <span className={styles.feastNumber}>0{index + 1}</span>
                  <p className={styles.eyebrow}>{feast.eyebrow}</p>
                  <h3>{feast.title}</h3>
                  <p>{feast.description}</p>
                  <span className={styles.feastRule} aria-hidden="true" />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.blessingsSection}`} id="blessings">
          <div className={styles.sectionContainer}>
            <SectionHeading
              eyebrow="Affection & blessings"
              title="Words of Family Love"
              description="Cherished blessings from parents, elders, and lifelong friends celebrating this sacred new beginning."
            />
            <div className={styles.blessingsGrid}>
              {blessings.map((blessing) => (
                <figure className={styles.blessingCard} key={blessing.names}>
                  <span className={styles.quoteMark} aria-hidden="true">“</span>
                  <blockquote>{blessing.quote}</blockquote>
                  <figcaption>
                    <strong>{blessing.names}</strong>
                    <span>{blessing.relation}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.photoSection}`} id="photo-share">
          <div className={styles.sectionContainer}>
            <SectionHeading
              eyebrow="Guest memories & live vault"
              title="Scan to Share & Capture Sacred Moments"
              description="Point your phone camera to instantly upload your candid photographs, videos, and cherished moments directly to Aanya & Kabir’s private family heirloom album—no app download required."
            />
            <div className={styles.photoPanel}>
              <div className={styles.qrColumn}>
                <div className={styles.qrFrame}>
                  <CelebrationImage
                    src={photos.qr}
                    fallbackSrc={photos.qr}
                    alt="Preview of the wedding photo share QR code"
                    fallbackLabel="QR code preview"
                    width={224}
                    height={224}
                    unoptimized
                    className={styles.qrImage}
                  />
                </div>
                <p><Camera aria-hidden="true" size={14} /> Scan with any phone</p>
                <span>Instant guest access · High-resolution preservation</span>
              </div>
              <div className={styles.photoSteps}>
                <article>
                  <span>1</span>
                  <div><h3>Open Camera</h3><p>Simply scan the QR code using any smartphone camera or QR reader.</p></div>
                </article>
                <article>
                  <span>2</span>
                  <div><h3>Instant Upload</h3><p>Drop high-resolution photos and candid videos from any of the four ceremonial days.</p></div>
                </article>
                <article>
                  <span>3</span>
                  <div><h3>Relive the Collective Album</h3><p>Explore guest captures together and download full-resolution memories.</p></div>
                </article>
                <div className={styles.photoActions}>
                  <a className={styles.primaryButton} href="#photo-share"><Upload aria-hidden="true" size={15} /> Upload Photos Directly</a>
                  <a className={styles.secondaryButton} href="#moments">View Guest Gallery</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.reviewsSection}`} id="reviews">
          <div className={styles.sectionContainer}>
            <SectionHeading
              eyebrow="Guest impressions & heritage memories"
              title="Celebration Ratings & Heartfelt Reviews"
              description="Revered memories shared by royal attendees, elders, and cherished guests honoring four unforgettable days of union."
            />
            <div className={styles.reviewsLayout}>
              <aside className={styles.ratingSummary} aria-label="Guest ratings summary">
                <div className={styles.ratingScore}>
                  <strong>4.9</strong><span>/ 5.0</span>
                </div>
                <Stars />
                <p className={styles.ratingCount}>120+ cherished impressions</p>
                <div className={styles.ratingBars}>
                  {[
                    ["Atmosphere & Decor", "5.0", "100%"],
                    ["Ceremony & Rituals", "4.9", "96%"],
                    ["Culinary Banquets", "5.0", "100%"],
                    ["Hospitality & Care", "4.8", "92%"],
                  ].map(([label, score, width]) => (
                    <div className={styles.ratingBarRow} key={label}>
                      <span>{label}</span><span className={styles.ratingTrack}><span style={{ width }} /></span><strong>{score}</strong>
                    </div>
                  ))}
                </div>
                <p className={styles.verifiedNote}><ShieldCheck aria-hidden="true" size={13} /> Verified wedding guest impressions</p>
              </aside>
              <div className={styles.reviewColumn}>
                {reviews.map((review) => (
                  <article className={styles.reviewCard} key={review.names}>
                    <div className={styles.reviewHeader}>
                      <div><h3>{review.names}</h3><span>{review.relation}</span></div>
                      <Stars />
                    </div>
                    <blockquote>“{review.quote}”</blockquote>
                    <p>{review.attended}</p>
                    <span className={styles.reviewVerified}><CheckCircle2 aria-hidden="true" size={12} /> Verified guest</span>
                  </article>
                ))}
                <form className={styles.blessingForm}>
                  <label htmlFor="blessing">Share your blessing & rating</label>
                  <div className={styles.formStars}><Stars label="Selected rating: 5 out of 5 stars" /></div>
                  <div className={styles.formRow}>
                    <input id="blessing" type="text" placeholder="Write a blessing or memory…" />
                    <button type="button">Submit Blessing <ArrowRight aria-hidden="true" size={14} /></button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <a className={styles.footerBrand} href="#top"><Heart aria-hidden="true" size={16} /> Make My Marriage</a>
        <p>An intimate wedding heirloom chronicle commemorating the union of Aanya Sharma and Kabir Singhania at Zenana Mahal, Lake Pichola, Udaipur.</p>
        <nav aria-label="Footer navigation">
          <a href="#top">The Union</a><a href="#ceremonies">Ceremonies</a><a href="#moments">Moments</a><a href="#feasts">The Feasts</a><a href="#blessings">Family Blessings</a><a href="#reviews">Reviews & Ratings</a><a href="#photo-share">Photo Vault / QR</a>
        </nav>
        <div className={styles.footerBottom}>
          <span>© 2025 Sharma & Singhania Families · With heartfelt gratitude to our loved ones.</span>
          <span>Udaipur · Rajasthan, India</span>
        </div>
      </footer>
      <a className={styles.backToTop} href="#top" aria-label="Back to top"><ArrowDown aria-hidden="true" size={15} /></a>
    </div>
  );
}
