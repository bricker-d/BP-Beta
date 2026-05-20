# CLAUDE.md — BioPrecision Autonomous Agent Context

> Read this file at the start of every session. It is the single source of truth for the current state of BioPrecision. Update it at the end of every session with what changed.

---

## Agent Rules

### What the agent may do without asking
- Create, edit, and delete files anywhere in `src/`, `mobile/`, `supabase/`
- Refactor components, hooks, services, stores
- Add new pages, routes, components, API routes, edge functions
- Modify Tailwind config, TypeScript config, Expo config
- Write and run migration SQL (additive only — never destructive)
- Install new npm packages
- Update this CLAUDE.md when architecture changes

### What the agent must stop and ask about
- Deleting database tables or columns
- Changing authentication flow or security model
- Modifying any file containing secrets or keys
- Changing Vercel deployment config (`vercel.json`)
- Any action that touches production data directly
- Architectural decisions that change the core data model substantially
- Any change to organization, protocol, or user-role relationships

### Decision protocol at forks
- Pick the option closest to existing patterns in the codebase
- If no pattern applies, pick the more testable and reversible option
- Leave a `// AGENT DECISION:` comment explaining the choice and proceed

### Never do
- Mock data in production paths — use real Supabase queries or leave a clear TODO
- Generate placeholder UI that obscures broken functionality
- Add dependencies without checking if the capability already exists in the stack
- Duplicate logic that already exists in a service or hook
- Write comments that describe what the code does — only write comments that explain *why*
- Surface BioPrecision branding in white-labeled organization contexts

---

## Mission

BioPrecision is a protocol delivery and outcomes tracking platform with two distinct layers.

**Consumer layer:** Individual users follow structured health protocols, generating longitudinal data on adherence and biomarker response. The experience is guided, not overwhelming — protocols surface the right action at the right time without requiring the user to understand the full system underneath.

**Enterprise layer:** Clinics, longevity practices, corporate wellness programs, and research organizations license the platform to deploy their proprietary protocols to patient or employee populations. They see aggregate outcomes data on adherence, biomarker trajectory, and protocol efficacy. BioPrecision is their infrastructure — white-labeled, invisible, powering their patient relationship.

The target individual user is the accountable minority — serious athletes, optimizing executives, patients who have chosen a clinic that takes performance medicine seriously. Every build decision serves that user, not the median.

The target enterprise customer is a longevity clinic, functional medicine practice, or corporate wellness program that has existing protocols and no good way to deliver, track, or measure them at scale.

---

## Strategic Architecture Decisions

### Protocol configuration model
Protocols are backend-configured by the BioPrecision team, not self-served by clinic administrators. Clinics submit their existing protocol documents. The team configures them in the database. No admin UI is built until five or more clinic customers are requesting the same configuration capability.

### White label model
The enterprise experience is fully white-labeled. The end user sees the clinic's brand, not BioPrecision's. BioPrecision is the infrastructure layer.

### Data as the sales loop
Every user on a protocol generates a structured outcomes dataset: adherence rate, biomarker trajectory, deviation events, outcomes at 30/60/90 days. Across a clinic's patient population this becomes aggregate efficacy data the clinic cannot get anywhere else. Instrument everything from day one.

### Beachhead
Two affiliated clinics, targeting 15–50 initial users. Define the protocol being run. Ensure data is clean and attributable at 90 days.

---

## Confirmed Architecture Decisions (2026-05-16)

| Decision | Choice | Rationale |
|---|---|---|
| Provider portal framework | **Next.js** | SSR, API routes, no CORS complexity with Supabase |
| Consumer web framework | **Vite + React** | Separate frontend, not yet built |
| Mobile | **Expo (React Native)** | Ship now. SwiftUI revisited when enterprise customers require native-grade iOS |
| Data model | **Clean spec model** | `organizations`, `profiles`, Supabase Auth + RLS. `clinics` table and HMAC session approach discarded |
| Auth | **Supabase Auth** | Email/password. Session cookie approach replaced |

**Two separate frontends, one Supabase backend:**
- `/` (provider portal) → Next.js at `bp-beta-beta.vercel.app`
- Consumer web → Vite/React (not yet built)
- Mobile → Expo in `/mobile/`

---

## Credentials & Infrastructure

