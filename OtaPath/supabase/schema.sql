-- ============================================================================
-- OtaPath — complete Supabase setup (schema + auth + demo seed), ONE FILE.
--
-- How to run:
--   1. Create a project at https://supabase.com/dashboard
--   2. SQL Editor → New query → paste this entire file → Run.
--      Safe to re-run: tables use IF NOT EXISTS, seeds use ON CONFLICT.
--   3. Copy Settings → API keys into .env.local (see .env.local.example).
--
-- Demo accounts created below (all e-mail confirmed, password shown here):
--   clinician  lindqvist@otapath.app / clinic-demo-2024
--   patients   matti@otapath.app  / demo1234   (the live demo patient)
--              eero@otapath.app   / demo1234
--              sofia@otapath.app  / demo1234
--              aino@otapath.app   / demo1234
--              vilho@otapath.app  / demo1234
--
-- Security model: every clinical table has RLS enabled with an explicit
-- DENY for `anon` and `authenticated` roles. All app data flows through
-- Next.js API routes using the service-role key, which bypasses RLS —
-- the browser-side anon key is used ONLY for patient sign-in.
-- Patients cannot self-register: accounts are created by the clinician
-- (dashboard → "+ Patient" → the API calls auth.admin.createUser).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- tables (column names mirror the app models; JSON payloads stay TEXT)
-- ---------------------------------------------------------------------------

create table if not exists public.patients (
  id                       text primary key,
  name                     text not null,
  initials                 text not null,
  note                     text not null default '',
  hue                      text not null default 'solar',
  "pairingCode"            text,
  -- link to the Supabase Auth account the clinician created for them
  auth_user_id             uuid unique references auth.users(id) on delete set null,
  "authEmail"              text,
  "tmsCompletionDate"      bigint not null,
  "currentEnergyState"     text not null default 'LOW',
  "triageStatus"           text not null default 'STABLE',
  "baselineMetrics"        text not null default '{}',
  "activeClinicianOverride" text not null default '{}',
  "contextFlag"            text not null default 'auto',
  "iafHz"                  double precision not null default 10,
  "preferredMusicStyle"    text not null default 'piano',
  "soundscapeUrl"          text,
  "updatedAt"              bigint not null
);

create table if not exists public.memory_capsules (
  id                text primary key,
  "patientId"       text not null references public.patients(id) on delete cascade,
  lat               double precision not null,
  lng               double precision not null,
  "locationName"    text not null,
  "poiType"         text not null default 'moment',
  kind              text not null default 'moment',
  "photoUrl"        text,
  "audioUrl"        text,
  "audioDurS"       double precision,
  transcript        text,
  "acousticScore"   double precision,
  "savoringScore"   double precision,
  "luminanceScore"  double precision,
  "vibrancyScore"   double precision,
  valence           double precision,
  themes            text,
  "soundscapePrompt" text,
  palette           text,
  "f0Hz"            double precision,
  "f0SdHz"          double precision,
  "acousticDelta"   double precision,
  "soundscapeUrl"   text,
  "musicStyle"      text,
  "createdAt"       bigint not null,
  "echoedAt"        bigint,
  "isDimmed"        integer not null default 0
);
create index if not exists idx_mem_patient on public.memory_capsules("patientId", "createdAt");

create table if not exists public.missions (
  id             text primary key,
  "patientId"    text not null references public.patients(id) on delete cascade,
  title          text not null,
  "photoPrompt"  text,
  "voicePrompt"  text,
  "poiName"      text not null,
  "poiCategory"  text not null default 'nature',
  lat            double precision not null,
  lng            double precision not null,
  "difficultyTier" text not null default 'nature',
  "assignedBy"   text not null default 'AI_CLOSED_LOOP',
  "clinicianNote" text,
  "doctorName"   text,
  "audioPairing" text,
  status         text not null default 'ACTIVE',
  "createdAt"    bigint not null,
  "completedAt"  bigint
);
create index if not exists idx_mission_patient on public.missions("patientId", status, "createdAt");

create table if not exists public.clinician_nudges (
  id            text primary key,
  "patientId"   text not null references public.patients(id) on delete cascade,
  "doctorName"  text not null,
  message       text not null,
  "createdAt"   bigint not null,
  acknowledged  integer not null default 0
);

