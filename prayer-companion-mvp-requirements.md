# AI Prayer Companion — MVP Requirements (v0)

> Purpose of this file: a feature-level spec for Claude Code. It describes **what** to build and **how it should behave**. Claude Code should combine it with the team's existing projects (auth, project structure, web-funnel masterclass project) to produce the detailed technical spec.
>
> Deadline context: Final pitch 16.11. Build v0 fast, then iterate for ~7 days. The App Store review can take days, so the web funnel + a working app (TestFlight is acceptable for the demo) are the priority.

---

## 0. Product summary

- **What:** An AI companion for daily Christian prayer and Bible reflection. Every user gets a personal daily prayer and can talk to a companion that always answers with real Bible verses.
- **Market:** United States, English. Christian users (Catholic + Protestant), selectable denomination.
- **Positioning vs competitors:**
  - Hallow = large library of human-recorded audio. We do not compete on library size.
  - Bible Chat / Haven / Bible Path = AI chat. We win on **trust** (verses shown from our database, never invented) and **honest pricing** (free vs paid shown before signup).
- **Pains we solve (from review analysis):**
  1. "Paying for prayer" anger + price discovered only after signup → honest free/paid split shown upfront.
  2. Distrust of AI (does it match Scripture / my denomination?) → verse-grounded answers + denomination setting + AI can be turned off.
  3. Lost streaks / broken habit tracking → soft streak with weekly goal.

### Rule for every feature
Each core feature must map to a pain or hypothesis (mentor advice: untested features create questions on demo day). Anything else goes to Section 10 (backlog).

---

## 1. Brand & visual direction

- **Mascot / visual anchor: "the Light"** — a soft glowing orb of warm light. No cartoon face (at most a very subtle expression, configurable later). No halo, no wings.
  - States to animate: idle (slow breathing glow), listening (gentle pulse), speaking/praying (soft ripple), celebrating (warm bloom).
  - Name: TBD (placeholder `{{COMPANION_NAME}}`). Keep the name in config.
- **Mood:** calm, warm, modern (Calm/Headspace level of polish), not "church website". Avoid heavy crosses, stained glass, gothic fonts.
- **Colors:** dark mode default (deep navy/near-black) with warm light accents (amber, soft peach, dawn gold); light mode variant with cream/off-white backgrounds.
- **Typography:** a serif for prayers and verses; a clean sans-serif for UI.
- **Assets the team will produce:** 10–20 pre-recorded audio prayers (free tool / ElevenLabs) + simple animations of the Light.

---

## 2. System overview

```
[Ads / UTM links]
      │
      ▼
[Web funnels  /f/{funnel_slug}] ──quiz answers──► [Backend API] ◄──── [Mobile app (iOS first)]
      │  email capture → account                     │   ▲
      │  Stripe checkout                             │   │ RevenueCat (in-app purchases)
      ▼                                              │   │
[Success page + one-time login link] ───────────────►┘   │
                                                     │
                     [Postgres DB]  [LLM API (Claude / OpenAI)]  [Amplitude]  [Push service]
```

- Auth: reuse the team's existing auth setup (copy from existing project). Requirements in Section 5.
- One backend serves both web and app.
- Subscription status (entitlement) lives in **our backend**, fed by Stripe webhooks (web) and RevenueCat webhooks (app). A purchase on either side unlocks both.

---

## 3. Web funnels

### 3.1 Multiple funnels (config-driven, no builder)
- Support **several funnels** at once, each at its own URL: `/f/{funnel_slug}`.
- No visual quiz builder. Each funnel is a **config file** (JSON/TS) in the repo: steps, questions, options, copy, which plan screen, which paywall variants, order of steps.
- Funnels share the same components (question types, plan screen, email capture, paywall, checkout, success).
- Claude Code: check the team's web-funnel masterclass project for funnel best practices and patterns, and reuse them.

**Starting funnels (3), each testing a different entry angle:**

| Slug | Angle / hook | Hypothesis |
|---|---|---|
| `struggle` | "Carrying something heavy? Get a prayer for exactly that." (anxiety, grief, family, work) | Emotional need converts best |
| `habit` | "Build a daily prayer habit in 5 minutes a day." | Habit-seekers retain best |
| `scripture` | "Ask anything about the Bible — answers with real verses." | AI-curious users are cheapest to acquire |

