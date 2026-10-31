import Link from "next/link";
import { ArrowIcon, CheckIcon, Doodle, Light, Scene } from "@/components/kit";
import { SITE } from "@/lib/site";
import { SiteFooter, SiteNav } from "./_components/chrome";
import { VerseChip, type Verse } from "./_components/verse-chip";

// World English Bible (public domain)
const PHIL4: Verse = {
  ref: "Philippians 4:6–7",
  verses: [
    [6, "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God."],
    [7, "And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus."],
  ],
};
const PETER5: Verse = { ref: "1 Peter 5:7", verses: [[7, "casting all your worries on him, because he cares for you."]] };

const LIBRARY = [
  ["Morning Offering", "dawn", "3 min · Morning"],
  ["Peace in Worry", "lake", "4 min · Anxiety"],
  ["Psalm 23 Meditation", "meadow", "5 min · Psalms"],
  ["Evening Examen", "golden", "6 min · Evening"],
  ["Near the Broken-hearted", "dusk", "4 min · Grief"],
  ["Blessing for Home", "sky", "3 min · Family"],
  ["Night Prayer", "evening", "7 min · Evening"],
  ["Rest in Safety", "night", "8 min · Sleep"],
] as const;

const FAQ = [
  [
    "Is it really free?",
    "Yes. The Bible, verse of the day, one daily prayer, 5 companion messages a day and your weekly goal are free forever. Premium adds unlimited chat, personal prayers with audio, the full library, the journal and prayer paths.",
  ],
  [
    "Is it Catholic or Protestant?",
    "Both. You choose your tradition and Lumen respects it. Catholic users can pick the Douay-Rheims Bible, which includes the deuterocanonical books.",
  ],
  [
    "Can the AI make things up?",
    "It can make mistakes in its own words, which is why every verse you see is loaded from the Bible text in our database, and references that don't exist are removed before you see them.",
  ],
  [
    "Is this a replacement for church?",
    "No. Lumen helps you pray day to day and encourages you to stay connected to your church, pastor or priest.",
  ],
  [
    "What happens to my conversations?",
    "They're encrypted, never used for ads, and you can delete them, or your whole account, at any time.",
  ],
] as const;

function Cta({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`btn-ink ${className}`}>
      {children}
      <span className="dot">
        <ArrowIcon />
      </span>
    </Link>
  );
}