create table if not exists public.biometric_logs (
  id                    text primary key,
  "patientId"           text not null references public.patients(id) on delete cascade,
  date                  text not null,
  at                    bigint not null,
  "vocalEnergy"         double precision not null,
  "pitchVariance"       double precision not null default 0,
  "savoringScore"       double precision not null,
  "mobilityRadiusMeters" double precision not null,
  hrv                   double precision not null,
  "sleepRegularity"     double precision not null,
  luminance             double precision not null default 0,
  unique("patientId", date)
);
create index if not exists idx_bio_patient on public.biometric_logs("patientId", date);

create table if not exists public.bandit_arms (
  "patientId"  text not null references public.patients(id) on delete cascade,
  arm        text not null,
  weight     double precision not null default 0,
  pulls      integer not null default 0,
  "rewardSum"  double precision not null default 0,
  "updatedAt"  bigint not null,
  primary key ("patientId", arm)
);

-- ---------------------------------------------------------------------------
-- Row Level Security — clinical data is server-side only.
-- Service role (used by the API routes) bypasses RLS entirely.
-- ---------------------------------------------------------------------------

alter table public.patients          enable row level security;
alter table public.memory_capsules   enable row level security;
alter table public.missions          enable row level security;
alter table public.clinician_nudges  enable row level security;
alter table public.biometric_logs    enable row level security;
alter table public.bandit_arms       enable row level security;

do $$
declare t text;
begin
  foreach t in array array['patients','memory_capsules','missions',
                          'clinician_nudges','biometric_logs','bandit_arms']
  loop
    execute format(
      'drop policy if exists deny_anon on public.%I;
       create policy deny_anon on public.%I for all to anon using (false) with check (false);
       drop policy if exists deny_auth on public.%I;
       create policy deny_auth on public.%I for all to authenticated using (false) with check (false);',
      t, t, t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- auth users — clinician + the five demo patients (e-mail pre-confirmed).
-- Passwords are bcrypt-hashed at insert time via pgcrypto; plaintext lives
-- ONLY in this file's header comment for the demo — never in the DB.
-- ---------------------------------------------------------------------------

do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('aa000000-0000-4000-8000-000000000001', 'lindqvist@otapath.app', 'clinic-demo-2024'),
      ('aa000000-0000-4000-8000-000000000002', 'matti@otapath.app',     'demo1234'),
      ('aa000000-0000-4000-8000-000000000003', 'eero@otapath.app',      'demo1234'),
      ('aa000000-0000-4000-8000-000000000004', 'sofia@otapath.app',     'demo1234'),
      ('aa000000-0000-4000-8000-000000000005', 'aino@otapath.app',      'demo1234'),
      ('aa000000-0000-4000-8000-000000000006', 'vilho@otapath.app',     'demo1234')
    ) as t(id, email, pw)
  loop
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, recovery_sent_at, last_sign_in_at,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token,
      raw_app_meta_data, raw_user_meta_data
    ) values (
      u.id::uuid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      u.email,
      crypt(u.pw, gen_salt('bf')),
      now(), now(), now(), now(), now(),
      '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb
    )
    on conflict do nothing;

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), u.id::uuid, u.id,
      jsonb_build_object('sub', u.id, 'email', u.email),
      'email', now(), now(), now()
    )
    on conflict (provider_id, provider) do nothing;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- patient records — the 5-person TMS caseload, linked to their auth users.
-- tmsCompletionDate = now − postTmsDay days (epoch ms, same as the app).
-- ---------------------------------------------------------------------------

insert into public.patients (
  id, name, initials, note, hue, "pairingCode", auth_user_id, "authEmail",
  "tmsCompletionDate", "currentEnergyState", "triageStatus",
  "baselineMetrics", "activeClinicianOverride", "contextFlag", "iafHz",
  "preferredMusicStyle", "updatedAt"
)
select
  v.id, v.name, v.initials, v.note, v.hue, v.code, v.uid::uuid, v.email,
  (extract(epoch from now()) * 1000)::bigint - v.day::bigint * 86400000,
  'LOW', v.triage,
  v.baseline::text,
  '{"autonomy":"standard","relapseSensitivity":"standard","doctorName":"Dr. Lindqvist"}',
  'auto', 10, 'piano',
  (extract(epoch from now()) * 1000)::bigint
