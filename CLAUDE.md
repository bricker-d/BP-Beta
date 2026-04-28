# CLAUDE.md — BioPrecision Autonomous Agent Context

> Read this file at the start of every session. It is the single source of truth for the current state of BioPrecision. Update it at the end of every session with what changed.

---

## Standing Instructions

You are the autonomous engineering agent for BioPrecision. Dan Bricker is the founder. Your job is to build, debug, and ship — not to ask for permission on implementation decisions. Make the best call, document it here, push to main.

- **Push all changes directly to `main`** via the GitHub token in session
- **Never ask Dan to copy-paste code** — you write it, you push it
- **Never ask for clarification on obvious implementation details** — make a decision and note it in the changelog at the bottom of this file
- **If something is broken**, fix it before moving to new features
- **If you're unsure about product direction**, check the "Product North Star" section below before asking Dan

---

## Credentials & Infrastructure

| Resource | Value |
|---|---|
| GitHub repo | `bricker-d/BP-Beta` |
| Vercel project | `https://vercel.com/dan-brickers-projects/bp-beta` |
| Vercel preview URL | `https://bp-beta-9fdp-git-main-dan-brickers-projects.vercel.app` |
| Anthropic API key | Set in Vercel env vars as `ANTHROPIC_API_KEY` — get from Dan |
| GitHub token (rotate when expired) | Set via `git remote set-url` at session start |

**Session startup command:**
```bash
cd /home/claude/BP-Beta
git remote set-url origin https://bricker-d:GITHUB_TOKEN@github.com/bricker-d/BP-Beta.git
git pull origin main
```

---

## Product North Star

**What BioPrecision is:**
An AI health intelligence platform that takes panel biomarkers and gives users daily ranked actions to fix what's insufficient. Think WHOOP — but the input is lab panels, not wearable signals. The output is daily accountability actions tied to specific deficient biomarkers, not strain/recovery scores.

**The core loop:**
1. Patient uploads labs → Agent 1 parses every biomarker
2. Agent 2 generates 5 ranked daily actions tied to out-of-range markers
3. Patient checks off actions daily (accountability loop)
4. Agent 3 (coach) knows exactly what they're working on, answers questions with their data
5. Repeat at next lab panel → show delta

