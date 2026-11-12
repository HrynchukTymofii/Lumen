import Link from "next/link";
import { Light, MascotPill, Scene } from "@/components/kit";
import { FREE_FEATURES, PREMIUM_FEATURES } from "@/lib/plans";
import { ADDON, FUNNEL_PLANS, usd } from "@/lib/funnel-plans";
import { SITE } from "@/lib/site";
import { ChoiceChips } from "./_components/choice-chips";
import { ChatDemo, type Talk } from "./_components/chat-demo";
import { SiteFooter, SiteNav } from "./_components/chrome";
import type { Verse } from "./_components/verse-chip";

// Landing page, "Style exploration B · Expressive type" (Figma: Bible-Companion, node 31:1649), light and dark warm.
// The Light (the mascot) acts out the words in the picture pills, answers in the chat demo and is the "o" of the wordmark.

// World English Bible (public domain)
const PHIL4: Verse = {
  ref: "Philippians 4:6–7",
  verses: [
    [6, "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God."],
    [7, "And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus."],
  ],
};
const PETER5: Verse = { ref: "1 Peter 5:7", verses: [[7, "casting all your worries on him, because he cares for you."]] };
const v = (ref: string, ...verses: [number, string][]): Verse => ({ ref, verses });

// The "Grounded in Scripture" chat cycles through these, each over its own scene. Verse text is the WEB as stored
// in our Bible database (GET /api/bible/passage).
const TALKS: (Talk & { scene: string })[] = [
  {
    scene: "night",
    me: "I can't stop worrying about my job interview tomorrow.",
    reply: "That's a lot to carry tonight. Scripture invites us to bring exactly this to God, not to hold it alone. Would you like to pray about it together?",
    verses: [PHIL4, PETER5],
  },
  {
    scene: "dusk",
    me: "My grandma passed away last week. I miss her so much.",
    reply: "I'm so sorry. Missing her this much shows how deeply you loved her, and God draws especially close to the broken-hearted. Would you like a short prayer for her and for you?",
    verses: [
      v("Psalm 34:18", [18, "Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit."]),
      v("Matthew 5:4", [4, "Blessed are those who mourn, for they shall be comforted."]),
    ],
  },
  {
    scene: "golden",
    me: "Work, kids, everything. I'm exhausted and I have nothing left.",
    reply: "That sounds so heavy. Jesus doesn't ask the weary to try harder; he invites them to come and rest. Can we take a quiet minute together?",
    verses: [
      v("Matthew 11:28", [28, "Come to me, all you who labor and are heavily burdened, and I will give you rest."]),
      v("Isaiah 40:31", [31, "but those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint."]),
    ],
  },
  {
    scene: "evening",
    me: "It's 2am and my mind won't stop racing.",
    reply: "Night thoughts always feel louder. Let's hand them to God one by one. Would you like me to pray you into rest?",
    verses: [
      v("Psalm 4:8", [8, "In peace I will both lay myself down and sleep, for you alone, Yahweh, make me live in safety."]),
      v("Isaiah 41:10", [10, "Don't you be afraid, for I am with you. Don't be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness."]),
    ],
  },
  {
    scene: "dawn",
    me: "I snapped at my son today and I feel awful.",
    reply: "That ache shows how much you love him. God's mercy is bigger than this moment, and tomorrow is a fresh start for both of you. Shall we pray about it?",
    verses: [
      v("1 John 1:9", [9, "If we confess our sins, he is faithful and righteous to forgive us the sins and to cleanse us from all unrighteousness."]),
      v("Lamentations 3:22–23", [22, "It is because of Yahweh's loving kindnesses that we are not consumed, because his mercies don't fail."], [23, "They are new every morning. Great is your faithfulness."]),
    ],
  },
  {
    scene: "sky",
    me: "I just moved to a new city and I feel completely alone.",
    reply: "Starting over is lonely, and that's okay to say. You're not unseen: God goes with you into every new place. Want to pray for this new chapter?",
    verses: [
      v("Deuteronomy 31:6", [6, "Be strong and courageous. Don't be afraid or scared of them, for Yahweh your God himself is who goes with you. He will not fail you nor forsake you."]),
      v("Psalm 139:9–10", [9, "If I take the wings of the dawn, and settle in the uttermost parts of the sea,"], [10, "even there your hand will lead me, and your right hand will hold me."]),
    ],
  },
];