from (values
  -- id, name, initials, note, hue, pair code, auth uid, email, postTmsDay, triage, baseline JSON
  ('matti','Matti Virtanen','MV','rTMS · DLPFC protocol','solar','OTA-4815',
   'aa000000-0000-4000-8000-000000000002','matti@otapath.app',18,'DRIFT',
   '{"prosody":46,"savoring":55,"mobility":527,"hrv":38,"luminance":49,"sleep":60}'),
  ('eero','Eero Niemi','EN','iTBS · week 2','tangerine','OTA-2274',
   'aa000000-0000-4000-8000-000000000003','eero@otapath.app',11,'INTERVENTION',
   '{"prosody":55,"savoring":63,"mobility":753,"hrv":44,"luminance":57,"sleep":61}'),
  ('sofia','Sofia Ranta','SR','rTMS · week 2','blush','OTA-9032',
   'aa000000-0000-4000-8000-000000000004','sofia@otapath.app',9,'DRIFT',
   '{"prosody":53,"savoring":62,"mobility":700,"hrv":42,"luminance":55,"sleep":60}'),
  ('aino','Aino Laine','AL','rTMS · maintenance','forest','OTA-5546',
   'aa000000-0000-4000-8000-000000000005','aino@otapath.app',24,'STABLE',
   '{"prosody":47,"savoring":54,"mobility":543,"hrv":39,"luminance":49,"sleep":57}'),
  ('vilho','Vilho Kettunen','VK','rTMS · maintenance','cobalt','OTA-7729',
   'aa000000-0000-4000-8000-000000000006','vilho@otapath.app',31,'STABLE',
   '{"prosody":60,"savoring":70,"mobility":903,"hrv":46,"luminance":62,"sleep":66}')
) as v(id, name, initials, note, hue, code, uid, email, day, triage, baseline)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 14-day biometric history per patient.
-- (patient, days_ago, prosody, savoring, mobility, hrv, luminance, sleep)
-- Matti: strong recovery → plateau → current 3-day dip (the live story).
-- Eero: sharp crash → NEEDS CHECK-IN.  Sofia: gentle drift → EARLY DRIFT.
-- Aino: steady remission climb.  Vilho: flat healthy band.
-- ---------------------------------------------------------------------------

insert into public.biometric_logs (
  id, "patientId", date, at, "vocalEnergy", "pitchVariance",
  "savoringScore", "mobilityRadiusMeters", hrv, "sleepRegularity", luminance
)
select
  'bio-' || v.p || '-' || v.d::text,
  v.p,
  to_char(now() - v.d::double precision * interval '1 day', 'YYYY-MM-DD'),
  (extract(epoch from now()) * 1000)::bigint - v.d::bigint * 86400000,
  v.prosody, v.prosody, v.savoring, v.mobility, v.hrv, v.sleep, v.luminance
