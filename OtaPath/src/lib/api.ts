/**
 * api.ts — thin client over the OtaPath REST layer.
 * Used by the patient app (sync + persistence) and the clinician portal.
 */

import type { MemoryRow, MissionRow, NudgeRow, ClinicianOverride, PatientRow } from "./db";
import type { DaySnapshot } from "./biometricHistory";
import type { Triage } from "./triage";

export interface PatientSummary {
  id: string;
  name: string;
  initials: string;
  note: string;
  hue: string;
  postTmsDay: number;
  energyState: string;
  triageStatus: string;
  override: ClinicianOverride;
  updatedAt: number;
  /** latest biometric signal the app sent — null until the first walk */
  lastSignalAt?: number | null;
  /** "auto" | "sick" | "housebound" — patient-marked daily context */
  contextFlag?: string;
  /** clinician-tuned Individual Alpha Frequency (Hz) */
  iafHz?: number;
  /** patient's chosen ElevenLabs vibe — lively | piano | lofi | nature */
  preferredMusicStyle?: string;
  /** the login email the clinician created for this patient */
  authEmail?: string | null;
}

export interface ActivityEvent {
  type: "memory" | "mission_new" | "mission_done" | "nudge" | "patient";
  id: string;
  patientId: string;
  patientName: string;
  label: string;
  at: number;
}

export interface CohortStats {
  capsules: number;
  activeMissions: number;
  nudges: number;
  signalsToday: number;
}

export interface PatientDetail {
  patient: Omit<PatientSummary, "override">;
  override: ClinicianOverride;
  baseline: { prosody: number; savoring: number; mobility: number; hrv: number };
  history: DaySnapshot[];
  triage: Triage;
  missions: MissionRow[];
  activeMission: MissionRow | null;
  memories: MemoryRow[];
  nudges: NudgeRow[];
}

async function j<T>(r: Promise<Response>): Promise<T> {
  const res = await r;
  if (!res.ok) throw new Error(`api ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  patients: () => j<{ patients: PatientSummary[] }>(fetch("/api/patients")),
  activity: () =>
    j<{ events: ActivityEvent[]; stats: CohortStats }>(fetch("/api/activity")),
  addPatient: (code: string, name?: string, note?: string) =>
    j<{ patient: { id: string; name: string }; alreadyLinked: boolean }>(
      fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, note }),
      })
    ),
  /** clinician creates the patient's login + record — returns the
   *  credentials once (auto-generated password when none supplied) */
  createPatientAccount: (body: { name: string; email: string; password?: string; note?: string }) =>
    j<{
      patient: { id: string; name: string; email: string };
      credentials: { email: string; password?: string };
    }>(
      fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),
  patient: (id: string) => j<PatientDetail>(fetch(`/api/patients/${id}`)),
  patchPatient: (id: string, body: {
    override?: ClinicianOverride;
    currentEnergyState?: string;
    contextFlag?: string;
    iafHz?: number;
    preferredMusicStyle?: string;
  }) =>
    j<{ ok: boolean; override: ClinicianOverride }>(
      fetch(`/api/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),
  missions: (patientId: string, status?: string) =>
    j<{ missions: MissionRow[] }>(
      fetch(`/api/missions?patientId=${patientId}${status ? `&status=${status}` : ""}`)
    ),
  createMission: (body: Partial<MissionRow> & {
    patientId?: string;
    patientLat?: number;
    patientLng?: number;
  }) =>
    j<{ mission: MissionRow }>(
      fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),
  patchMission: (id: string, body: { status?: MissionRow["status"]; [k: string]: unknown }) =>
    j<{ mission: MissionRow }>(
      fetch(`/api/missions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),
  postMemory: (body: Record<string, unknown>) =>
    j<{ memory: MemoryRow }>(
      fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),
  /** bind a generated track to a capsule (soundscapeUrl + musicStyle) */
  patchMemory: (id: string, body: { soundscapeUrl: string; musicStyle: string; patientId?: string }) =>
    j<{ ok: boolean }>(
      fetch("/api/memories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      })
    ),
  /** ElevenLabs music/soundscape — {url} or null on 204/no-key */
  generateSoundscape: async (body: {
    prompt?: string;
    durationSeconds?: number;
    kind?: "music" | "sfx";
    musicStyle?: string;
    memoryId?: string;
    patientId?: string;
    energy?: string;
    locationName?: string;
    themes?: string[];
    luminance?: number;
    force?: boolean;
  }): Promise<{ url: string; cached: boolean } | null> => {
    const res = await fetch("/api/generate-soundscape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as { url: string; cached: boolean };
  },
  nudges: (patientId: string, unack = false) =>
    j<{ nudges: NudgeRow[] }>(
      fetch(`/api/nudges?patientId=${patientId}${unack ? "&unack=1" : ""}`)
    ),
  sendNudge: (patientId: string, doctorName: string, message: string) =>
    j<{ nudge: NudgeRow }>(
      fetch("/api/nudges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, doctorName, message }),
      })
    ),
  ackNudge: (id: string) =>
    j<{ ok: boolean }>(fetch(`/api/nudges/${id}`, { method: "PATCH" })),
  seed: () => j<{ ok: boolean; patients: number }>(fetch("/api/seed", { method: "POST" })),
  banditArms: (patientId: string) =>
    j<{ arms: { arm: string; weight: number; pulls: number; rewardSum: number }[] }>(
      fetch(`/api/bandit?patientId=${patientId}`)
    ),
  banditUpdate: (patientId: string, arm: string, reward: number) =>
    j<{ arm: { arm: string; weight: number; pulls: number } }>(
      fetch("/api/bandit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, arm, reward }),
      })
    ),
};

/** blob: / object URL → data URL (for durable upload) */
export async function toDataUrl(url: string | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  if (url.startsWith("data:")) return url;
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error("read fail"));
      fr.readAsDataURL(blob);
    });
  } catch {
    return undefined; // revoked object URL — persist without media
  }
}

export type { PatientRow, MissionRow, NudgeRow, ClinicianOverride, MemoryRow };
