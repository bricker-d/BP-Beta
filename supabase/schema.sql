-- BioPrecision Supabase Schema
-- Run this in your Supabase SQL editor to set up the database
-- Dashboard: https://app.supabase.com → SQL Editor → New Query

-- ── Patients ──────────────────────────────────────────────────────────────────
-- One row per patient. Keyed by device ID (anonymous) or auth UID later.
create table if not exists patients (
  id            uuid primary key default gen_random_uuid(),
  device_id     text unique,              -- anonymous device fingerprint
  name          text,
  primary_focus text,
  goals         text[],
  age           int,
  biological_sex text,
  height_ft     int,
  height_in     int,
  weight_lbs    numeric,
  symptoms      text[],
  habits        jsonb,                    -- { sleepHours, exerciseDays, dietType, stressLevel, alcohol }
  wearable_source text,
  lab_data_source text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── Lab panels ────────────────────────────────────────────────────────────────
create table if not exists lab_panels (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid references patients(id) on delete cascade,
  source      text,                       -- 'Quest', 'Rupa', 'LabCorp', 'Upload', etc.
  panel_date  date default current_date,
  biomarkers  jsonb not null,             -- full Biomarker[] array
  created_at  timestamptz default now()
);

create index if not exists lab_panels_patient_idx on lab_panels(patient_id);
create index if not exists lab_panels_date_idx on lab_panels(patient_id, panel_date desc);

-- ── Daily actions ─────────────────────────────────────────────────────────────
create table if not exists daily_actions (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid references patients(id) on delete cascade,
  generated_date    date default current_date,
  lab_panel_id      uuid references lab_panels(id) on delete set null,
  actions           jsonb not null,       -- HealthAction[] array
  created_at        timestamptz default now()
);

create index if not exists daily_actions_patient_idx on daily_actions(patient_id, generated_date desc);

-- ── Daily logs ────────────────────────────────────────────────────────────────
-- One row per patient per day — their morning check-in
create table if not exists daily_logs (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid references patients(id) on delete cascade,
  log_date            date not null,
  action_completions  jsonb not null,     -- { [actionId]: boolean }
  sleep_quality       int,               -- 1–5
  energy_level        int,               -- 1–5
  stress_level        int,               -- 1–5
  created_at          timestamptz default now(),
  unique(patient_id, log_date)           -- one log per patient per day
);

create index if not exists daily_logs_patient_idx on daily_logs(patient_id, log_date desc);

-- ── Chat messages ─────────────────────────────────────────────────────────────
create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid references patients(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz default now()
);

create index if not exists chat_messages_patient_idx on chat_messages(patient_id, created_at asc);

-- ── Helper: update updated_at automatically ───────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger patients_updated_at
  before update on patients
  for each row execute function update_updated_at();

-- ── Views for clinician dashboard ─────────────────────────────────────────────
-- Quick overview of each patient for Frame Longevity clinician view
create or replace view patient_overview as
select
  p.id,
  p.name,
  p.primary_focus,
  p.goals,
  p.age,
  p.biological_sex,
  p.created_at,
  -- Latest lab panel date
  (select panel_date from lab_panels lp where lp.patient_id = p.id order by panel_date desc limit 1) as latest_panel_date,
  -- Out of range biomarker count from latest panel
  (select jsonb_array_length(lp.biomarkers) from lab_panels lp where lp.patient_id = p.id order by panel_date desc limit 1) as total_biomarkers,
  -- 7-day action completion rate
  (
    select round(
      100.0 * avg(
        (select count(*) from jsonb_each_text(dl.action_completions) where value = 'true')::numeric /
        nullif((select count(*) from jsonb_each_text(dl.action_completions)), 0)
      )
    )
    from daily_logs dl
    where dl.patient_id = p.id
    and dl.log_date >= current_date - interval '7 days'
  ) as weekly_completion_pct,
  -- Days since last check-in
  (current_date - (select log_date from daily_logs dl where dl.patient_id = p.id order by log_date desc limit 1)) as days_since_checkin
from patients p;