export default function LandingPage() {
  return (
    <main className="wrap">
      <SiteNav landing />

      <header className="hero">
        <div>
          <span className="kicker">
            <span>Free to start</span>Catholic &amp; Protestant · real Scripture
          </span>
          <h1>
            A daily prayer, <span className="hl">made for you.</span>
          </h1>
          <p className="lead">
            {SITE.name} writes a short prayer for what you&apos;re carrying, guides you through it, and talks with you about
            faith. Every verse it mentions opens the actual Bible text.
          </p>
          <div className="cta-row">
            <Cta href="/f/struggle">Get my prayer</Cta>
            <a className="btn-line" href="#pricing">
              See what&apos;s free
            </a>
          </div>
          <ul className="checks">
            {["No card needed", "Daily prayer free forever", "Cancel in two taps"].map((t) => (
              <li key={t}>
                <CheckIcon size={15} />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="collage" aria-hidden>
          <div className="c1">
            <Scene name="dawn" />
            <div className="b">
              <h3>Handing Over the Worry</h3>
              <p>Written for you this morning</p>
              <div className="tags">
                <span className="tag">Peace</span>
                <span className="tag">2 min</span>
              </div>
            </div>
          </div>
          <div className="c2 bg-butter motif">
            <span className="eyebrow">Verse of the day</span>
            <q>“Come to me, all you who labor and are heavily burdened, and I will give you rest.”</q>
            <b style={{ fontSize: 13 }}>Matthew 11:28 · WEB</b>
          </div>
          <div className="c3 bg-lav motif">
            <span style={{ fontSize: 13, fontWeight: 800 }}>This week</span>
            <div className="big">4 of 5</div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>days prayed · no streak lost</span>
            <div className="wk">
              {[1, 1, 0, 1, 1, 0, 0].map((on, i) => (
                <i key={i} className={on ? "on" : undefined} />
              ))}
            </div>
          </div>
          <span className="c-light">
            <Light size={96} />
          </span>
          <span className="sticker">Free daily prayer, forever</span>
        </div>
      </header>

      <section className="tiles">
        <div className="tile bg-peach motif">
          <b>3</b>
          <span>public-domain Bibles: WEB, KJV, Douay-Rheims</span>
        </div>
        <div className="tile bg-butter motif">
          <b>2 min</b>
          <span>a personal prayer, every morning</span>
        </div>
        <div className="tile bg-sage motif">
          <b>0</b>
          <span>invented verses: every one comes from the Bible text</span>
        </div>
        <div className="tile dash">
          <b>$0</b>
          <span>for the Bible, daily verse and a daily prayer</span>
        </div>
      </section>

      <section className="blk" id="how">
        <div className="shead">
          <h2>Five quiet minutes, every day</h2>
          <p>Each step leads to the next, so you always know what to pray today.</p>
        </div>
        <ol className="steps">
          {[
            ["1", "bg-peach", "sky", "Tell us what's on your heart", "A two-minute quiz: your tradition, what you're carrying, when you like to pray.", "2-minute quiz"],
            ["2", "bg-butter", "dawn", "Pray with a guide", "A short prayer written for you, read aloud over a calm scene, one line at a time.", "Text + audio"],
            ["3", "bg-sage", "meadow", "Talk it through", `Ask about a passage or ask ${SITE.name} to pray for you. Save any talk as a prayer.`, "Verse-grounded"],
          ].map(([n, bg, scene, title, text, pill]) => (
            <li key={n} className="step">
              <span className={`n ${bg}`}>{n}</span>
              <Scene name={scene} />
              <h3>{title}</h3>
              <p>{text}</p>
              <span className={`pill ${bg}`}>{pill}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="blk">
        <div className="shead">
          <h2>The verses come from the Bible, not the AI</h2>
          <p>{SITE.name} can only cite verses we look up in our Bible database. Tap one and read the real text.</p>
        </div>
        <div className="trust">
          <div className="chatcard">
            <div className="who">
              <Light size={42} />
              <span>
                {SITE.name}
                <small>AI companion · not a member of the clergy</small>
              </span>
            </div>
            <div className="bub me">I can&apos;t stop worrying about my job interview tomorrow.</div>
            <div className="bub ai">
              That&apos;s a lot to carry tonight. Scripture invites us to bring exactly this to God, not to hold it alone. Would
              you like to pray about it together?
              <div className="row">
                <VerseChip verse={PHIL4} />
                <VerseChip verse={PETER5} />
              </div>
            </div>
            <p className="fine">Tap a verse to read the Bible text.</p>
          </div>
          <div className="panel bg-lav motif">
            <h3>Your tradition, your Bible, your choice</h3>
            <p>
              Catholic, Protestant, Orthodox or still exploring. Choose WEB, KJV or Douay-Rheims. Prefer no AI? Turn it off and
              keep the Bible, prayers and journal.
            </p>
            <Doodle name="dove" className="doodle" />
          </div>
        </div>
      </section>

      <section className="blk" id="library">
        <div className="shead">
          <h2>Prayers for every part of the day</h2>
          <p>Guided prayers with calm scenes and a gentle voice. Morning, evening, worry, grief, family, sleep.</p>
        </div>
        <div className="lib">
          {LIBRARY.map(([title, scene, meta], i) => (
            <Link key={title} href="/f/struggle">
              <Scene name={scene} seed={i + 2} noBigTrees />
              <div className="t">
                {title}
                <small>{meta}</small>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="blk" id="pricing">
        <div className="shead">
          <h2>See what&apos;s free before you sign up</h2>
          <p>No surprise paywall after the quiz. This is exactly what you get.</p>
        </div>
        <div className="price">
          <div className="tier free">
            <h3>
              Free <span className="pill bg-sage">Forever</span>
            </h3>
            <div className="amt">$0</div>
            <p className="note">No card needed.</p>
            <ul>
              {["Full Bible: WEB, KJV, Douay-Rheims", "Verse of the day", "One daily prayer", "Companion: 5 messages a day", "Weekly goal that forgives missed days"].map((t) => (
                <li key={t}>
                  <i>
                    <CheckIcon size={13} />
                  </i>
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/f/struggle" className="btn-line full">
              Start free
            </Link>
          </div>
          <div className="tier bg-butter motif">
            <h3>
              Premium{" "}
              <span className="pill" style={{ background: "#26301F", color: "#FAF8F1" }}>
                {SITE.prices.trialDays} days free
              </span>
            </h3>
            <div className="amt">
              {SITE.prices.yearly}
              <small> / year</small>
            </div>
            <p className="note">
              That&apos;s $5 a month, or {SITE.prices.monthly} monthly. Cancel in two taps; we email you 2 days before your trial
              ends.
            </p>
            <ul>
              {["Unlimited companion chat", "Personal daily prayer, text and audio", "Full guided prayer library", "Prayer journal and history", "7-day and 30-day prayer paths"].map((t) => (
                <li key={t}>
                  <i>
                    <CheckIcon size={13} />
                  </i>
                  {t}
                </li>
              ))}
            </ul>
            <Cta href="/f/struggle" className="full">
              Try Premium free
            </Cta>
          </div>
        </div>
      </section>

      <section className="blk faq" id="faq">
        <div className="shead">
          <h2>Questions</h2>
        </div>
        {FAQ.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>

      <section className="foot-cta">
        <Scene name="golden" />
        <div className="in">
          <h2>Your first prayer is two minutes away</h2>
          <p>Answer a few gentle questions and get a prayer written for you.</p>
          <Cta href="/f/struggle">Get my prayer</Cta>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