from (values
  ('matti',13,41,48,420,36,44,58),('matti',12,46,55,520,38,48,60),
  ('matti',11,51,62,640,41,54,62),('matti',10,54,66,710,42,57,63),
  ('matti',9,57,71,790,44,60,65),('matti',8,59,74,830,45,62,66),
  ('matti',7,60,76,880,45,62,67),('matti',6,58,74,860,44,61,66),
  ('matti',5,61,78,940,45,64,68),('matti',4,57,72,720,43,60,64),
  ('matti',3,52,63,480,40,55,58),('matti',2,47,52,310,38,49,55),
  ('matti',1,44,45,210,36,46,52),('matti',0,43,41,140,35,44,50),
  ('eero',13,52,60,700,43,55,60),('eero',12,55,64,760,44,57,61),
  ('eero',11,57,66,800,44,58,62),('eero',10,58,68,840,45,59,62),
  ('eero',9,56,66,780,44,57,61),('eero',8,54,63,700,43,55,60),
  ('eero',7,52,60,620,42,52,58),('eero',6,48,54,480,40,48,55),
  ('eero',5,43,46,340,37,44,51),('eero',4,38,39,240,34,40,48),
  ('eero',3,33,33,170,31,36,45),('eero',2,30,28,120,29,33,43),
  ('eero',1,27,24,90,27,30,41),('eero',0,25,21,70,26,28,40),
  ('sofia',13,50,58,640,41,52,59),('sofia',12,53,62,700,42,55,60),
  ('sofia',11,56,66,760,43,58,61),('sofia',10,58,70,820,44,60,63),
  ('sofia',9,60,72,860,45,62,64),('sofia',8,61,74,880,46,63,65),
  ('sofia',7,60,73,850,45,62,64),('sofia',6,58,70,790,44,60,63),
  ('sofia',5,56,66,690,43,57,61),('sofia',4,53,61,560,41,54,59),
  ('sofia',3,50,55,420,41,50,57),('sofia',2,48,50,330,40,47,55),
  ('sofia',1,46,46,260,39,45,53),('sofia',0,45,44,230,39,44,52),
  ('aino',13,44,50,480,37,46,55),('aino',12,47,54,540,39,49,57),
  ('aino',11,51,58,610,41,52,59),('aino',10,55,63,700,43,56,61),
  ('aino',9,58,68,780,45,59,63),('aino',8,61,72,860,46,62,65),
  ('aino',7,63,76,940,47,64,66),('aino',6,64,78,980,48,65,67),
  ('aino',5,66,80,1050,49,67,68),('aino',4,67,82,1120,50,68,69),
  ('aino',3,68,83,1180,50,69,70),('aino',2,69,84,1240,51,70,70),
  ('aino',1,70,85,1300,52,71,71),('aino',0,71,86,1360,52,72,72),
  ('vilho',13,60,70,900,46,62,66),('vilho',12,62,72,940,47,63,67),
  ('vilho',11,59,69,870,45,61,65),('vilho',10,61,71,920,46,62,66),
  ('vilho',9,63,73,960,47,64,67),('vilho',8,62,72,930,46,63,66),
  ('vilho',7,61,71,910,46,62,66),('vilho',6,63,74,980,47,64,68),
  ('vilho',5,64,75,1020,48,65,68),('vilho',4,62,73,950,47,63,67),
  ('vilho',3,61,72,900,46,62,66),('vilho',2,63,74,970,47,64,68),
  ('vilho',1,64,75,1010,48,65,69),('vilho',0,63,74,990,47,64,68)
) as v(p, d, prosody, savoring, mobility, hrv, luminance, sleep)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Matti's three illustrated memory capsules (echo story arc):
-- today @ park, 3d @ sports court, 7d5h @ cinema (frosted Echo pin).
-- Photos are flat warm SVG data-URLs — offline-safe, papery art direction.
-- ---------------------------------------------------------------------------

insert into public.memory_capsules (
  id, "patientId", lat, lng, "locationName", "poiType", kind,
  "photoUrl", transcript, "acousticScore", "savoringScore", "luminanceScore",
  "vibrancyScore", valence, themes, "soundscapePrompt", "createdAt"
)
select
  v.id, 'matti', v.lat, v.lng, v.poi, v.tier, 'photo',
  v.photo, v.transcript, v.acoustic, v.savoring, v.lum, v.vib, v.valence,
  v.themes, v.soundscape,
  (extract(epoch from now()) * 1000)::bigint - v.ago_ms