| Resource | Value |
|---|---|
| GitHub repo | `bricker-d/BP-Beta` |
| Vercel project | `https://vercel.com/dan-brickers-projects/bp-beta` |
| Vercel production URL | `https://bp-beta-beta.vercel.app` |
| Anthropic API key | Set in Vercel env vars as `ANTHROPIC_API_KEY` |
| Supabase URL | `https://lrblvcixijbbfxiutgnp.supabase.co` |
| Supabase anon key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyYmx2Y2l4aWpiYmZ4aXV0Z25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTU0OTUsImV4cCI6MjA5Mjk3MTQ5NX0.WgBIwYNy16GF4_6pGP1lCURrV1AYAtvJasQlFL-r5IY` |
| Session secret | Set in Vercel env vars as `SESSION_SECRET` |
| Supabase service role key | Set in Vercel env vars as `SUPABASE_SERVICE_ROLE_KEY` — required for `/api/protocols/[id]/assign` |

---

## Stack

### Provider Portal (Web — Next.js)
- Next.js 16, TypeScript, Tailwind CSS
- Supabase JS (server-side, service role for provider API routes)
- Supabase Auth for practitioner login
- Deployed on Vercel

### Consumer Web (not yet built)
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui primitives
- Recharts for data visualization
- React Query for server state
- React Router v6
- Supabase JS client

### Mobile (Expo — primary consumer surface)
- Expo / React Native, TypeScript
- Zustand + AsyncStorage for local state
- Supabase JS client with AsyncStorage session persistence
- `mobile/lib/supabase.ts` is the single Supabase client

### Backend
- Supabase (Postgres + Auth + Edge Functions)
- Supabase Auth — email/password, JWT-based
- RLS on every new table
- Anthropic API for AI agents (called from Next.js API routes)

---

## Database Schema

### Active tables (new spec model — use these for all new code)

| Table | Purpose |
|---|---|
| `organizations` | Clinic and enterprise customers |
| `profiles` | User profiles extending `auth.users` — onboarding state, org association, role |
| `protocols_v2` | Protocol definitions owned by an org or BioPrecision default |
| `protocol_steps` | Ordered steps within a protocol |
| `user_protocols` | Assignment of a protocol to a user with status and current day |
| `outcomes_snapshots` | 30/60/90 day aggregate snapshots per user per protocol |

### Legacy tables (do not build new features on these)
`patients`, `clinics`, `protocols` (old structure), `protocol_actions`, `patient_protocols`, `messages`, `lab_panels`, `daily_actions`, `daily_logs`, `chat_messages`, `wearable_connections`

### Role system
| Role | Access |
|---|---|
| `user` | Own data only |
| `org_admin` | Organization aggregate outcomes, no individual PII |
| `bp_admin` | Full platform access |

### Migration files
- `supabase/migrations/20260516_spec_data_model.sql` — Run this to create all new tables. **Dan must run this in Supabase SQL Editor.**

---

## Three-Agent Architecture (AI)

**Agent 1 — Lab Parser** (`/api/parse-labs`)
- Input: PDF or CSV lab file
- Output: Structured biomarker readings
- Model: `claude-opus-4-5` (vision for PDFs)

**Agent 2 — Recommendation Engine** (`/api/generate-actions`)
- Trigger: New reading OR daily cron
- Rule: Protocol steps take priority. Agent fills remaining slots up to 5 total.
- Every action must reference the specific biomarker targeted and evidence basis.

**Agent 3 — AI Coach** (`/api/chat`)
- Grounded in user's actual readings + active protocol context
- In white-labeled contexts: speaks as the organization's coach, never mentions BioPrecision

---

## Mobile Onboarding Flow (Expo)

| Step | Component | Collects |
|---|---|---|
| 0 | `StepAuth` | Email + password (Supabase Auth sign-up or sign-in) |
| 1 | `StepGoals` | Name, multi-goal select |
| 2 | `StepHealthFocus` | Primary focus |
| 3 | `StepBiometrics` | Age, sex, height, weight |
| 4 | `StepHabits` | Sleep, exercise, diet, stress, alcohol |
| 5 | `StepSymptoms` | Symptom multi-select |
| 6 | `StepLabs` | Upload / demo / skip |
| 7 | `StepWearables` | Device connect or skip |
| 8 | `StepSummary` | AI welcome + writes `onboarding_complete: true` to `profiles` |

**Route guard (\_layout.tsx):** Checks Supabase session + `profiles.onboarding_complete` on mount. No session → onboarding step 0. Session + incomplete → onboarding step 1 (skip auth). Session + complete → tabs.

---

## Immediate Execution Queue

### ✅ Done
- Multi-clinic auth scaffolding (discarded — replaced by Supabase Auth)
- `supabase/migrations/20260516_spec_data_model.sql` written and run
- `supabase/migrations/20260516_providers_and_seed.sql` written and run
- `mobile/lib/supabase.ts` — Supabase client for mobile
- `mobile/lib/onboarding/StepAuth.tsx` — auth step
- Mobile onboarding wired to Supabase Auth + profiles write
- Route guard uses Supabase session as source of truth
- Protocol delivery: `fetchProtocol` pulls from `user_protocols`/`protocol_steps`
- `ProtocolCard` on home tab (now split into `ProtocolProgress` + `DailyProtocolActions`)
- **Priority 3:** AI coach grounded in active protocol + steps via JWT propagation (`/api/chat`)
- **Priority 4:** `lab_readings` table + Postgres trigger → `generate-recommendations` edge function (protocol steps fill first, AI fills remaining slots up to 5). `parse-labs` persists to `lab_readings` via JWT.
- **Priority 5:** `step_completions` table. `toggleProtocolStep` persists to Supabase. `fetchProtocol` loads completion state from Supabase. `ProtocolProgress` (ring) + `DailyProtocolActions` (step list) surfaced above the fold.
- **Protocol dedup fix:** `fetchProtocol` deduplicates steps by title (guards against seed running twice) and caps at 7. Protocols tab reorganized into Morning/Afternoon/Evening sections.
- **Priority 6:** Outcomes snapshots migration + `compute_outcomes_snapshot()` function + milestone trigger + provider portal `/practitioner/outcomes` aggregate view.

### 🔴 Dan must run these migrations in Supabase SQL Editor
1. `supabase/migrations/20260517_lab_readings_completions_actions.sql`
2. After running: `SELECT vault.create_secret('<service-role-key>', 'supabase_service_role_key');` — required for the Postgres trigger to call the edge function. Get service role key from Supabase dashboard → Settings → API.
3. Deploy edge function: `supabase functions deploy generate-recommendations` (requires Supabase CLI + `ANTHROPIC_API_KEY` set in edge function secrets)
4. `supabase/migrations/20260520_outcomes_snapshots.sql` — adds unique constraint on `outcomes_snapshots`, `compute_outcomes_snapshot()` function, and milestone trigger on `user_protocols.current_day`.

### 🔴 Provider portal — protocol assignment
- Practitioner needs UI to assign a protocol to a patient (writes `user_protocols` row)
- Until this exists, auto-assignment at onboarding handles it for the default protocol

### ✅ Priority 6 — Outcomes snapshot
- `compute_outcomes_snapshot()` Postgres function: adherence_rate from step_completions, biomarker_deltas from lab_readings baseline vs latest
- Trigger fires when user_protocols.current_day reaches 30, 60, or 90
- Provider portal `/practitioner/outcomes` — aggregate adherence + biomarker delta view grouped by protocol and milestone day

### 🟢 Priority 7 — White label theming
- `WhiteLabelProvider` loads `organizations.branding` on auth
- Apply as CSS custom properties
- BioPrecision branding when `white_label_slug` is null

### 🟢 Priority 8 — Oura Ring integration (real OAuth, not stub)

---

## One-Time Setup Dan Must Do

1. **Run migration SQL:** Go to `https://app.supabase.com/project/lrblvcixijbbfxiutgnp/sql/new` → paste contents of `supabase/migrations/20260516_spec_data_model.sql` → Run
2. **Add `SESSION_SECRET` to Vercel env vars** — any long random string (e.g. `openssl rand -hex 32`)
3. **After onboarding a clinic:** `UPDATE profiles SET organization_id = '<org_id>', role = 'org_admin' WHERE id = '<practitioner_user_id>';`