const LIBRARY = [
  ["Morning Offering", "dawn", "3 min · Morning"],
  ["Peace in Worry", "lake", "4 min · Anxiety"],
  ["Psalm 23 Meditation", "meadow", "5 min · Psalms"],
  ["Evening Examen", "golden", "6 min · Evening"],
  ["Near the Broken-hearted", "dusk", "4 min · Grief"],
  ["Night Prayer", "night", "7 min · Evening"],
  ["Blessing for Home", "sky", "3 min · Family"],
  ["Rest in Safety", "evening", "8 min · Sleep"],
] as const;

// [number, verb, picture, rest of the line]: in each picture the Light acts out the line
const STEPS = [
  ["1", "Share", "share", "what's on your heart."],
  ["2", "Pray", "pray", "with a guide."],
  ["3", "Talk", "talk", "it through."],
] as const;

const CAPTIONS = [
  ["01", "Tell us what's on your heart", "A two-minute quiz: your tradition, what you're carrying and when you like to pray."],
  ["02", "Pray with a guide", "A short prayer written for you, read aloud over a calm scene, one line at a time."],
  ["03", "Talk it through", `Ask about a passage or ask ${SITE.name} to pray for you. Save any talk as a prayer.`],
] as const;

const FAQ = [
  [
    "Is it really free?",
    "Yes. The Bible, verse of the day, one daily prayer, 10 companion messages a week and your weekly goal are free forever. Premium adds 200 companion messages a week, personal prayers with audio, the full library, the journal and prayer paths.",
  ],
  [
    "Is it Catholic or Protestant?",
    `Both. You choose your tradition and ${SITE.name} respects it. Catholic users can pick the Douay-Rheims Bible, which includes the deuterocanonical books.`,
  ],
  [
    "Can the AI make things up?",
    "It can make mistakes in its own words, which is why every verse you see is loaded from the Bible text in our database, and references that don't exist are removed before you see them.",
  ],
  [
    "Is this a replacement for church?",
    `No. ${SITE.name} helps you pray day to day and encourages you to stay connected to your church, pastor or priest.`,
  ],
  [
    "What happens to my conversations?",
    "They're encrypted, never used for ads, and you can delete them, or your whole account, at any time.",
  ],
] as const;

const START = "/f/struggle";