from (values
  ('mem-seed-park', 60.186691158426456, 24.828023055636052,
   'the green corner nearby', 'nature',
   'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%3E%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23FBE8A6%22%2F%3E%3Ccircle%20cx%3D%2270%22%20cy%3D%2260%22%20r%3D%2234%22%20fill%3D%22%23FFCE32%22%2F%3E%3Cg%20fill%3D%22%23FF6B2B%22%3E%3Crect%20x%3D%2238%22%20y%3D%2228%22%20width%3D%226%22%20height%3D%2214%22%20rx%3D%223%22%2F%3E%3Crect%20x%3D%2296%22%20y%3D%2228%22%20width%3D%226%22%20height%3D%2214%22%20rx%3D%223%22%2F%3E%3Crect%20x%3D%2228%22%20y%3D%2256%22%20width%3D%2214%22%20height%3D%226%22%20rx%3D%223%22%2F%3E%3Crect%20x%3D%2298%22%20y%3D%2256%22%20width%3D%2214%22%20height%3D%226%22%20rx%3D%223%22%2F%3E%3C%2Fg%3E%3Cpath%20d%3D%22M0%20160%20Q80%20120%20160%20150%20T320%20140%20V240%20H0%20Z%22%20fill%3D%22%231E8E5A%22%2F%3E%3Cpath%20d%3D%22M0%20190%20Q90%20155%20180%20185%20T320%20175%20V240%20H0%20Z%22%20fill%3D%22%23156e46%22%2F%3E%3Crect%20x%3D%22205%22%20y%3D%22120%22%20width%3D%228%22%20height%3D%2260%22%20rx%3D%224%22%20fill%3D%22%238a5a2b%22%2F%3E%3Cellipse%20cx%3D%22209%22%20cy%3D%22112%22%20rx%3D%2230%22%20ry%3D%2224%22%20fill%3D%22%231E8E5A%22%2F%3E%3Cellipse%20cx%3D%22226%22%20cy%3D%22100%22%20rx%3D%2218%22%20ry%3D%2214%22%20fill%3D%22%232ba86e%22%2F%3E%3Cg%20fill%3D%22%23F472B6%22%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%22205%22%20r%3D%225%22%2F%3E%3Ccircle%20cx%3D%2295%22%20cy%3D%22215%22%20r%3D%224%22%2F%3E%3Ccircle%20cx%3D%22140%22%20cy%3D%22208%22%20r%3D%225%22%2F%3E%3C%2Fg%3E%3Cg%20fill%3D%22%23FDF8EE%22%3E%3Cellipse%20cx%3D%22230%22%20cy%3D%2250%22%20rx%3D%2222%22%20ry%3D%2210%22%2F%3E%3Cellipse%20cx%3D%22252%22%20cy%3D%2244%22%20rx%3D%2216%22%20ry%3D%228%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
   'the way the low sun caught the birch leaves — everything was gold and green and the air smelled like rain',
   63, 88, 74, 82, 0.6, '["nature","light","color"]',
   'Warm and uplifting ambient piece — soft piano with distant birdsong and a light park breeze, ~76 BPM',
   2 * 3600000),
  ('mem-seed-sport', 60.18084997289725, 24.829702203112845,
   'the neighborhood sports court', 'sport',
   'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%3E%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%23FF6B2B%22%2F%3E%3Cpath%20d%3D%22M0%20200%20Q160%20170%20320%20195%20V240%20H0%20Z%22%20fill%3D%22%23d84f14%22%2F%3E%3Ccircle%20cx%3D%22160%22%20cy%3D%2270%22%20r%3D%2230%22%20fill%3D%22%23FDF8EE%22%2F%3E%3Ccircle%20cx%3D%22160%22%20cy%3D%2270%22%20r%3D%2230%22%20fill%3D%22none%22%20stroke%3D%22%23FFCE32%22%20stroke-width%3D%226%22%20stroke-dasharray%3D%2210%208%22%2F%3E%3Cg%20fill%3D%22%23FFCE32%22%3E%3Cpath%20d%3D%22M60%20120%20l14%20-34%20h-16%20l14%20-26%20-20%2036%20h16%20Z%22%2F%3E%3Cpath%20d%3D%22M250%20130%20l12%20-30%20h-14%20l12%20-24%20-18%2032%20h14%20Z%22%2F%3E%3C%2Fg%3E%3Crect%20x%3D%22120%22%20y%3D%22180%22%20width%3D%2280%22%20height%3D%2210%22%20rx%3D%225%22%20fill%3D%22%231C1917%22%20opacity%3D%220.15%22%2F%3E%3Cg%20fill%3D%22%23FDF8EE%22%3E%3Ccircle%20cx%3D%2280%22%20cy%3D%22205%22%20r%3D%224%22%2F%3E%3Ccircle%20cx%3D%22240%22%20cy%3D%22212%22%20r%3D%224%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
   'someone''s serve froze mid-air for a second — pure energy, the squeak of shoes and everyone laughing',
   71, 79, 68, 90, 0.5, '["movement","energy"]',
   'Upbeat playful piece — marimba pulses, brushed drums and a springy bass line, ~92 BPM',
   3 * 86400000::bigint),
  ('mem-seed-cinema', 60.18662180623969, 24.81207055514161,
   'the little cinema on the corner', 'culture',
   'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20320%20240%22%3E%3Crect%20width%3D%22320%22%20height%3D%22240%22%20fill%3D%22%231d3fae%22%2F%3E%3Crect%20x%3D%2252%22%20y%3D%2240%22%20width%3D%2280%22%20height%3D%22120%22%20rx%3D%228%22%20fill%3D%22%23F472B6%22%20transform%3D%22rotate(-4%2092%20100)%22%2F%3E%3Crect%20x%3D%22150%22%20y%3D%2230%22%20width%3D%2290%22%20height%3D%22130%22%20rx%3D%228%22%20fill%3D%22%23FDF8EE%22%20transform%3D%22rotate(3%20195%2095)%22%2F%3E%3Cpath%20d%3D%22M195%2055%20l7%2014%2015%202%20-11%2010%203%2015%20-14%20-8%20-14%208%203%20-15%20-11%20-10%2015%20-2%20Z%22%20fill%3D%22%232563EB%22%2F%3E%3Crect%20x%3D%2260%22%20y%3D%22130%22%20width%3D%2262%22%20height%3D%228%22%20rx%3D%224%22%20fill%3D%22%23FDF8EE%22%20opacity%3D%220.85%22%20transform%3D%22rotate(-4%2091%20134)%22%2F%3E%3Crect%20x%3D%22165%22%20y%3D%22140%22%20width%3D%2266%22%20height%3D%228%22%20rx%3D%224%22%20fill%3D%22%23F472B6%22%20transform%3D%22rotate(3%20198%20144)%22%2F%3E%3Cpath%20d%3D%22M0%20190%20Q160%20175%20320%20190%20V240%20H0%20Z%22%20fill%3D%22%231C1917%22%2F%3E%3Cg%20fill%3D%22%23FFCE32%22%3E%3Ccircle%20cx%3D%2240%22%20cy%3D%22200%22%20r%3D%224%22%2F%3E%3Ccircle%20cx%3D%2270%22%20cy%3D%22202%22%20r%3D%224%22%2F%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%22203%22%20r%3D%224%22%2F%3E%3Ccircle%20cx%3D%22130%22%20cy%3D%22204%22%20r%3D%224%22%2F%3E%3Ccircle%20cx%3D%22160%22%20cy%3D%22205%22%20r%3D%224%22%2F%3E%3Ccircle%20cx%3D%22190%22%20cy%3D%22204%22%20r%3D%224%22%2F%3E%3Ccircle%20cx%3D%22220%22%20cy%3D%22203%22%20r%3D%224%22%2F%3E%3Ccircle%20cx%3D%22250%22%20cy%3D%22202%22%20r%3D%224%22%2F%3E%3Ccircle%20cx%3D%22280%22%20cy%3D%22200%22%20r%3D%224%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
   'a faded teal and pink poster for a film I''d never heard of — couldn''t stop staring at the little lights under the marquee',
   58, 84, 46, 77, 0.4, '["cinema","color","light"]',
   'Nostalgic hushed piece — reverb-soaked piano, warm tape hiss and distant marquee hum, ~64 BPM',
   7 * 86400000::bigint + 5 * 3600000)
) as v(id, lat, lng, poi, tier, photo, transcript, acoustic, savoring, lum, vib, valence, themes, soundscape, ago_ms)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- missions — Matti opens the app to a gentle prescribed quest (the loop's
-- "prescribe → patient" beat); Eero + Sofia show a realistic ledger.
-- ---------------------------------------------------------------------------

