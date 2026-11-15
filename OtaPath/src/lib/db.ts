/**
 * db.ts — OtaPath's persistent store, backed by Supabase Postgres.
 * All access goes through the service-role client in ./supabase.ts —
 * server-only, never import from client components.
 * The export surface mirrors the old SQLite repository exactly; every
 * function is now async (call sites `await`).
 */

import { supabaseAdmin } from "./supabase";
import { seedHistory, dischargeBaseline, type DaySnapshot } from "./biometricHistory";
import { computeTriage } from "./triage";
import { cohort, staticPatients } from "./patients";
import { buildSeedMemories } from "./seedMemories";
import { DEFAULT_CENTER } from "./geo";

export const LIVE_PATIENT_ID = "matti";

/* ------------------------------------------------------------------ */
/* row types                                                           */
/* ------------------------------------------------------------------ */

export interface PatientRow {
  id: string;
  name: string;
  initials: string;
  note: string;
  hue: string;
  pairingCode: string | null;
  /** Supabase Auth user the clinician created for this patient */
  auth_user_id?: string | null;
  authEmail?: string | null;
  tmsCompletionDate: number;
  currentEnergyState: string;
  triageStatus: string;
  baselineMetrics: string; // JSON
  activeClinicianOverride: string; // JSON
  /** "auto" | "sick" | "housebound" — patient-marked daily context */
  contextFlag: string;
  /** clinician-tuned Individual Alpha Frequency for binaural entrainment */
  iafHz: number;
  /** patient's chosen ElevenLabs vibe — lively | piano | lofi | nature */
  preferredMusicStyle: string;
  /** most recent ElevenLabs track generated for this patient (/api/audio/…) */
  soundscapeUrl: string | null;
  updatedAt: number;
  /** latest biometric-log timestamp — joined in listPatients */
  lastSignalAt?: number | null;
}

export interface MemoryRow {
  id: string;
  patientId: string;
  lat: number;
  lng: number;
  locationName: string;
  poiType: string;
  kind: string;
  photoUrl: string | null;
  audioUrl: string | null;
  audioDurS: number | null;
  transcript: string | null;
  acousticScore: number | null;
  savoringScore: number | null;
  luminanceScore: number | null;
  vibrancyScore: number | null;
  valence: number | null;
  themes: string | null; // JSON array
  soundscapePrompt: string | null;
  /** JSON array of dominant hex swatches from real pixel analysis */
  palette: string | null;
  f0Hz: number | null;
  f0SdHz: number | null;
  /** −100…+100 vs discharge baseline */
  acousticDelta: number | null;
  /** cached ElevenLabs MP3 — /api/audio/<file> served from disk */
  soundscapeUrl: string | null;
  /** which MUSIC_STYLES id generated the cached track */
  musicStyle: string | null;
  createdAt: number;
  echoedAt: number | null;
  isDimmed: number;
}

export interface MissionRow {
  id: string;
  patientId: string;
  title: string;
  photoPrompt: string | null;
  voicePrompt: string | null;
  poiName: string;
  poiCategory: string;
  lat: number;
  lng: number;
  difficultyTier: string;
  assignedBy: "AI_CLOSED_LOOP" | "CLINICIAN_CUSTOM";
  clinicianNote: string | null;
  doctorName: string | null;
  audioPairing: string | null;
  status: "ACTIVE" | "COMPLETED" | "SUPERSEDED";
  createdAt: number;
  completedAt: number | null;
}

export interface NudgeRow {
  id: string;
  patientId: string;
  doctorName: string;
  message: string;
  createdAt: number;
  acknowledged: number;
}

export interface BiometricRow {
  id: string;
  patientId: string;
  date: string;
  at: number;
  vocalEnergy: number;
  pitchVariance: number;
  savoringScore: number;
  mobilityRadiusMeters: number;
  hrv: number;
  sleepRegularity: number;
  luminance: number;
}

export interface ClinicianOverride {
  autonomy?: "gentle" | "standard" | "stretch";
  maxTier?: "nature" | "culture" | "sport";
  relapseSensitivity?: "low" | "standard" | "high";
  doctorName?: string;
  /** clinician-tuned Individual Alpha Frequency (8–12.5 Hz) */
  iafHz?: number;
}