export default function LandingPage() {
  return (
    <div className="lp hh">
      <SiteNav landing />

      <header className="lp-hero">
        <h1 className="lp-big">
          <span className="line">
            A daily <MascotPill art="daily" className="ipill" /> prayer,
          </span>
          <span className="line">
            made for you.
          </span>
        </h1>
        <p className="lp-lead">
          {SITE.name} writes a short prayer for what you&apos;re carrying and guides you through it. Every verse it mentions
          opens the real Bible text.
        </p>
        <div className="lp-ctas">
          <Link href={START} className="lp-btn">
            Get my prayer
          </Link>
          <a href="#pricing" className="lp-btn soft">
            See what&apos;s free
          </a>
        </div>
      </header>

      <section className="lp-carousel" id="library" aria-label="Guided prayers">
        {LIBRARY.map(([title, scene, meta], i) => (
          <Link key={title} href={START} className="lp-card">
            <Scene name={scene} seed={i + 2} noBigTrees />
            <span className="lbl">
              <b>{title}</b>
              <small>{meta}</small>
            </span>
          </Link>
        ))}
      </section>

      <section className="lp-how" id="how">
        <p className="lp-kicker">How it works — five quiet minutes, every day</p>
        <h2 className="lp-statement">
          {STEPS.map(([n, verb, art, rest]) => (
            <span key={n} className="line">
              <span className="n">{n}</span>
              {verb} <MascotPill art={art} className="ipill sm" /> {rest}
            </span>
          ))}
        </h2>
        <ol className="lp-captions">
          {CAPTIONS.map(([n, title, text]) => (
            <li key={n}>
              <b>
                {n}&nbsp;&nbsp;{title}
              </b>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-scripture">
        <div className="copy-card">
          <p className="lp-kicker">Grounded in Scripture</p>
          <h2>The verses come from the Bible, not the AI.</h2>
          <p className="body">
            {SITE.name} can only cite verses we look up in our Bible database. Tap one and read the real text.
          </p>
          <div className="choice">
            <h3>Your tradition, your Bible, your choice</h3>
            <ChoiceChips label="Tradition" options={["Catholic", "Protestant", "Orthodox", "Still exploring"]} initial="Protestant" />
            <ChoiceChips label="Bible" options={["KJV", "WEB", "Douay-Rheims", "No AI, just the Bible"]} initial="KJV" />
          </div>
        </div>
        <ChatDemo
          name={SITE.name}
          talks={TALKS.map(({ me, reply, verses }) => ({ me, reply, verses }))}
          scenes={TALKS.map((t, n) => <Scene key={n} name={t.scene} />)}
        />
      </section>

      <section className="lp-pricing" id="pricing">
        <p className="lp-kicker">Pricing</p>
        <h2>
          See what&apos;s free
          <br />
          before you sign up.
        </h2>
        <p className="sub">No surprise paywall after the quiz. This is exactly what you get.</p>
        <div className="plans">
          <div className="plan free">
            <div className="top">
              <h3>Free</h3>
              <span className="badge">Forever</span>
            </div>
            <div className="amt">$0</div>
            <p className="note">No card needed.</p>
            <ul>
              {FREE_FEATURES.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <Link href={START} className="lp-btn full">
              Start free
            </Link>
          </div>
          <PremiumPlan />
        </div>
      </section>

      <section className="lp-faq" id="faq">
        <div className="title">
          <h2>Questions.</h2>
          <p>
            Can&apos;t find your answer? Write to us at <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
          </p>
        </div>
        <div className="acc">
          {FAQ.map(([q, a], i) => (
            <details key={q} open={i === 0}>
              <summary>
                {q}
                <i aria-hidden />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-final">
        <h2 className="lp-big">
          <span className="line">
            Your first <MascotPill art="first" className="ipill" /> prayer
          </span>
          <span className="line">is two minutes away.</span>
        </h2>
        <p className="lp-lead">Answer a few gentle questions and get a prayer written for you.</p>
        <Link href={START} className="lp-btn">
          Get my prayer
        </Link>
      </section>

      <SiteFooter landing />
    </div>
  );
}

// Premium: the funnel's plans (lib/funnel-plans.ts). The visitor picks one at the end of the quiz, so the card shows the
// lowest way in and every plan's renewal, and sends them to the quiz.
function PremiumPlan() {
  const from = Math.min(...FUNNEL_PLANS.map((p) => p.now));
  return (
    <div className="plan premium">
      <span className="glow" aria-hidden>
        <Light size={110} label="" />
      </span>
      <div className="top">
        <h3>Premium</h3>
        <span className="badge">3 plans</span>
      </div>
      <div className="amt">
        <small className="from">from </small>
        {usd(from)}
      </div>
      <ul className="plan-opts">
        {FUNNEL_PLANS.map((p) => (
          <li key={p.id}>
            <b>{p.label}</b>
            <span>
              {usd(p.now)} {p.unit.startsWith("first") ? `for the ${p.unit}` : p.unit}, then {usd(p.then)} {p.every}
            </span>
          </li>
        ))}
      </ul>
      <ul>
        {PREMIUM_FEATURES.map((t) => (
          <li key={t}>{t}</li>
        ))}
        <li className="extra">Optional: personal audio prayers read aloud for you, {usd(ADDON.now)} add-on</li>
      </ul>
      <p className="note">You pick your plan after a short quiz. Cancel anytime.</p>
      <Link href={START} className="lp-btn full">
        Choose my plan
      </Link>
    </div>
  );
}