insert into public.missions (
  id, "patientId", title, "photoPrompt", "voicePrompt", "poiName", "poiCategory",
  lat, lng, "difficultyTier", "assignedBy", "clinicianNote", "doctorName",
  status, "createdAt", "completedAt"
)
select
  v.id, v.patientId, v.title, v.photo, v.voice, v.poi, v.tier,
  v.lat, v.lng, v.tier, v.by, v.note, v.doc, v.status,
  (extract(epoch from now()) * 1000)::bigint - v.created_ago,
  case when v.status = 'COMPLETED'
       then (extract(epoch from now()) * 1000)::bigint - v.done_ago
       else null end
from (values
  ('msn-seed-matti-quest','matti',
   'Walk to the green corner and sit with the trees for a moment',
   'find one detail of light you like',
   'say what it felt like to be outside',
   'the green corner nearby','nature',60.186691158426456,24.828023055636052,
   'CLINICIAN_CUSTOM','first gentle outdoor re-entry — keep it under 15 minutes',
   'Dr. Lindqvist','ACTIVE',10 * 3600000::bigint,0::bigint),
  ('msn-seed-matti-cinema','matti',
   'Follow the painted arrows to the little cinema',
   null,null,'the little cinema on the corner','culture',
   60.18662180623969,24.81207055514161,
   'AI_CLOSED_LOOP',null,null,'COMPLETED',
   7 * 86400000::bigint + 6 * 3600000, 7 * 86400000::bigint + 5 * 3600000),
  ('msn-seed-eero-park','eero',
   'A slow lap around the park pond',
   null,null,'the park pond','nature',60.1855,24.8270,
   'AI_CLOSED_LOOP',null,null,'COMPLETED',2 * 86400000::bigint,1 * 86400000::bigint),
  ('msn-seed-eero-bench','eero',
   'Sit on the bench by the birch trees — ten minutes is enough',
   'one small thing that catches your eye',
   'how the air feels today',
   'the bench by the birches','nature',60.1842,24.8261,
   'CLINICIAN_CUSTOM','keep it tiny — he is in a dip',
   'Dr. Lindqvist','ACTIVE',20 * 3600000::bigint,0::bigint),
  ('msn-seed-sofia-cafe','sofia',
   'A short stroll to the corner café window',
   null,null,'the corner café','culture',60.1860,24.8230,
   'AI_CLOSED_LOOP',null,null,'COMPLETED',4 * 86400000::bigint,3 * 86400000::bigint)
) as v(id, patientId, title, photo, voice, poi, tier, lat, lng, by, note, doc,
       status, created_ago, done_ago)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- nudges — warm check-ins; the fresh one for Matti lands on his phone as the