---

## Tone and Standards

BioPrecision is a serious platform for serious people. Every surface — copy, UI, coach responses, error messages — reflects that. No wellness platitudes. No vague encouragement. Specific, rigorous, direct. The user is an adult who wants accurate information and precise guidance.

In white-labeled contexts, the platform speaks as the organization. BioPrecision is invisible.

The interpretation layer is the primary defensible advantage. Every recommendation must be mechanistically grounded. If evidence is weak, say so. If an intervention is well-established, cite it.

The outcomes data is the enterprise sales asset. Instrument everything. Keep it clean. At 90 days it closes the next clinic customer.

---

## Changelog

| Date | What changed |
|---|---|
| 2026-04-28 | Initial build: agents, onboarding, Supabase sync, clinician dashboard, push notifications, PDF reports |
| 2026-05-16 | Architecture decision: Next.js (provider portal) + Vite (consumer web, TBD) + Expo (mobile). Clean data model: organizations/profiles/Supabase Auth/RLS. Migration SQL written. Mobile onboarding wired to Supabase Auth. Discarded: clinics table, HMAC session cookies. AI-assisted protocol drafting added to provider portal. |
| 2026-05-17 | Priority 3: AI coach grounded in active protocol context via JWT passthrough. Priority 4: lab_readings table + Postgres trigger → generate-recommendations edge function (protocol steps first, AI fills remaining slots). Priority 5: step_completions table, toggleProtocolStep persists to Supabase, ProtocolProgress + DailyProtocolActions components on home tab. Auth token propagation pattern established — all edge function calls use Bearer JWT. |
| 2026-05-20 | Protocol dedup + cap at 7 + Protocols tab grouped by time of day. Priority 6: outcomes_snapshots migration with compute_outcomes_snapshot() + milestone trigger. Provider portal /practitioner/outcomes aggregate view added to nav. |