**Beachhead customer:** Frame Longevity clinic patients (Dan's own clinic). ~$45K average annual revenue per enrolled patient. Clinical use case first, then DTC.

**Differentiator vs WHOOP:** WHOOP = wearable signals → recovery scores. BioPrecision = lab biomarkers → clinical protocol actions. WHOOP has no longitudinal lab accountability loop — that's the white space.

**What "done well" looks like:**
- Lab → protocol output: something Dan would hand to a Frame Longevity patient without editing
- Daily actions: specific, mechanism-cited, effect-size quantified, tied to actual values (not generic)
- Coach: responds like a clinician who has reviewed the full chart, not a chatbot

---

## Architecture

### Stack
- **Web app:** Next.js 16, TypeScript, Tailwind, deployed on Vercel
- **Mobile app:** Expo / React Native (in `/mobile` directory)
- **AI:** Anthropic API (`claude-opus-4-5` for agents, `claude-sonnet-4-20250514` for action ranking)
- **State:** Zustand (web), Zustand + AsyncStorage (mobile)
- **Database:** None yet — all in-memory. Supabase is the planned addition.

### Directory Structure
```
BP-Beta/
├── src/                          # Next.js web app
│   ├── app/
│   │   ├── page.tsx              # Dashboard
│   │   ├── actions/page.tsx      # Daily actions (Agent 2 output)
│   │   ├── coach/page.tsx        # AI coach (Agent 3)
│   │   ├── lab-results/page.tsx  # Lab upload + biomarker view
│   │   └── api/
│   │       ├── parse-labs/       # Agent 1: lab ingestion
│   │       ├── generate-actions/ # Agent 2: daily action generation
│   │       └── chat/             # Agent 3: coach with full context
│   ├── components/
│   ├── lib/
│   │   ├── biomarkers.ts         # Reference ranges, mock data
│   │   ├── types.ts              # All TypeScript interfaces
│   │   └── utils.ts
│   └── store/useHealthStore.ts   # Web state (Zustand)
│
└── mobile/                       # Expo React Native app
    ├── app/
    │   ├── (onboarding)/index.tsx # 8-step onboarding flow
    │   └── (tabs)/               # Home, Actions, Labs, Coach
    ├── lib/
    │   ├── store.ts              # Mobile state (Zustand + AsyncStorage)
    │   ├── biomarkers.ts         # Mobile biomarker logic
    │   ├── types.ts              # Mobile TypeScript interfaces
    │   ├── DailyCheckIn.tsx      # Daily accountability component
    │   └── onboarding/           # 8 onboarding step components
    └── assets/
```

### The Three Agents

**Agent 1 — Lab Intelligence** (`src/app/api/parse-labs/route.ts`)
- Input: PDF or CSV lab file (multipart form)
- Process: Claude vision extracts all biomarkers, assigns functional medicine optimal ranges
- Output: `LabPanel` object with all biomarkers + status
- Model: `claude-opus-4-5` (vision needed for PDFs)
- Status: ✅ Built, deployed

**Agent 2 — Daily Actions** (`src/app/api/generate-actions/route.ts`)
- Input: `LabPanel`, optional `WearableData`, `goals[]`, `patientName`
- Process: Ranks candidate actions from clinical knowledge base, uses Claude to select/personalize top 5
- Output: 5 `HealthAction[]` ranked by clinical impact, specific to patient values
- Model: `claude-sonnet-4-20250514`
- Status: ✅ Built, deployed
- Trigger: Auto-fires from `useHealthStore.setLabPanel()`

**Agent 3 — Coach** (`src/app/api/chat/route.ts`)
- Input: `messages[]`, `labPanel`, `wearableData`, `intakeProfile`, `todaysActions`
- Process: Builds full clinical system prompt with patient data + today's action context
- Output: SSE streaming response
- Model: `claude-opus-4-5`
- Status: ✅ Built, deployed
- Key upgrade: Now receives `todaysActions` — knows exactly what patient is working on

---

## Onboarding Flow (Mobile, 8 Steps)

| Step | Component | Collects | Status |
|---|---|---|---|
| 0 | `StepGoals` | Name, multi-goal select | ✅ |
| 1 | `StepHealthFocus` | Primary focus (single), secondary goals | ✅ |
| 2 | `StepBiometrics` | Age, sex, height, weight | ✅ |
| 3 | `StepHabits` | Sleep, exercise, diet, stress, alcohol | ✅ |
| 4 | `StepSymptoms` | 10-symptom multi-select + free text | ✅ |
| 5 | `StepLabs` | Upload / demo / skip | ✅ |
| 6 | `StepWearables` | Device connect (Oura/WHOOP/Garmin/skip) | ✅ |
| 7 | `StepSummary` | AI intake summary using full profile | ✅ |

**Daily accountability loop** (`mobile/lib/DailyCheckIn.tsx`):
- Morning: check off yesterday's 5 actions (y/n)
- Rate sleep quality, energy, stress (1-5)
- Correlates completions to biomarker outcomes over time
- Status: ✅ Component built, not yet wired to home tab trigger

---

## Open Tasks (Priority Order)

### 🔴 Critical (blocks clinical use)
1. ~~**Wire DailyCheckIn to home tab**~~ ✅ Done 2026-04-28 — morning modal, 800ms delay, 90-day log history, skippable
2. ~~**Supabase integration**~~ ✅ Done 2026-04-28 — schema, client, patient/daily-log API routes, mobile sync, clinician dashboard at /clinician
3. **Vercel env vars** — confirm `ANTHROPIC_API_KEY` is set in Vercel dashboard. Agent 1/2/3 will fail in production without it.

### 🟡 High value (next sprint)
4. ~~**Weekly progress summary**~~ ✅ Done 2026-04-28 — /api/weekly-summary, Sunday trigger, coach tab banner, completion rates + wellbeing trends: "Here's what moved this week and what to focus on next." Triggered by cron or on app open Sunday.
5. **Real wearable API connections** — Oura and WHOOP APIs. Current data is mock. Oura has a free REST API; WHOOP requires OAuth.
6. ~~**Lab delta tracking**~~ ✅ Done 2026-04-28 — DeltaBadge on labs tab, previousValue stored, improved/worsened/stable classification

### 🟢 Good to have
7. ~~**Frame Longevity clinician view**~~ ✅ Done 2026-04-28 — /clinician page, patient_overview DB view, completion rates, check-in status
8. **Push notifications** — morning check-in reminder, evening action nudge.
9. **PDF report generation** — exportable summary Dan can hand to patients or include in chart.


---

## Supabase Setup (One-time, Dan must do)

1. Go to https://app.supabase.com → New project → name it `bioprecision`
2. SQL Editor → New Query → paste contents of `supabase/schema.sql` → Run
3. Settings → API → copy `Project URL` and `anon public` key
4. Vercel dashboard → bp-beta project → Settings → Environment Variables → add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
   - `ANTHROPIC_API_KEY` = sk-ant-... (from Dan)
5. Redeploy on Vercel (or push any commit to trigger)

Once done: patients persist across sessions, clinician dashboard at /clinician is live, daily logs sync automatically.

---

## Key Decisions Made

- **No app needed to make money** — service-first approach. Frame Longevity is paying customer, product gets validated clinically before DTC.
- **Functional medicine ranges, not lab ranges** — optimal ranges in `BIOMARKER_META` are set to functional medicine standards (e.g., glucose 70-99 not 70-125), which is Dan's clinical philosophy.
- **5 actions per day max** — deliberate constraint. More = overwhelm = no completion. Quality over quantity.
- **Mechanism + effect size required on every action** — generic actions ("eat better") are explicitly prohibited in Agent 2 prompt. Every action must cite the biological mechanism and expected effect size.
- **claude-opus-4-5 for lab parsing and coaching, sonnet for action ranking** — opus needed for PDF vision and clinical reasoning depth; sonnet is fast enough for action selection.
- **Mobile store (Zustand) generates actions locally** — mobile app has its own `generateActionsFromPanel()` in `mobile/lib/biomarkers.ts` so it works offline. Web app hits the API.

---

## Biomarker Coverage

Currently supported with full clinical context (mechanism, ranges, interventions, goal relevance):
`glucose`, `hba1c`, `totalCholesterol`, `ldl`, `hdl`, `triglycerides`, `hscrp`, `vitaminD`, `testosterone`, `cortisol`, `ferritin`, `tsh`

Agents will handle any biomarker in a lab panel but only the above have deep clinical metadata. New biomarkers should be added to `BIOMARKER_META` in `src/app/api/chat/route.ts` and `BIOMARKER_ACTIONS` in `src/app/api/generate-actions/route.ts`.

---

## Changelog

| Date | What changed |
|---|---|
| 2026-04-28 | Initial CLAUDE.md created |
| 2026-04-28 | Agent 1 (parse-labs) hardened — functional medicine ranges, all biomarkers, higher token limit |
| 2026-04-28 | Agent 2 (generate-actions) built from scratch — full clinical knowledge base, wearable signals, Claude ranking |
| 2026-04-28 | Agent 3 (chat) upgraded — receives `todaysActions` context, knows what patient is working on |
| 2026-04-28 | Store upgraded — `setLabPanel` auto-triggers Agent 2, `isGeneratingActions` loading state |
| 2026-04-28 | Onboarding expanded to 8 steps — `StepHealthFocus`, `StepHabits` added |
| 2026-04-28 | `DailyCheckIn` component built — action completion log + sleep/energy/stress ratings |
| 2026-04-28 | `IntakeProfile` updated — `primaryFocus`, `habits`, `DailyLog` types added |
| 2026-04-28 | DailyCheckIn wired to home tab — morning modal, `needsCheckIn()`, `submitDailyLog()`, 90-day log |
| 2026-04-28 | Supabase integration — schema, client, API routes, mobile sync, clinician dashboard |
| 2026-04-28 | Task 3 (Vercel env vars) — instructions added to CLAUDE.md, requires Dan to action |
| 2026-04-28 | Weekly summary agent — /api/weekly-summary, Sunday trigger, coach tab banner |
| 2026-04-28 | Lab delta tracking — DeltaBadge, previousLabPanel, improved/worsened/stable |