### 3.2 Funnel steps (default order; per-funnel config can change it)

1. **Landing / first screen**
   - One-line promise + subline + the Light animation + "Start" button.
   - Small honest note: "Bible, daily verse and a daily prayer are free forever."
2. **Quiz (6–8 steps)** — question types: single choice, multi choice, slider/scale, time picker, short text (optional).
   - Common questions (adapt copy per funnel):
     - Denomination: Catholic / Protestant (Baptist, Non-denominational, Methodist, Lutheran, Other) / Orthodox / Not sure / Exploring faith.
     - What are you carrying right now? (multi): anxiety, grief, relationships, family, work/money, health, loneliness, gratitude, seeking direction.
     - How often do you pray now? never / sometimes / weekly / daily.
     - What gets in the way? forget / don't know how / no time / feel distant from God.
     - Preferred prayer time + reminder time.
     - How do you feel about AI helping with prayer? (comfortable / unsure / prefer it in background) → sets default AI visibility.
     - First name (optional).
   - Interstitial "social proof / insight" screens between questions are allowed (e.g., "Most people who pray daily start with 3 minutes").
   - Progress bar; back button; answers saved on every step.
3. **Personal plan screen**
   - "Your 7-day prayer path" generated from answers (titles per day).
   - **Live sample prayer** generated by the AI from the user's answers (short, ≤120 words, with 1–2 verse references). This is the "wow" moment.
4. **Email capture**
   - "Where should we send your prayer path?" + email field + privacy line.
   - Creates the account (see Section 5). Quiz answers are attached to it.
5. **Paywall** (A/B variants, see 3.3)
6. **Checkout:** Stripe Checkout (subscription mode). Apple Pay / Google Pay enabled in Stripe.
7. **Success page**
   - "You're in." + App Store button + **one-time login link** (Section 5.2).
   - Fallback: "Log in in the app with {email}".
   - Users who skip payment still get the free tier and the app download link.

### 3.3 Paywall variants (A/B)
- Paywall is a component with variants defined in config. Start with **2 variants**:
  - **A — "Honest split":** two columns Free vs Premium, price visible with renewal price clearly stated, annual plan preselected, 7-day trial.
  - **B — "Trial-first":** emphasis on free trial and personal plan, price and renewal still clearly stated (no hidden price — this is our positioning).
- Plans (placeholders, final prices TBD; research benchmark: competitors $40–70/year): `annual_59_99`, `monthly_9_99`. Stored in config, mapped to Stripe Price IDs and App Store product IDs.
- Assignment: random 50/50 at first paywall view, sticky per user, stored on user record + sent to Amplitude as user property `paywall_variant`.
- Experiment framework: Amplitude Experiment if available; otherwise simple server-side assignment (fallback: PostHog feature flags).

### 3.4 Free vs Premium (single source of truth, shown on paywall and in app)
| Free forever | Premium |
|---|---|
| Full Bible reading | Unlimited companion chat |
| Verse of the day | Personal daily prayer (text + audio) |
| 1 general daily prayer | Prayer journal & history |
| Companion: 5 messages/day | Full audio library (10–20 recorded prayers) |
| Soft streak | Personal 7-day / 30-day prayer paths |

### 3.5 Web technical requirements
- Mobile-first (most ad traffic is mobile). Fast load (<2s on 4G).
- UTM parameters captured on first visit and stored on the anonymous session, then copied to the user.
- Meta Pixel / Conversions API + TikTok pixel hooks (optional, behind config) for ad optimization.
- Each funnel shareable by link (pitch requirement: quiz and prototype must open via link).

---

## 4. Mobile app (iOS first; Android optional)