export interface BanditArmRow {
  patientId: string;
  arm: string;
  weight: number;
  pulls: number;
  rewardSum: number;
  updatedAt: number;
}

/* ------------------------------------------------------------------ */
/* patients                                                            */
/* ------------------------------------------------------------------ */

const DAY = 86_400_000;

export async function countPatients(): Promise<number> {
  const { count } = await supabaseAdmin()
    .from("patients")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function listPatients(): Promise<PatientRow[]> {
  const sb = supabaseAdmin();
  const [{ data: patients }, { data: signals }] = await Promise.all([
    sb.from("patients").select("*"),
    sb.from("biometric_logs").select("patientId, at"),
  ]);
  // keep cohort order stable: seeded patients first (by postTmsDay
  // position in the canonical cohort list), then any enrolled patient
  const order = new Map(cohort().map((c, i) => [c.id, i]));
  const lastSignal = new Map<string, number>();
  for (const s of signals ?? []) {
    const cur = lastSignal.get(s.patientId) ?? 0;
    if (s.at > cur) lastSignal.set(s.patientId, s.at);
  }
  return ((patients ?? []) as PatientRow[])
    .map((p) => ({ ...p, lastSignalAt: lastSignal.get(p.id) ?? null }))
    .sort(
      (a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999) || a.name.localeCompare(b.name)
    );
}

export async function getPatient(id: string): Promise<PatientRow | null> {
  const { data } = await supabaseAdmin().from("patients").select("*").eq("id", id).maybeSingle();
  return (data as PatientRow) ?? null;
}

/** resolve the patient record behind a Supabase Auth user id */
export async function getPatientByAuthUser(authUserId: string): Promise<PatientRow | null> {
  const { data } = await supabaseAdmin()
    .from("patients")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  return (data as PatientRow) ?? null;
}

export function postTmsDay(p: PatientRow, now = Date.now()): number {
  return Math.max(0, Math.round((now - p.tmsCompletionDate) / DAY));
}

export async function updatePatient(
  id: string,
  patch: Partial<
    Pick<
      PatientRow,
      | "currentEnergyState"
      | "triageStatus"
      | "baselineMetrics"
      | "activeClinicianOverride"
      | "contextFlag"
      | "iafHz"
      | "preferredMusicStyle"
      | "soundscapeUrl"
      | "auth_user_id"
      | "authEmail"
      | "pairingCode"
    >
  >
): Promise<void> {
  const cur = await getPatient(id);
  if (!cur) return;
  await supabaseAdmin()
    .from("patients")
    .update({
      currentEnergyState: patch.currentEnergyState ?? cur.currentEnergyState,
      triageStatus: patch.triageStatus ?? cur.triageStatus,
      baselineMetrics: patch.baselineMetrics ?? cur.baselineMetrics,
      activeClinicianOverride: patch.activeClinicianOverride ?? cur.activeClinicianOverride,
      contextFlag: patch.contextFlag ?? cur.contextFlag,
      iafHz: patch.iafHz ?? cur.iafHz,
      preferredMusicStyle: patch.preferredMusicStyle ?? cur.preferredMusicStyle,
      soundscapeUrl:
        patch.soundscapeUrl !== undefined ? patch.soundscapeUrl : cur.soundscapeUrl,
      auth_user_id: patch.auth_user_id !== undefined ? patch.auth_user_id : cur.auth_user_id,
      authEmail: patch.authEmail !== undefined ? patch.authEmail : cur.authEmail,
      pairingCode: patch.pairingCode !== undefined ? patch.pairingCode : cur.pairingCode,
      updatedAt: Date.now(),
    })
    .eq("id", id);
}

export async function findPatientByCode(code: string): Promise<PatientRow | null> {
  const { data } = await supabaseAdmin()
    .from("patients")
    .select("*")
    .ilike("pairingCode", code.trim());
  return ((data ?? [])[0] as PatientRow) ?? null;
}

const HUES = ["blush", "forest", "cobalt", "solar", "tangerine"] as const;

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** enroll a brand-new patient record — biometrics begin once their
 *  app starts sending signals. Auth account is created separately
 *  by the clinician flow and linked via auth_user_id. */
export async function createPatient(input: {
  name: string;
  code?: string;
  note?: string;
  authUserId?: string | null;
  authEmail?: string | null;
}): Promise<PatientRow> {
  const id = `pt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const hue = HUES[Math.abs(hashCode(id)) % HUES.length];
  const now = Date.now();
  await supabaseAdmin().from("patients").insert({
    id,
    name: input.name.trim(),
    initials: initialsOf(input.name),
    note: input.note?.trim() || "newly enrolled · baseline forming",
    hue,
    pairingCode: input.code?.trim().toUpperCase() ?? null,
    auth_user_id: input.authUserId ?? null,
    authEmail: input.authEmail ?? null,
    tmsCompletionDate: now,
    currentEnergyState: "LOW",
    triageStatus: "STABLE",
    baselineMetrics: JSON.stringify(dischargeBaseline(seedHistory(now))),
    activeClinicianOverride: JSON.stringify({
      autonomy: "gentle",
      relapseSensitivity: "high",
      doctorName: "Dr. Lindqvist",
    } satisfies ClinicianOverride),
    contextFlag: "auto",
    iafHz: 10,
    preferredMusicStyle: "piano",
    updatedAt: now,
  });
  return (await getPatient(id))!;
}

export async function getOverride(id: string): Promise<ClinicianOverride> {
  const p = await getPatient(id);
  if (!p) return {};
  try {
    return JSON.parse(p.activeClinicianOverride) as ClinicianOverride;
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/* memories                                                            */
/* ------------------------------------------------------------------ */

export async function insertMemory(
  m: Omit<MemoryRow, "isDimmed" | "echoedAt"> &
    Partial<Pick<MemoryRow, "isDimmed" | "echoedAt">>
): Promise<MemoryRow> {
  const row = { ...m, echoedAt: m.echoedAt ?? null, isDimmed: m.isDimmed ?? 0 };
  await supabaseAdmin().from("memory_capsules").upsert(row);
  return row;
}

/** cache the generated track on the capsule — replays hit disk, not the API */
export async function updateMemorySoundscape(
  patientId: string,
  memoryId: string,
  soundscapeUrl: string,
  musicStyle: string
): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from("memory_capsules")
    .update({ soundscapeUrl, musicStyle })
    .eq("id", memoryId)
    .eq("patientId", patientId);
  await sb.from("patients").update({ soundscapeUrl }).eq("id", patientId);
}

export async function listMemories(patientId: string): Promise<MemoryRow[]> {
  const { data } = await supabaseAdmin()
    .from("memory_capsules")
    .select("*")
    .eq("patientId", patientId)
    .order("createdAt", { ascending: false });
  return (data ?? []) as MemoryRow[];
}

export async function markEchoed(patientId: string, memoryId: string): Promise<void> {
  await supabaseAdmin()
    .from("memory_capsules")
    .update({ echoedAt: Date.now(), isDimmed: 0 })
    .eq("id", memoryId)
    .eq("patientId", patientId);
}

/* ------------------------------------------------------------------ */
/* missions                                                            */
/* ------------------------------------------------------------------ */

export async function listMissions(patientId: string, status?: string): Promise<MissionRow[]> {
  let q = supabaseAdmin()
    .from("missions")
    .select("*")
    .eq("patientId", patientId)
    .order("createdAt", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as MissionRow[];
}

export async function activeMission(patientId: string): Promise<MissionRow | null> {
  const { data } = await supabaseAdmin()
    .from("missions")
    .select("*")
    .eq("patientId", patientId)
    .eq("status", "ACTIVE")
    .order("createdAt", { ascending: false })
    .limit(1);
  return ((data ?? [])[0] as MissionRow) ?? null;
}

/** creating a mission supersedes any currently-ACTIVE one */
export async function createMission(
  m: Omit<MissionRow, "status" | "completedAt"> & { status?: MissionRow["status"] }
): Promise<MissionRow> {
  const sb = supabaseAdmin();
  await sb
    .from("missions")
    .update({ status: "SUPERSEDED" })
    .eq("patientId", m.patientId)
    .eq("status", "ACTIVE");
  await sb.from("missions").insert({ ...m, status: m.status ?? "ACTIVE" });
  return { ...m, status: m.status ?? "ACTIVE", completedAt: null };
}

export async function patchMission(
  id: string,
  patch: {
    status?: MissionRow["status"];
    title?: string;
    photoPrompt?: string;
    voicePrompt?: string;
    clinicianNote?: string;
  }
): Promise<MissionRow | null> {
  const sb = supabaseAdmin();
  const { data } = await sb.from("missions").select("*").eq("id", id).maybeSingle();
  const cur = data as MissionRow | null;
  if (!cur) return null;
  const completed = patch.status === "COMPLETED" ? Date.now() : cur.completedAt;
  await sb
    .from("missions")
    .update({
      status: patch.status ?? cur.status,
      title: patch.title ?? cur.title,
      photoPrompt: patch.photoPrompt ?? cur.photoPrompt,
      voicePrompt: patch.voicePrompt ?? cur.voicePrompt,
      clinicianNote: patch.clinicianNote ?? cur.clinicianNote,
      completedAt: completed ?? null,
    })
    .eq("id", id);
  return { ...cur, ...patch, completedAt: completed ?? null };
}

export async function completeActiveMissions(patientId: string): Promise<void> {
  await supabaseAdmin()
    .from("missions")
    .update({ status: "COMPLETED", completedAt: Date.now() })
    .eq("patientId", patientId)
    .eq("status", "ACTIVE");
}

/* ------------------------------------------------------------------ */
/* nudges                                                              */
/* ------------------------------------------------------------------ */

export async function insertNudge(n: Omit<NudgeRow, "acknowledged">): Promise<NudgeRow> {
  await supabaseAdmin()
    .from("clinician_nudges")
    .insert({ ...n, acknowledged: 0 });
  return { ...n, acknowledged: 0 };
}

export async function listNudges(patientId: string, unackOnly = false): Promise<NudgeRow[]> {
  let q = supabaseAdmin()
    .from("clinician_nudges")
    .select("*")
    .eq("patientId", patientId)
    .order("createdAt", { ascending: false });
  if (unackOnly) q = q.eq("acknowledged", 0);
  const { data } = await q;
  return (data ?? []) as NudgeRow[];
}

export async function ackNudge(id: string): Promise<void> {
  await supabaseAdmin().from("clinician_nudges").update({ acknowledged: 1 }).eq("id", id);
}

/* ------------------------------------------------------------------ */
/* biometric logs                                                      */
/* ------------------------------------------------------------------ */

export async function bioHistory(patientId: string): Promise<DaySnapshot[]> {
  const { data } = await supabaseAdmin()
    .from("biometric_logs")
    .select("*")
    .eq("patientId", patientId)
    .order("at", { ascending: true });
  return ((data ?? []) as BiometricRow[]).map((r) => ({
    day: dayName(r.at),
    at: r.at,
    prosody: r.vocalEnergy,
    savoring: r.savoringScore,
    mobility: r.mobilityRadiusMeters,
    hrv: r.hrv,
    luminance: r.luminance,
    sleep: r.sleepRegularity,
  }));
}

function dayName(at: number): string {
  return new Date(at).toLocaleDateString("en-US", { weekday: "short" });
}

/** blend a fresh capture into today's log row (upsert) */
export async function blendTodayLog(
  patientId: string,
  sig: { prosody?: number; savoring?: number; mobility?: number; luminance?: number }
): Promise<void> {
  const sb = supabaseAdmin();
  const now = Date.now();
  const date = new Date(now).toISOString().slice(0, 10);
  const { data } = await sb
    .from("biometric_logs")
    .select("*")
    .eq("patientId", patientId)
    .eq("date", date)
    .maybeSingle();
  const cur = data as BiometricRow | null;
  const blend = (old: number | undefined, s: number | undefined) =>
    s == null ? (old ?? 50) : Math.round((old ?? 50) * 0.7 + s * 0.3);
  await sb.from("biometric_logs").upsert({
    id: cur?.id ?? `bio-${patientId}-${date}`,
    patientId,
    date,
    at: now,
    vocalEnergy: blend(cur?.vocalEnergy, sig.prosody),
    pitchVariance: cur?.pitchVariance ?? 0,
    savoringScore: blend(cur?.savoringScore, sig.savoring),
    mobilityRadiusMeters: Math.max(cur?.mobilityRadiusMeters ?? 0, sig.mobility ?? 0),
    hrv: cur?.hrv ?? 40,
    sleepRegularity: cur?.sleepRegularity ?? 60,
    luminance: blend(cur?.luminance, sig.luminance),
  });
}

/* ------------------------------------------------------------------ */
/* patient detail aggregate — shared by /api/patients/[id] and /me     */
/* ------------------------------------------------------------------ */

export async function patientDetail(p: PatientRow) {
  const history = await bioHistory(p.id);
  const baselineStored = JSON.parse(p.baselineMetrics || "{}");
  return {
    patient: {
      id: p.id,
      name: p.name,
      initials: p.initials,
      note: p.note,
      hue: p.hue,
      postTmsDay: postTmsDay(p),
      energyState: p.currentEnergyState,
      triageStatus: p.triageStatus,
      contextFlag: p.contextFlag ?? "auto",
      iafHz: p.iafHz ?? 10,
      preferredMusicStyle: p.preferredMusicStyle ?? "piano",
      soundscapeUrl: p.soundscapeUrl,
      authEmail: p.authEmail ?? null,
      updatedAt: p.updatedAt,
    },
    override: await getOverride(p.id),
    baseline: Object.keys(baselineStored).length ? baselineStored : dischargeBaseline(history),
    history,
    triage: computeTriage(history, p.contextFlag),
    missions: await listMissions(p.id),
    activeMission: await activeMission(p.id),
    memories: await listMemories(p.id),
    nudges: await listNudges(p.id),
  };
}

/* ------------------------------------------------------------------ */
/* seed — re-create the demo cohort (auth users come from schema.sql)  */
/* ------------------------------------------------------------------ */

export async function seedAll(): Promise<void> {
  const sb = supabaseAdmin();
  const now = Date.now();
  const c = cohort();
  const statics = staticPatients(now);
  const mattiHistory = seedHistory(now);

  const AUTH_UID: Record<string, string> = {
    matti: "aa000000-0000-4000-8000-000000000002",
    eero: "aa000000-0000-4000-8000-000000000003",
    sofia: "aa000000-0000-4000-8000-000000000004",
    aino: "aa000000-0000-4000-8000-000000000005",
    vilho: "aa000000-0000-4000-8000-000000000006",
  };
  const PAIR_CODES: Record<string, string> = {
    matti: "OTA-4815",
    eero: "OTA-2274",
    sofia: "OTA-9032",
    aino: "OTA-5546",
    vilho: "OTA-7729",
  };

  for (const p of c) {
    const hist = p.id === LIVE_PATIENT_ID ? mattiHistory : statics.find((s) => s.id === p.id)!.history;
    const baseline = dischargeBaseline(hist);
    const triage = computeTriage(hist);
    await sb.from("patients").upsert({
      id: p.id,
      name: p.name,
      initials: p.initials,
      note: p.note,
      hue: p.hue,
      pairingCode: PAIR_CODES[p.id] ?? null,
      auth_user_id: AUTH_UID[p.id] ?? null,
      authEmail: AUTH_UID[p.id] ? `${p.id}@otapath.app` : null,
      tmsCompletionDate: now - p.postTmsDay * DAY,
      currentEnergyState: "LOW",
      triageStatus: triage.level,
      baselineMetrics: JSON.stringify(baseline),
      activeClinicianOverride: JSON.stringify({
        autonomy: "standard",
        relapseSensitivity: "standard",
        doctorName: "Dr. Lindqvist",
      } satisfies ClinicianOverride),
      contextFlag: "auto",
      iafHz: 10,
      preferredMusicStyle: "piano",
      updatedAt: now,
    });
    const bioRows = hist.map((day) => ({
      id: `bio-${p.id}-${day.at}`,
      patientId: p.id,
      date: new Date(day.at).toISOString().slice(0, 10),
      at: day.at,
      vocalEnergy: day.prosody,
      pitchVariance: day.prosody,
      savoringScore: day.savoring,
      mobilityRadiusMeters: day.mobility,
      hrv: day.hrv,
      sleepRegularity: day.sleep,
      luminance: day.luminance,
    }));
    await sb.from("biometric_logs").upsert(bioRows, { onConflict: "patientId,date" });
  }

  // Matti carries the three illustrated demo capsules (one echo-ready)
  const SEED_TIER: Record<string, string> = {
    "the green corner nearby": "nature",
    "the neighborhood sports court": "sport",
    "the little cinema on the corner": "culture",
  };
  for (const m of buildSeedMemories(DEFAULT_CENTER, now)) {
    await insertMemory({
      id: m.id,
      patientId: LIVE_PATIENT_ID,
      lat: m.lat,
      lng: m.lng,
      locationName: m.poiName,
      poiType: SEED_TIER[m.poiName] ?? "nature",
      kind: m.kind,
      photoUrl: m.photoUrl ?? null,
      audioUrl: null,
      audioDurS: null,
      transcript: m.transcript ?? null,
      acousticScore: m.acousticScore ?? null,
      savoringScore: m.savoringScore ?? null,
      luminanceScore: m.luminance ?? null,
      vibrancyScore: m.vibrancy ?? null,
      valence: m.valence ?? null,
      themes: JSON.stringify(m.themes ?? []),
      soundscapePrompt: m.soundscapePrompt ?? null,
      palette: null,
      f0Hz: null,
      f0SdHz: null,
      acousticDelta: null,
      soundscapeUrl: null,
      musicStyle: null,
      createdAt: m.at,
    });
  }

  // missions + nudges + bandit arms — keeps POST /api/seed in parity with
  // supabase/schema.sql so a demo reset restores the full story.
  const H = 3600000;
  await sb.from("missions").upsert([
    { id: "msn-seed-matti-quest", patientId: "matti",
      title: "Walk to the green corner and sit with the trees for a moment",
      photoPrompt: "find one detail of light you like",
      voicePrompt: "say what it felt like to be outside",
      poiName: "the green corner nearby", poiCategory: "nature",
      lat: 60.186691158426456, lng: 24.828023055636052,
      difficultyTier: "nature", assignedBy: "CLINICIAN_CUSTOM",
      clinicianNote: "first gentle outdoor re-entry — keep it under 15 minutes",
      doctorName: "Dr. Lindqvist", status: "ACTIVE",
      createdAt: now - 10 * H, completedAt: null },
    { id: "msn-seed-matti-cinema", patientId: "matti",
      title: "Follow the painted arrows to the little cinema",
      photoPrompt: null, voicePrompt: null,
      poiName: "the little cinema on the corner", poiCategory: "culture",
      lat: 60.18662180623969, lng: 24.81207055514161,
      difficultyTier: "culture", assignedBy: "AI_CLOSED_LOOP",
      clinicianNote: null, doctorName: null, status: "COMPLETED",
      createdAt: now - 7 * DAY - 6 * H, completedAt: now - 7 * DAY - 5 * H },
    { id: "msn-seed-eero-park", patientId: "eero",
      title: "A slow lap around the park pond",
      photoPrompt: null, voicePrompt: null,
      poiName: "the park pond", poiCategory: "nature",
      lat: 60.1855, lng: 24.827,
      difficultyTier: "nature", assignedBy: "AI_CLOSED_LOOP",
      clinicianNote: null, doctorName: null, status: "COMPLETED",
      createdAt: now - 2 * DAY, completedAt: now - DAY },
    { id: "msn-seed-eero-bench", patientId: "eero",
      title: "Sit on the bench by the birch trees — ten minutes is enough",
      photoPrompt: "one small thing that catches your eye",
      voicePrompt: "how the air feels today",
      poiName: "the bench by the birches", poiCategory: "nature",
      lat: 60.1842, lng: 24.8261,
      difficultyTier: "nature", assignedBy: "CLINICIAN_CUSTOM",
      clinicianNote: "keep it tiny — he is in a dip",
      doctorName: "Dr. Lindqvist", status: "ACTIVE",
      createdAt: now - 20 * H, completedAt: null },
    { id: "msn-seed-sofia-cafe", patientId: "sofia",
      title: "A short stroll to the corner café window",
      photoPrompt: null, voicePrompt: null,
      poiName: "the corner café", poiCategory: "culture",
      lat: 60.186, lng: 24.823,
      difficultyTier: "culture", assignedBy: "AI_CLOSED_LOOP",
      clinicianNote: null, doctorName: null, status: "COMPLETED",
      createdAt: now - 4 * DAY, completedAt: now - 3 * DAY },
  ]);

  await sb.from("clinician_nudges").upsert([
    { id: "nud-seed-matti-welcome", patientId: "matti", doctorName: "Dr. Lindqvist",
      message: "Welcome home, Matti. No pressure this week — we're just glad you're here.",
      createdAt: now - 6 * DAY, acknowledged: 1 },
    { id: "nud-seed-matti-quest", patientId: "matti", doctorName: "Dr. Lindqvist",
      message: "Great first week home — when you feel ready, there's a small quest waiting for you outside.",
      createdAt: now - 2 * H, acknowledged: 0 },
    { id: "nud-seed-eero-checkin", patientId: "eero", doctorName: "Dr. Lindqvist",
      message: "Eero, the last few days looked quiet — a tiny step outside counts just as much as a big one. We're here.",
      createdAt: now - 8 * H, acknowledged: 0 },
    { id: "nud-seed-aino-keep", patientId: "aino", doctorName: "Dr. Lindqvist",
      message: "Beautiful consistency, Aino — the walks are clearly doing their work.",
      createdAt: now - 2 * DAY, acknowledged: 1 },
  ]);

  const arms: Array<[string, string, number, number, number]> = [
    ["matti", "nature", 0.31, 9, 2.8], ["matti", "culture", 0.18, 7, 1.3],
    ["matti", "sport", 0.07, 4, 0.3], ["matti", "alpha", 0.12, 6, 0.7],
    ["matti", "theta", -0.04, 3, -0.1],
    ["matti", "m-lofi", 0.19, 5, 0.9], ["matti", "m-piano", 0.11, 5, 0.6],
    ["matti", "m-lively", 0.05, 3, 0.2], ["matti", "m-nature", 0.02, 2, 0],
    ["eero", "nature", 0.08, 5, 0.4], ["eero", "culture", -0.06, 4, -0.2],
    ["sofia", "culture", 0.14, 6, 0.8], ["sofia", "nature", 0.05, 5, 0.2],
    ["aino", "sport", 0.22, 8, 1.8], ["aino", "nature", 0.19, 7, 1.4],
    ["vilho", "nature", 0.16, 9, 1.5], ["vilho", "culture", 0.12, 6, 0.7],
  ];
  await sb.from("bandit_arms").upsert(
    arms.map(([patientId, arm, weight, pulls, rewardSum]) => ({
      patientId, arm, weight, pulls, rewardSum, updatedAt: now,
    })),
  );
}

export async function wipeAll(): Promise<void> {
  const sb = supabaseAdmin();
  // children first — FK cascade would also handle it, but be explicit
  await sb.from("biometric_logs").delete().neq("id", "__none__");
  await sb.from("clinician_nudges").delete().neq("id", "__none__");
  await sb.from("missions").delete().neq("id", "__none__");
  await sb.from("memory_capsules").delete().neq("id", "__none__");
  await sb.from("bandit_arms").delete().neq("patientId", "__none__");
  await sb.from("patients").delete().neq("id", "__none__");
}

/* ------------------------------------------------------------------ */
/* cohort activity feed — "what's new" across every patient            */
/* ------------------------------------------------------------------ */

export interface ActivityRow {
  type: "memory" | "mission_new" | "mission_done" | "nudge" | "patient";
  id: string;
  patientId: string;
  patientName: string;
  label: string;
  at: number;
}

export async function recentActivity(limit = 16): Promise<ActivityRow[]> {
  const sb = supabaseAdmin();
  const [{ data: patients }, { data: memories }, { data: missions }, { data: nudges }] =
    await Promise.all([
      sb.from("patients").select("id, name, note, tmsCompletionDate"),
      sb
        .from("memory_capsules")
        .select("id, patientId, locationName, createdAt")
        .order("createdAt", { ascending: false })
        .limit(limit),
      sb
        .from("missions")
        .select("id, patientId, title, createdAt, completedAt")
        .order("createdAt", { ascending: false })
        .limit(limit),
      sb
        .from("clinician_nudges")
        .select("id, patientId, message, createdAt")
        .order("createdAt", { ascending: false })
        .limit(limit),
    ]);
  const nameOf = new Map((patients ?? []).map((p) => [p.id, p.name]));
  const events: ActivityRow[] = [];
  for (const m of memories ?? [])
    events.push({
      type: "memory",
      id: m.id,
      patientId: m.patientId,
      patientName: nameOf.get(m.patientId) ?? "",
      label: m.locationName,
      at: m.createdAt,
    });
  for (const m of missions ?? []) {
    events.push({
      type: "mission_new",
      id: m.id,
      patientId: m.patientId,
      patientName: nameOf.get(m.patientId) ?? "",
      label: m.title,
      at: m.createdAt,
    });
    if (m.completedAt)
      events.push({
        type: "mission_done",
        id: `${m.id}-done`,
        patientId: m.patientId,
        patientName: nameOf.get(m.patientId) ?? "",
        label: m.title,
        at: m.completedAt,
      });
  }
  for (const n of nudges ?? [])
    events.push({
      type: "nudge",
      id: n.id,
      patientId: n.patientId,
      patientName: nameOf.get(n.patientId) ?? "",
      label: n.message,
      at: n.createdAt,
    });
  for (const p of patients ?? [])
    events.push({
      type: "patient",
      id: p.id,
      patientId: p.id,
      patientName: p.name,
      label: p.note,
      at: p.tmsCompletionDate,
    });
  return events.sort((a, b) => b.at - a.at).slice(0, limit);
}

/** headline numbers for the cohort pulse tiles */
export async function cohortStats(now = Date.now()): Promise<{
  capsules: number;
  activeMissions: number;
  nudges: number;
  signalsToday: number;
}> {
  const sb = supabaseAdmin();
  const [capsules, activeMissions, nudges, signalsToday] = await Promise.all([
    sb.from("memory_capsules").select("id", { count: "exact", head: true }),
    sb.from("missions").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    sb.from("clinician_nudges").select("id", { count: "exact", head: true }),
    sb
      .from("biometric_logs")
      .select("id", { count: "exact", head: true })
      .gt("at", now - 24 * 3600 * 1000),
  ]);
  return {
    capsules: capsules.count ?? 0,
    activeMissions: activeMissions.count ?? 0,
    nudges: nudges.count ?? 0,
    signalsToday: signalsToday.count ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/* contextual bandit — real arm weights learned from outcomes           */
/* ------------------------------------------------------------------ */

export async function listBanditArms(patientId: string): Promise<BanditArmRow[]> {
  const { data } = await supabaseAdmin()
    .from("bandit_arms")
    .select("*")
    .eq("patientId", patientId)
    .order("arm");
  return (data ?? []) as BanditArmRow[];
}

/**
 * LinUCB-lite update: exponential moving-average weight per arm.
 * `reward` is −1…+1 (post-mission signal improvement vs the arm's mean).
 */
export async function updateBanditArm(
  patientId: string,
  arm: string,
  reward: number
): Promise<BanditArmRow> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("bandit_arms")
    .select("*")
    .eq("patientId", patientId)
    .eq("arm", arm)
    .maybeSingle();
  const cur = data as BanditArmRow | null;
  const alpha = 0.35;
  const weight = cur ? cur.weight * (1 - alpha) + reward * alpha : reward;
  const pulls = (cur?.pulls ?? 0) + 1;
  const rewardSum = (cur?.rewardSum ?? 0) + reward;
  const row: BanditArmRow = { patientId, arm, weight, pulls, rewardSum, updatedAt: Date.now() };
  await sb.from("bandit_arms").upsert(row);
  return row;
}