-- first "the loop reaches the patient" moment; Eero's matches his dip.
-- ---------------------------------------------------------------------------

insert into public.clinician_nudges (id, "patientId", "doctorName", message, "createdAt", acknowledged)
select
  v.id, v.patientId, 'Dr. Lindqvist', v.msg,
  (extract(epoch from now()) * 1000)::bigint - v.ago, v.ack
from (values
  ('nud-seed-matti-welcome','matti',
   'Welcome home, Matti. No pressure this week — we''re just glad you''re here.',
   6 * 86400000::bigint, 1),
  ('nud-seed-matti-quest','matti',
   'Great first week home — when you feel ready, there''s a small quest waiting for you outside.',
   2 * 3600000::bigint, 0),
  ('nud-seed-eero-checkin','eero',
   'Eero, the last few days looked quiet — a tiny step outside counts just as much as a big one. We''re here.',
   8 * 3600000::bigint, 0),
  ('nud-seed-aino-keep','aino',
   'Beautiful consistency, Aino — the walks are clearly doing their work.',
   2 * 86400000::bigint, 1)
) as v(id, patientId, msg, ago, ack)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- bandit arms — the contextual bandit's learned weights (demo values shown
-- on the clinician "learning insight" + the patient's "best lift" badge).
-- m-* arms are music-style lifts; the rest are mission-tier lifts.
-- ---------------------------------------------------------------------------

insert into public.bandit_arms ("patientId", arm, weight, pulls, "rewardSum", "updatedAt")
select
  v.patientId, v.arm, v.weight, v.pulls, v.rewardSum,
  (extract(epoch from now()) * 1000)::bigint
from (values
  ('matti','nature',0.31,9,2.8),('matti','culture',0.18,7,1.3),
  ('matti','sport',0.07,4,0.3),('matti','alpha',0.12,6,0.7),
  ('matti','theta',-0.04,3,-0.1),
  ('matti','m-lofi',0.19,5,0.9),('matti','m-piano',0.11,5,0.6),
  ('matti','m-lively',0.05,3,0.2),('matti','m-nature',0.02,2,0.0),
  ('eero','nature',0.08,5,0.4),('eero','culture',-0.06,4,-0.2),
  ('sofia','culture',0.14,6,0.8),('sofia','nature',0.05,5,0.2),
  ('aino','sport',0.22,8,1.8),('aino','nature',0.19,7,1.4),
  ('vilho','nature',0.16,9,1.5),('vilho','culture',0.12,6,0.7)
) as v(patientId, arm, weight, pulls, rewardSum)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- storage — public bucket for ElevenLabs-generated capsule music.
-- /api/generate-soundscape uploads here (service role); the public CDN URL
-- is stored on memory_capsules.soundscapeUrl and played straight in the app.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('capsule-audio', 'capsule-audio', true)
on conflict (id) do nothing;

-- done — the caseload, the live patient's story, and all logins are seeded.