### 4.1 Onboarding
- **Path A — came from web:** opened via one-time login link → logged in automatically → skip quiz → short welcome with the Light → notification permission → Today screen.
- **Path B — came from App Store:** short in-app quiz (reuse funnel questions: denomination, what you're carrying, prayer time, AI comfort) → sign up (Apple / Google / email) → sample prayer → in-app paywall (RevenueCat) with close button → Today screen.
- Ask for push permission **after** the user has seen value (sample prayer), with a custom pre-prompt.

### 4.2 Screen 1 — Today
- Greeting + the Light.
- **Today's prayer** card: personal prayer generated for the user (based on profile + recent journal/chat themes), text + play button (TTS audio, Premium). Free users get one general daily prayer.
- **Verse of the day** (from DB) with share button (image card).
- **Soft streak:** weekly goal ("4 of 5 days this week"), user sets goal 3–7 days/week; missed days don't reset to zero; streak can be hidden; one "grace day" per week.
- "Mark as prayed" action (counts toward streak).
- Quick entry to companion ("Talk about today").

### 4.3 Screen 2 — Companion (chat)
- Chat with the Light.
- Every answer that references Scripture shows **verse chips** (e.g., "Philippians 4:6–7"). Tap → bottom sheet with the full verse text **from our DB** + "Read chapter".
- Quick prompts: "Pray for me", "Explain this verse", "I'm struggling with…", "Give me a verse for…", "Help me forgive".
- "Turn this into a prayer" button on a conversation → creates a saved prayer.
- Free tier: 5 messages/day, then soft paywall.
- Input: text. Voice input optional (backlog).

### 4.4 Screen 3 — Journey (profile)
- Weekly progress + streak history.
- Prayer journal: saved prayers, prayer intentions (user can mark "answered"), notes.
- Audio library (10–20 recorded prayers; locked items for free users).
- Settings: name, denomination, Bible translation, reminder time, AI companion on/off (when off: app works as Bible + recorded prayers + journal), theme, subscription management, privacy policy, terms, **delete account** (required by Apple), log out.

### 4.5 Additional app requirements
- Bible reader (simple): book → chapter → verses, from DB. Reachable from verse chips and Journey.
- Push notifications: daily reminder at chosen time; copy varies ("Your prayer for today is ready"). Max 1/day.
- Offline: cached today's prayer and verse.
- In-app purchases via RevenueCat; entitlement synced with backend (a web purchase unlocks the app and vice versa).

---

## 5. Accounts & web→app linking

### 5.1 Identity flow
1. First web visit → create `anonymous_id` (cookie/localStorage) → all quiz answers + UTMs saved under it. Amplitude uses the same anonymous device ID.
2. Email capture → create `user` (or attach to existing by email) → merge anonymous session into user. Call `identify(user_id)` in Amplitude so prior anonymous events merge into the user.
3. Payment → Stripe customer linked to `user_id` (pass `client_reference_id` / metadata).
4. App login (any method) → same `user_id` → Amplitude `setUserId(user_id)` in app → one journey from ad to first prayer.

### 5.2 One-time login link (web → app)
- After email capture/payment, backend creates a **single-use token** (expires in 24h).
- Success page button: universal link `https://{domain}/app/login?token=...`
  - App installed → opens app → exchanges token for session → logged in.
  - App not installed → goes to App Store. After install, user taps "I already have an account" → "Send me a login link" (magic link to the same email) → logged in.
- Same magic link is also emailed ("Your prayer path is ready — open in the app").
- Optional later: deferred deep linking (Branch/AppsFlyer) to skip the extra step.

### 5.3 Do NOT use device fingerprinting
- Do not identify users by phone model / browser / IP. It is unreliable (browser and app look like different devices) and Apple's privacy rules prohibit fingerprinting — risk of App Store rejection. Identity is always email/account-based.

---

## 6. AI companion

### 6.1 Models
- Main responses: a mid-size model (e.g., Claude Sonnet `claude-sonnet-5-5` or an equivalent OpenAI model). Keep provider switchable via config (team has both API keys).
- Classifier / cheap tasks: a small model (e.g., Claude Haiku `claude-haiku-5-5` or a mini OpenAI model).
- Verify current model IDs and prices in the provider docs before implementing.

### 6.2 Bible data (RAG)
- Load the full Bible into DB: `book, chapter, verse, text, translation`.
- Translations (public domain only for MVP): **World English Bible (WEB)** default, **KJV**, **Douay-Rheims** (for Catholic users). Modern copyrighted translations (NIV, ESV, NABRE) require licenses → backlog.
- Search: embeddings index per verse (and per short passage window) + keyword fallback. Optional curated topic map (anxiety, grief, forgiveness, etc. → known verses) to boost quality.
- Pipeline per message:
  1. Safety classifier (6.4).
  2. Retrieve top relevant verses for the message + conversation context.
  3. Main model answers using **only** retrieved verses for citations, returns structured output: `{ text, citations: [{book, chapter, verse_start, verse_end}] }`.
  4. Backend validates every citation exists in DB. Invalid citations are removed. Verse text in UI always comes from DB, never from the model.

### 6.3 Companion behavior (system prompt requirements)
- Role: a warm, humble prayer companion that helps the user pray and reflect on Scripture.
- Always ground guidance in Scripture with references; respect the user's denomination (e.g., Catholic: may reference saints, Rosary, Church teaching; Protestant: Scripture-centered).
- Never claim to be God, Jesus, a saint, a priest or pastor. No role-play as biblical figures. No "AI Jesus".
- Encourage real-world faith life (church, community, pastor/priest) — the companion is a help to prayer, not a replacement.
- No medical, legal, or financial advice; suggest appropriate professionals.
- On contested theological questions: explain main Christian views fairly, defer to the user's tradition and suggest talking to their pastor/priest.
- Tone: short, gentle, personal; default answers ≤150 words unless the user asks for depth.
- Memory: short profile summary (name, denomination, current struggles, prayer intentions) injected into context; user can view/delete it.

### 6.4 Safety & scope guardrails
- **Pre-check classifier** on every user message → one of: `on_topic`, `off_topic`, `jailbreak`, `crisis`, `abuse`.
  - `off_topic` (homework, coding, math, general trivia, "write my essay", testing the bot): polite redirect to faith/prayer; main model not called.
  - `jailbreak` (prompt injection, "ignore instructions", requests to reveal system prompt): fixed refusal + redirect.
  - `crisis` (suicidal thoughts, self-harm, abuse, danger): compassionate response, encourage contacting someone now, show **988 Suicide & Crisis Lifeline (call/text 988)** and emergency 911; log for review; don't paywall crisis responses.
  - `abuse` (hate, harassment, sexual content): refuse calmly.
- Post-check: output must contain no invalid citations; length limit; no prohibited claims (6.3).
- Limits: free 5 msgs/day; premium soft cap (e.g., 100 msgs/day) to control cost; rate limiting per user/IP; max input length.
- Logging: store conversations (encrypted at rest), flag classifier hits for review; never use conversations for ads.
- Disclaimer in settings and first chat: "AI companion, not a member of the clergy. It can make mistakes; verses are shown from the Bible text."

### 6.5 Daily personal prayer generation
- Generated once per day per Premium user (batch job early morning in user timezone), ≤150 words, 1–2 citations, based on profile + recent intentions.
- Audio: TTS (ElevenLabs or provider TTS) generated on demand when user taps play, cached. Track cost per user.

---

## 7. Payments & entitlements

- **Web:** Stripe Checkout (subscriptions), Stripe Customer Portal for cancel/manage. Webhooks → update `entitlements`.
- **App:** RevenueCat with App Store products. Webhooks → update `entitlements`.
- `entitlements` table is the single source of truth: `user_id, source (stripe|app_store|play), product_id, status (trial|active|grace|canceled|expired), current_period_end`.
- App checks entitlement from backend (and RevenueCat) on launch.
- Clear trial reminder email 2 days before trial ends (supports "honest pricing" positioning; track refunds/chargebacks).

---

## 8. Analytics (Amplitude)

### 8.1 Setup
- Amplitude on web and app, same project. Same `user_id` everywhere after identification. Anonymous events merged on identify.
- User properties: `funnel_slug, paywall_variant, denomination, struggles[], prayer_frequency, ai_comfort, utm_source, utm_medium, utm_campaign, utm_content, platform, plan, subscription_status`.

### 8.2 Event taxonomy (minimum)
| Event | Where | Key properties |
|---|---|---|
| `funnel_viewed` | web | funnel_slug, utm_* |
| `quiz_started` | web/app | funnel_slug |
| `quiz_step_completed` | web/app | step_id, answer |
| `quiz_completed` | web/app | funnel_slug, duration |
| `plan_viewed` | web | — |
| `sample_prayer_generated` | web/app | latency_ms |
| `email_submitted` | web | — |
| `paywall_viewed` | web/app | variant, placement |
| `plan_selected` | web/app | product_id |
| `checkout_started` | web | product_id |
| `trial_started` | web/app | product_id, source |
| `subscription_started` | backend | product_id, source, price |
| `subscription_renewed` / `subscription_canceled` / `refund_issued` | backend | product_id, source |
| `app_download_clicked` | web | — |
| `app_opened` | app | is_first_open |
| `login_link_used` | app | success |
| `onboarding_completed` | app | path (web/app_store) |
| `push_permission_result` | app | granted |
| `today_prayer_viewed` / `prayer_audio_played` / `prayer_marked_done` | app | prayer_type |
| `verse_of_day_viewed` / `verse_shared` | app | — |
| `chat_message_sent` | app | message_count_today, tier |
| `chat_message_blocked` | backend | category (off_topic/jailbreak/crisis/abuse) |
| `verse_chip_opened` | app | reference |
| `streak_goal_set` / `streak_week_completed` | app | goal |
| `ai_companion_toggled` | app | enabled |

### 8.3 Dashboards needed for the pitch
- Funnel per `funnel_slug`: viewed → quiz started → completed → email → paywall → checkout → paid.
- Paywall A vs B conversion.
- Web-to-app activation: paid on web → app opened → first prayer.
- Retention D1/D7 (core action = `prayer_marked_done` or `chat_message_sent`).
- AI cost per active user (from backend logs).
- Table export for the "table with all calculations" requirement (LTV, CAC).

---

## 9. Non-functional & compliance

- Privacy policy + terms (web + app). Explain data use, AI processing, conversation storage, deletion.
- Account deletion in app (Apple requirement). Data export on request.
- No fingerprinting; no ATT prompt needed unless cross-app tracking is added.
- App Store risk: many "Bible chat" clones exist — the app must have clear unique value and full functionality (guidelines 4.2 minimum functionality / 4.3 spam). Use TestFlight for the demo if review is slow.
- Content: public-domain Bible translations only in MVP.
- Performance: chat first token < 2s; sample prayer on web < 5s with a loading animation of the Light.
- Cost control: log tokens + TTS per user; alerts if daily spend exceeds limit.

---

## 10. Backlog — additional features (NOT in v0; each needs a hypothesis before building)

| Feature | Hypothesis to test first | How to test cheaply |
|---|---|---|
| Community challenges with participant counter (Lent, Advent, "30 days of gratitude") | Group challenges drive retention more than games (Hallow: 176k challenge participants vs 17–28k game players) | Fake-door card on Today, interview question |
| Bible games / daily quiz | Games raise retention without reducing prayer | Fake-door tile; guardrail metric = prayers per user |
| Shared prayer intentions with friends/family | Social prayer increases D30 retention | Interviews; invite-link fake door |
| Church/parish pages + parish discount | Churches are a cheap acquisition channel | Contact 10 churches, measure response rate |
| Spanish version | Spanish-speaking US Christians are underserved | Spanish funnel variant + small ad test |
| Copyrighted translations (NIV, ESV, NABRE) | Users want their usual translation | Track translation setting + interview |
| Voice chat with the companion | Voice increases engagement | Fake door; watch cost per minute |
| Sleep prayers / Bible sleep stories | Evening use adds a second daily session | 2–3 recorded pieces, track plays |
| Family plan | Households pay more | Paywall option fake door |
| Android app | Meaningful share of target users on Android | Funnel device split from analytics |

---

## 11. Demo-day checklist (acceptance criteria)

- [ ] All 3 funnels open via link and work end-to-end on mobile.
- [ ] Sample prayer generates live on the plan screen with valid verse references.
- [ ] Paywall A/B assignment works and is visible in Amplitude.
- [ ] Stripe test/live payment unlocks Premium in the app via the login link.
- [ ] App (TestFlight or App Store): Today, Companion, Journey work; verse chips open DB text.
- [ ] Off-topic message ("solve 2x+3=7", "write Python code") is redirected; jailbreak attempt refused; crisis message shows 988.
- [ ] Amplitude shows one merged journey for a test user from `funnel_viewed` to `prayer_marked_done`.
- [ ] Numbers in the pitch match the analytics dashboards and the calculations table.

---

## 12. Open questions for the team

1. Companion name and final look of the Light.
2. Final prices and trial length (7-day planned; Hallow uses 30 days — a 30-day trial won't show paid conversion within our test window).
3. iOS only, or iOS + Android for v0?
4. Which funnel gets ad budget first?
5. Stripe live mode vs test mode for the demo (live payments require business details).
