/**
 * useOtaStore — OtaPath's closed-loop state.
 *
 * Holds the patient's inferred energy state, walked path, exploration
 * coverage, real-world POIs, the active photo-hunt mission, memory
 * capsules, and biometric signals. The demo simulator lives here too
 * so the map and the control drawer stay in sync.
 *
 * Psychological-safety contract: nothing in here can represent failure.
 * Inactivity simply leaves the mist in place — the world naps.
 */

import { create } from "zustand";
import {
  cellsCoveredBy,
  haversineM,
  totalNeighborhoodCells,
  DEFAULT_CENTER,
  type LatLng,
} from "@/lib/geo";
import {
  indoorMission,
  missionFor,
  nearestPoi,
  STATE_TO_TIER,
  type Mission,
  type PatientState,
  type POI,
} from "@/lib/poi";
import { guardNearby, MAX_POI_DIST_M } from "@/lib/localPoiEngine";
import { fetchPois, type PoiSource } from "@/lib/overpass";
import { buildSeedMemories } from "@/lib/seedMemories";
import {
  seededEngine,
  currentContext,
  type ArmId,
  type OutcomeDeltas,
} from "@/lib/closedLoopEngine";
import {
  seedHistory,
  mergeToday,
  mobilityRadiusM,
  type DaySnapshot,
} from "@/lib/biometricHistory";
import { computeTriage } from "@/lib/triage";
import {
  publishSnapshot,
  NUDGE_CHANNEL,
  DEMO_CHANNEL,
  type DemoMsg,
  type LoopEvent,
  type LoopStage,
  type LastCapture,
  type NudgeMsg,
} from "@/lib/broadcast";
import { buildWalkLoop, interpolatedSteps } from "@/lib/walkRoute";
import { isMusicStyle, type MusicStyleId } from "@/lib/musicTaste";

export interface MemoryCapsule {
  id: string;
  lat: number;
  lng: number;
  poiName: string;
  kind: "photo" | "voice" | "moment";
  at: number;
  /** data/object URLs — session-scoped (no server in the demo) */
  photoUrl?: string;
  audioUrl?: string;
  audioDurS?: number;
  transcript?: string;
  /** signal scores captured at save time */
  luminance?: number;
  vibrancy?: number;
  acousticScore?: number;
  savoringScore?: number;
  valence?: number;
  themes?: string[];
  soundscapePrompt?: string;
  /** real image analysis — dominant hex swatches + pitch stats */
  palette?: string[];
  f0Hz?: number;
  f0SdHz?: number;
  /** -100…+100 — how this take compares to the discharge baseline */
  acousticDelta?: number;
  /** cached ElevenLabs MP3 (/api/audio/<file>) — replays straight from disk */
  soundscapeUrl?: string;
  /** which vibe generated the cached track */
  musicStyle?: MusicStyleId;
  /** set once the 7-day Memory Echo challenge has been resolved */
  echoedAt?: number;
}

export interface Biometrics {
  /** closed-loop inference signals, 0–100 unless noted */
  hrv: number;
  sleepRegularity: number;
  voiceProsody: number;
  nlpSavoring: number;
  photoVibrancy: number;
  photoLuminance: number;
}

export interface Toast {
  id: number;
  text: string;
}

const TOTAL_CELLS = totalNeighborhoodCells();
const DISCOVER_RADIUS_M = 45;
const STEP_DEDUPE_M = 3;
const COMFORT_KEY = "otapath-comfort";
const DOG_KEY = "otapath-dogname";
const MUSIC_KEY = "otapath-music";

/** neighborhood-lit celebrations — zero-guilt, one toast per threshold */
const MILESTONES: [number, string][] = [
  [5, "First glow — 5% of the neighborhood is yours"],
  [10, "10% lit — the mist is learning your name"],
  [15, "15% — quietly halfway to a third"],
  [20, "20% explored — the map keeps warming"],
  [30, "30% — your neighborhood knows your steps"],
  [40, "40% lit — almost half the world is awake"],
  [50, "50% — half of home turf glows for you"],
  [75, "75% — three quarters of the mist lifted"],
];

export type MissionDifficulty = "gentle" | "standard" | "stretch";
export type CareNudge = { kind: "checkin" | "difficulty"; at: number };
export type LocationSource = "demo" | "gps" | "ip";
export type TodayContext = "auto" | "sick" | "housebound";

let simTimer: ReturnType<typeof setInterval> | null = null;
let toastSeq = 0;

function loadComfort(): { motion: "full" | "soft"; theme: "day" | "candle" } {
  const d = { motion: "full" as const, theme: "day" as const };
  if (typeof window === "undefined") return d;
  try {
    return { ...d, ...JSON.parse(localStorage.getItem(COMFORT_KEY) ?? "{}") };
  } catch {
    return d;
  }
}

function loadDogName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(DOG_KEY);
    return v && v.trim() ? v.trim().slice(0, 24) : null;
  } catch {
    return null;
  }
}

interface OtaStore {
  /* closed-loop patient state */
  patientState: PatientState;
  biometrics: Biometrics;

  /* world state */
  userPosition: LatLng;
  gpsActive: boolean;
  /** where the position came from — real GPS, IP city fix, or demo seed */
  locationSource: LocationSource;
  /** increments when the app should fly the map back to the user */
  recenterTick: number;
  walkedPath: LatLng[];
  exploredCells: Set<string>;
  exploredPct: number;
  pois: POI[];
  poisSource: PoiSource | null;
  poisLoading: boolean;
  activeMission: Mission | null;
  discoveredIds: Set<string>;
  memories: MemoryCapsule[];

  /* demo + ui */
  simRunning: boolean;
  drawerOpen: boolean;
  captureOpen: boolean;
  /** step the capture sheet opens on — 2 jumps straight to the voice journal */
  captureStep: 1 | 2;
  viewingMemoryId: string | null;
  /** POI the capture modal was already offered for (once per mission) */
  offeredPoiId: string | null;
  /** capsule currently open in the Memory Echo recall challenge */
  echoMemoryId: string | null;
  toasts: Toast[];

  /* closed-loop learning (Phase 4) */
  biometricHistory: DaySnapshot[];
  loopEvents: Partial<Record<LoopStage, LoopEvent>>;
  lastCapture: LastCapture | null;

  /* personal baseline + social layer */
  /** discharge-day baseline captured by the calibration modal */
  baseline: Baseline | null;
  baselineOpen: boolean;
  shareOpen: boolean;

  /* craft + comfort layer */
  sensoryOpen: boolean;
  sensoryPlaying: boolean;
  /** capsule id animating its pin-drop right now (clears in ~2.5s) */
  justCapturedId: string | null;
  /** exploration thresholds already toasted (reset with the walk) */
  celebrated: Set<number>;
  /** clinician → patient care nudges arriving over BroadcastChannel */
  careNudge: CareNudge | null;
  missionDifficulty: MissionDifficulty;
  comfortMotion: "full" | "soft";
  comfortTheme: "day" | "candle";
  /** the dog's name — chosen by the patient, null until first naming */
  dogName: string | null;
  /** true once persisted prefs (dog name, comfort) were read post-mount */
  dogHydrated: boolean;
  /** today's real-life context — sick/housebound pauses outdoor quests */
  todayContext: TodayContext;
  /** Individual Alpha Frequency (Hz) — clinician-tunable binaural beat */
  iafHz: number;
  /** patient's chosen ElevenLabs vibe — persisted on the patient row */
  preferredMusicStyle: MusicStyleId;
  /** closed-loop winner — the style lifting next-day energy the most */
  bestLiftStyle: MusicStyleId | null;

  /* actions */
  setPatientState: (s: PatientState) => void;
  setUserPosition: (p: LatLng) => void;
  /** real-location anchor — relocates world+missions when we truly moved */
  relocateTo: (p: LatLng, source: LocationSource) => void;
  /** one-tap "use my GPS" — browser fix → relocate + fly the map there */
  locateNow: () => void;
  setGpsActive: (on: boolean) => void;
  appendWalkPoint: (p: LatLng) => void;
  loadPois: (force?: boolean) => Promise<void>;
  assignMissionTo: (poi: POI) => void;
  openCapture: (step?: 1 | 2) => void;
  closeCapture: () => void;
  saveMemory: (
    m: Omit<MemoryCapsule, "id" | "lat" | "lng" | "at" | "poiName">
  ) => void;
  viewMemory: (id: string | null) => void;
  openEcho: (id: string) => void;
  closeEcho: () => void;
  markEchoed: (id: string) => void;
  seedEchoMemories: () => void;
  loopEvent: (stage: LoopStage, label: string) => void;
  recordOutcome: (arm: ArmId, deltas?: Partial<OutcomeDeltas>) => void;
  updateBiometrics: (patch: Partial<Biometrics>) => void;
  inferredState: () => PatientState;
  startSimWalk: () => void;
  resetWalk: () => void;
  toggleDrawer: () => void;
  pushToast: (text: string) => void;
  setBaseline: (b: Baseline) => void;
  setBaselineOpen: (v: boolean) => void;
  setShareOpen: (v: boolean) => void;
  setSensoryOpen: (v: boolean) => void;
  setSensoryPlaying: (v: boolean) => void;
  applyDifficulty: (d: MissionDifficulty) => void;
  /** a doctor-prescribed mission arriving from the server */
  applyClinicianMission: (m: {
    id: string; title: string; poiName: string; difficultyTier: string;
    lat: number; lng: number; clinicianNote?: string | null;
    doctorName?: string | null; photoPrompt?: string | null;
    voicePrompt?: string | null; audioPairing?: string | null;
  }) => void;
  /** capture finished → clear mission + let the engine reassign */
  completeMission: () => void;
  hydrated: boolean;
  markHydrated: () => void;
  /** the signed-in patient's record id — resolved by AuthGate via /api/patients/me;
   *  "matti" until a session resolves (keeps the demo loop working) */
  patientId: string;
  setPatientId: (id: string) => void;
  setComfortMotion: (m: "full" | "soft") => void;
  setComfortTheme: (t: "day" | "candle") => void;
  setDogName: (name: string | null) => void;
  /** read localStorage-backed prefs after mount (avoids SSR mismatch) */
  hydrateFromStorage: () => void;
  /** mark today as sick/housebound → indoor window quests, no guilt */
  setTodayContext: (c: TodayContext) => void;
  setIafHz: (hz: number) => void;
  /** choose the soundtrack vibe — persists to localStorage + patient row */
  setMusicStyle: (s: MusicStyleId) => void;
  setBestLiftStyle: (s: MusicStyleId | null) => void;
  /** attach a generated/cached track to a capsule (+ PATCH to the DB) */
  setCapsuleSoundscape: (id: string, url: string, style: MusicStyleId) => void;
}

export interface Baseline {
  prosody: number;
  savoring: number;
  mobility: number;
  hrv: number;
  luminance: number;
  sleep: number;
  at: number;
}

/** clinician "mission difficulty" nudge — shifts the tier ladder gently */
const DIFF_SHIFT: Record<MissionDifficulty, Partial<Record<PatientState, PatientState>>> = {
  gentle: { MODERATE: "LOW", HIGH: "MODERATE" },
  standard: {},
  stretch: { LOW: "MODERATE", MODERATE: "HIGH" },
};

function selectMission(
  pois: POI[],
  state: PatientState,
  from: LatLng,
  diff: MissionDifficulty = "standard",
  context: TodayContext = "auto"
): Mission | null {
  // sick / housebound days → indoor window quest, zero mobility pressure
  if (context !== "auto") return indoorMission(from, context);
  const eff = DIFF_SHIFT[diff][state] ?? state;
  // hard guardrail — nothing farther than 3.0 km may become a mission
  const local = guardNearby(pois, from, MAX_POI_DIST_M);
  const poi = nearestPoi(local, STATE_TO_TIER[eff], from);
  return poi ? missionFor(poi, from) : null;
}

/** closed-loop inference — weighted blend of the live signals */
export function inferState(b: Biometrics): PatientState {
  const score =
    b.hrv * 0.22 +
    b.sleepRegularity * 0.22 +
    b.voiceProsody * 0.15 +
    b.nlpSavoring * 0.18 +
    b.photoVibrancy * 0.13 +
    b.photoLuminance * 0.1;
  return score < 48 ? "LOW" : score < 68 ? "MODERATE" : "HIGH";
}

/** learning engine — module singleton, seeded with ~2 weeks of outcomes */
const engine = seededEngine();

export const useOtaStore = create<OtaStore>((set, get) => ({
  patientState: "LOW",
  biometrics: {
    hrv: 42,
    sleepRegularity: 63,
    voiceProsody: 55,
    nlpSavoring: 71,
    photoVibrancy: 66,
    photoLuminance: 58,
  },

  userPosition: DEFAULT_CENTER,
  gpsActive: false,
  locationSource: "demo",
  recenterTick: 0,
  // the dog starts on a little peeled patch of ground — never on mist
  walkedPath: [DEFAULT_CENTER],
  exploredCells: new Set<string>(),
  exploredPct: 0,
  pois: [],
  poisSource: null,
  poisLoading: false,
  activeMission: null,
  discoveredIds: new Set<string>(),
  memories: [],

  simRunning: false,
  drawerOpen: false,
  captureOpen: false,
  captureStep: 1,
  viewingMemoryId: null,
  offeredPoiId: null,
  echoMemoryId: null,
  baseline: null,
  baselineOpen: false,
  shareOpen: false,
  sensoryOpen: false,
  sensoryPlaying: false,
  justCapturedId: null,
  celebrated: new Set<number>(),
  careNudge: null,
  missionDifficulty: "standard",
  // persisted prefs hydrate post-mount (see hydrateFromStorage) — the
  // SSR pass and the client's first paint must render identical DOM
  comfortMotion: "full",
  comfortTheme: "day",
  dogName: null,
  dogHydrated: false,
  todayContext: "auto",
  iafHz: 10,
  preferredMusicStyle: "piano",
  bestLiftStyle: null,
  toasts: [],

  biometricHistory: seedHistory(),
  loopEvents: {},
  lastCapture: null,

  setPatientState: (s) => {
    queueMicrotask(() => get().loopEvent("INFER", `patient state → ${s}`));
    set((st) => ({
      patientState: s,
      activeMission: selectMission(st.pois, s, st.userPosition, st.missionDifficulty, st.todayContext),
      offeredPoiId: null,
    }));
  },

  setUserPosition: (p) => set({ userPosition: p }),
  setGpsActive: (on) => set({ gpsActive: on }),

  relocateTo: (p, source) =>
    set((st) => {
      const head = st.walkedPath[st.walkedPath.length - 1] ?? st.userPosition;
      // genuinely somewhere new → re-anchor the whole world there:
      // fresh mist patch, cleared coverage, POIs refetch nearby
      if (haversineM(head, p) > 800) {
        queueMicrotask(() => {
          get().loopEvent("SENSE", `location fix · ${source.toUpperCase()}`);
          get().loadPois(true);
          st.pushToast(
            source === "gps"
              ? "Found you on the map — the mist follows you now"
              : "Placed you near your city — tap the compass for a precise fix"
          );
        });
        return {
          userPosition: p,
          locationSource: source,
          gpsActive: source === "gps",
          walkedPath: [p],
          exploredCells: new Set<string>(),
          exploredPct: 0,
          discoveredIds: new Set<string>(),
          pois: [],
          poisSource: null,
          activeMission: null,
          offeredPoiId: null,
          recenterTick: st.recenterTick + 1,
        };
      }
      // close enough — keep the trail, just refresh the position
      return { userPosition: p, locationSource: source, gpsActive: source === "gps" ? true : st.gpsActive };
    }),

  locateNow: () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        get().relocateTo([pos.coords.latitude, pos.coords.longitude], "gps");
        set((st) => ({ recenterTick: st.recenterTick + 1 }));
      },
      () => {
        get().pushToast("GPS is shy — check browser permission, using best guess");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  },

  appendWalkPoint: (p) =>
    set((st) => {
      const last = st.walkedPath[st.walkedPath.length - 1];
      if (last && haversineM(last, p) < STEP_DEDUPE_M) return st;

      // grow coverage
      const exploredCells = new Set(st.exploredCells);
      for (const k of cellsCoveredBy(p[0], p[1])) exploredCells.add(k);
      const exploredPct = Math.min(100, (exploredCells.size / TOTAL_CELLS) * 100);

      // milestone celebrations — each threshold toasts exactly once
      const celebrated = new Set(st.celebrated);
      for (const [t, copy] of MILESTONES) {
        if (!celebrated.has(t) && st.exploredPct < t && exploredPct >= t) {
          celebrated.add(t);
          queueMicrotask(() => get().pushToast(copy));
        }
      }

      // POI discoveries → warm unlock toasts (no failures, only findings)
      const discoveredIds = new Set(st.discoveredIds);
      for (const poi of st.pois) {
        if (discoveredIds.has(poi.id)) continue;
        if (haversineM(p, [poi.lat, poi.lng]) <= DISCOVER_RADIUS_M) {
          discoveredIds.add(poi.id);
          queueMicrotask(() => get().pushToast(`Unlocked · ${poi.name}`));
        }
      }

      // live SENSE signal for the loop pipeline (throttled to every 8th point)
      if (st.walkedPath.length % 8 === 0) {
        const pct = exploredPct;
        queueMicrotask(() =>
          get().loopEvent("SENSE", `GPS mobility · ${pct.toFixed(1)}% peeled`)
        );
      }

      // gentle auto-open on arrival (≤35m of the mission POI), once per mission
      let arrivalPatch: Partial<OtaStore> = {};
      if (
        st.activeMission &&
        !st.captureOpen &&
        !st.viewingMemoryId &&
        st.offeredPoiId !== st.activeMission.poiId
      ) {
        const poi = st.pois.find((x) => x.id === st.activeMission!.poiId);
        if (poi && haversineM(p, [poi.lat, poi.lng]) <= 35) {
          arrivalPatch = { captureOpen: true, offeredPoiId: poi.id };
        }
      }

      return {
        walkedPath: [...st.walkedPath, p],
        userPosition: p,
        exploredCells,
        exploredPct,
        celebrated,
        discoveredIds,
        activeMission:
          st.activeMission ??
          selectMission(st.pois, st.patientState, p, st.missionDifficulty, st.todayContext),
        ...arrivalPatch,
      };
    }),

  loadPois: async (force = false) => {
    const { userPosition, poisLoading, poisSource } = get();
    if (poisLoading || (!force && poisSource === "live")) return;
    set({ poisLoading: true });
    const { pois, source } = await fetchPois(userPosition[0], userPosition[1]);
    set((st) => ({
      pois,
      poisSource: source,
      poisLoading: false,
      activeMission:
        st.activeMission ??
        selectMission(pois, st.patientState, st.userPosition, st.missionDifficulty, st.todayContext),
    }));
  },

  assignMissionTo: (poi) => {
    const st = get();
    // 3 km guardrail — a tap on a far pin gets a gentle nudge, not a mission
    if (haversineM(st.userPosition, [poi.lat, poi.lng]) > MAX_POI_DIST_M) {
      st.pushToast("That one's a bit far for today — try a spot closer by");
      return;
    }
    queueMicrotask(() => get().loopEvent("ACT", `mission → ${poi.name}`));
    set({ activeMission: missionFor(poi, st.userPosition), offeredPoiId: null });
  },

  hydrated: false,
  markHydrated: () => set({ hydrated: true }),
  patientId: "matti",
  setPatientId: (id) => set({ patientId: id }),

  applyClinicianMission: (m) => {
    const st = get();
    const mission: Mission = {
      poiId: `clin-${m.id}`,
      poiName: m.poiName,
      tier: (m.difficultyTier as Mission["tier"]) ?? "nature",
      distanceM: Math.round(
        haversineM(st.userPosition, [m.lat, m.lng]) / 10
      ) * 10,
      text: m.title,
      lat: m.lat,
      lng: m.lng,
      dbId: m.id,
      assignedBy: "CLINICIAN_CUSTOM",
      clinicianNote: m.clinicianNote ?? undefined,
      doctorName: m.doctorName ?? undefined,
      photoPrompt: m.photoPrompt ?? undefined,
      voicePrompt: m.voicePrompt ?? undefined,
      audioPairing: m.audioPairing ?? undefined,
    };
    set({ activeMission: mission, offeredPoiId: null });
    queueMicrotask(() => {
      get().loopEvent("ACT", `prescribed mission → ${m.poiName}`);
      st.pushToast(`${m.doctorName ?? "Your doctor"} sent you a mission — ${m.poiName}`);
    });
  },

  completeMission: () => {
    set((st) => ({
      activeMission: selectMission(st.pois, st.patientState, st.userPosition, st.missionDifficulty),
    }));
  },

  openCapture: (step) => set({ captureOpen: true, captureStep: step ?? 1 }),
  closeCapture: () => {
    set({ captureOpen: false, captureStep: 1 });
    // a freshly-tucked capsule drops its pin as the sheet folds away
    const id = get().justCapturedId;
    if (id)
      setTimeout(() => {
        set((s) => (s.justCapturedId === id ? { justCapturedId: null } : {}));
      }, 2600);
  },

  saveMemory: (m) => {
    set((st) => {
      const capsule: MemoryCapsule = {
        ...m,
        id: `mem-${Date.now()}`,
        lat: st.userPosition[0],
        lng: st.userPosition[1],
        poiName: st.activeMission?.poiName ?? "a quiet spot",
        at: Date.now(),
      };
      // feed the closed loop — captured signals nudge biometrics up gently
      const b = st.biometrics;
      const lift = (cur: number, sig?: number) =>
        sig == null ? cur : Math.round(Math.min(100, cur * 0.7 + sig * 0.3));
      queueMicrotask(() => {
        get().pushToast(`Memory tucked away · ${capsule.poiName}`);
        get().loopEvent("SENSE", "photo + voice biomarkers");
        get().loopEvent("INFER", "biometrics blended");
        const arm: ArmId = st.activeMission?.tier ?? "nature";
        get().recordOutcome(arm, {
          prosody: (capsule.acousticScore ?? 50) / 100 - b.voiceProsody / 100,
          savoring: (capsule.savoringScore ?? 50) / 100 - b.nlpSavoring / 100,
          mobility: 0.05,
          hrv: 0.02,
        });
      });
      const newBio = {
        ...b,
        photoVibrancy: lift(b.photoVibrancy, capsule.vibrancy),
        photoLuminance: lift(b.photoLuminance, capsule.luminance),
        voiceProsody: lift(b.voiceProsody, capsule.acousticScore),
        nlpSavoring: lift(b.nlpSavoring, capsule.savoringScore),
      };
      return {
        memories: [...st.memories, capsule],
        justCapturedId: capsule.id,
        biometrics: newBio,
        biometricHistory: mergeToday(
          st.biometricHistory,
          newBio,
          mobilityRadiusM(st.walkedPath)
        ),
        lastCapture: {
          transcript: capsule.transcript,
          savoringScore: capsule.savoringScore,
          valence: capsule.valence,
          themes: capsule.themes,
          acousticScore: capsule.acousticScore,
          luminance: capsule.luminance,
          vibrancy: capsule.vibrancy,
        },
      };
    });
  },

  viewMemory: (id) => set({ viewingMemoryId: id, echoMemoryId: null }),

  openEcho: (id) => set({ echoMemoryId: id, viewingMemoryId: null }),

  closeEcho: () => set({ echoMemoryId: null }),

  markEchoed: (id) => {
    queueMicrotask(() => get().loopEvent("LEARN", "recall reinforced · pin re-lit"));
    set((st) => ({
      memories: st.memories.map((m) => (m.id === id ? { ...m, echoedAt: Date.now() } : m)),
    }));
  },

  seedEchoMemories: () =>
    set((st) => {
      if (st.memories.some((m) => m.id.startsWith("seed-"))) {
        queueMicrotask(() => get().pushToast("Echo memories already seeded"));
        return st;
      }
      queueMicrotask(() => {
        get().pushToast("3 memories seeded — one has frosted into an Echo");
        get().loopEvent("SENSE", "3 capsules seeded");
      });
      return { memories: [...st.memories, ...buildSeedMemories(st.userPosition)] };
    }),

  loopEvent: (stage, label) =>
    set((st) => ({
      loopEvents: { ...st.loopEvents, [stage]: { stage, label, at: Date.now() } },
    })),

  recordOutcome: (arm, deltas) => {
    const st = get();
    engine.record(arm, currentContext(st.patientState), {
      prosody: 0.03,
      savoring: 0.04,
      mobility: 0,
      hrv: 0.03,
      ...deltas,
    });
    // real bandit persistence — the LEARN percentages reflect logged outcomes
    const reward = Math.max(
      -1,
      Math.min(
        1,
        ((deltas?.prosody ?? 0) + (deltas?.savoring ?? 0) +
          (deltas?.mobility ?? 0) + (deltas?.hrv ?? 0)) * 2
      )
    );
    void fetch("/api/bandit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: get().patientId, arm, reward }),
    }).catch(() => {});
    set((s2) => ({
      loopEvents: {
        ...s2.loopEvents,
        LEARN: { stage: "LEARN", label: `outcome → ${arm} arm`, at: Date.now() },
      },
      biometricHistory: mergeToday(
        s2.biometricHistory,
        s2.biometrics,
        mobilityRadiusM(s2.walkedPath)
      ),
    }));
  },

  updateBiometrics: (patch) =>
    set((st) => ({ biometrics: { ...st.biometrics, ...patch } })),

  inferredState: () => inferState(get().biometrics),

  startSimWalk: () => {
    if (get().simRunning) return;
    // the wander loops around wherever the user actually is right now
    const steps = interpolatedSteps(buildWalkLoop(get().userPosition), 10);
    let i = 0;
    set({ simRunning: true });
    get().appendWalkPoint(steps[0]);
    simTimer = setInterval(() => {
      i += 1;
      if (i >= steps.length) {
        if (simTimer) clearInterval(simTimer);
        simTimer = null;
        set({ simRunning: false });
        get().pushToast("A lovely 550 m wander — the mist remembers");
        return;
      }
      get().appendWalkPoint(steps[i]);
    }, 380);
  },

  resetWalk: () => {
    if (simTimer) {
      clearInterval(simTimer);
      simTimer = null;
    }
    const home = get().userPosition;
    set({
      // keep a fresh patch under the dog so it never stands on mist
      walkedPath: [home],
      exploredCells: new Set<string>(),
      exploredPct: 0,
      celebrated: new Set<number>(),
      discoveredIds: new Set<string>(),
      simRunning: false,
      userPosition: home,
    });
  },

  toggleDrawer: () => set((st) => ({ drawerOpen: !st.drawerOpen })),
  setBaseline: (b) => set({ baseline: b }),
  setBaselineOpen: (v) => set({ baselineOpen: v }),
  setShareOpen: (v) => set({ shareOpen: v }),
  setSensoryOpen: (v) => set({ sensoryOpen: v }),
  setSensoryPlaying: (v) => set({ sensoryPlaying: v }),

  applyDifficulty: (d) => {
    queueMicrotask(() =>
      get().loopEvent("ACT", `mission difficulty → ${d}`)
    );
    set((st) => ({
      missionDifficulty: d,
      activeMission: st.pois.length
        ? selectMission(st.pois, st.patientState, st.userPosition, d, st.todayContext)
        : st.activeMission,
      offeredPoiId: null,
    }));
    get().pushToast(
      d === "gentle"
        ? "Your care team softened today's path — gentler places ahead"
        : d === "stretch"
          ? "Your care team nudged the horizon a little further"
          : "Mission difficulty back to your own rhythm"
    );
  },

  setComfortMotion: (m) => {
    set({ comfortMotion: m });
    try {
      localStorage.setItem(
        COMFORT_KEY,
        JSON.stringify({ motion: m, theme: get().comfortTheme })
      );
    } catch {}
  },

  setComfortTheme: (t) => {
    set({ comfortTheme: t });
    try {
      localStorage.setItem(
        COMFORT_KEY,
        JSON.stringify({ motion: get().comfortMotion, theme: t })
      );
    } catch {}
  },

  setDogName: (name) => {
    const v = name?.trim().slice(0, 24) || null;
    set({ dogName: v });
    try {
      if (v) localStorage.setItem(DOG_KEY, v);
      else localStorage.removeItem(DOG_KEY);
    } catch {}
  },

  setTodayContext: (c) => {
    set((st) => {
      const patch: Partial<OtaStore> = { todayContext: c };
      if (c !== "auto") {
        patch.activeMission = indoorMission(st.userPosition, c);
        patch.offeredPoiId = null;
      } else {
        patch.activeMission = selectMission(
          st.pois, st.patientState, st.userPosition, st.missionDifficulty, "auto"
        );
      }
      return patch;
    });
    queueMicrotask(() => {
      get().loopEvent("ACT", `today's context → ${c}`);
      if (c === "sick")
        get().pushToast("Rest day marked — gentle indoor quests, your care team sees you're okay");
      if (c === "housebound")
        get().pushToast("Staying in today — the window becomes the world");
    });
    // tell the care team — low mobility today is illness, not relapse
    void fetch(`/api/patients/matti`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contextFlag: c }),
    }).catch(() => {});
  },

  setIafHz: (hz) => {
    const v = Math.min(12.5, Math.max(8, hz));
    set({ iafHz: +v.toFixed(1) });
    try {
      localStorage.setItem("otapath-iaf", String(+v.toFixed(1)));
    } catch {}
  },

  setMusicStyle: (s) => {
    if (!isMusicStyle(s)) return;
    set({ preferredMusicStyle: s });
    try {
      localStorage.setItem(MUSIC_KEY, s);
    } catch {}
    // persist on the patient row — the vibe travels with the patient
    void fetch(`/api/patients/${get().patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredMusicStyle: s }),
    }).catch(() => {});
  },

  setBestLiftStyle: (s) => set({ bestLiftStyle: s }),

  setCapsuleSoundscape: (id, url, style) => {
    set((st) => ({
      memories: st.memories.map((m) =>
        m.id === id ? { ...m, soundscapeUrl: url, musicStyle: style } : m
      ),
    }));
    void fetch("/api/memories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, patientId: get().patientId, soundscapeUrl: url, musicStyle: style }),
    }).catch(() => {});
  },

  hydrateFromStorage: () => {
    if (get().dogHydrated) return;
    const c = loadComfort();
    let iaf = 10;
    let music: MusicStyleId = "piano";
    try {
      const v = parseFloat(localStorage.getItem("otapath-iaf") ?? "");
      if (v >= 8 && v <= 12.5) iaf = v;
      const ms = localStorage.getItem(MUSIC_KEY);
      if (isMusicStyle(ms)) music = ms;
    } catch {}
    set({
      dogName: loadDogName(),
      comfortMotion: c.motion,
      comfortTheme: c.theme,
      iafHz: iaf,
      preferredMusicStyle: music,
      dogHydrated: true,
    });
  },

  pushToast: (text) => {
    const id = ++toastSeq;
    set((st) => ({ toasts: [...st.toasts.slice(-2), { id, text }] }));
    setTimeout(() => {
      set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) }));
    }, 4200);
  },
}));

// dev/stage hook: drive the store from the console for demos & tests
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as unknown as { __ota: typeof useOtaStore }).__ota = useOtaStore;
}

/* ------------------------------------------------------------------ */
/* Closed-loop publisher — debounced snapshot → BroadcastChannel +     */
/* localStorage so /clinician & /demo (other tabs / iframes) stay live */
/* ------------------------------------------------------------------ */
if (typeof window !== "undefined") {
  let timer = 0;
  useOtaStore.subscribe(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const st = useOtaStore.getState();
      const history = st.biometricHistory;
      publishSnapshot({
        v: 1,
        at: Date.now(),
        patientState: st.patientState,
        biometrics: st.biometrics,
        mobilityM: mobilityRadiusM(st.walkedPath),
        memoryCount: st.memories.length,
        recentMemories: st.memories.slice(-6).map((m) => ({
          id: m.id,
          poiName: m.poiName,
          at: m.at,
          kind: m.kind,
          themes: m.themes,
          savoringScore: m.savoringScore,
        })),
        history,
        triage: computeTriage(history, st.todayContext),
        insight: engine.insight(),
        loopEvents: st.loopEvents,
        lastCapture: st.lastCapture,
        baseline: st.baseline,
        simRunning: st.simRunning,
        dogName: st.dogName,
        comfortMotion: st.comfortMotion,
        comfortTheme: st.comfortTheme,
        exploredPct: st.exploredPct,
        activeMissionName: st.activeMission?.poiName ?? null,
        userPosition: st.userPosition,
        locationSource: st.locationSource,
        contextFlag: st.todayContext,
        iafHz: st.iafHz,
      });
    }, 220);
  });

  // clinician → patient: warm check-ins + mission-difficulty tuning.
  // Anything on the nudge channel is supportive — no alarms, ever.
  if ("BroadcastChannel" in window) {
    const nbc = new BroadcastChannel(NUDGE_CHANNEL);
    nbc.onmessage = (e) => {
      const msg = e.data as NudgeMsg | undefined;
      if (!msg) return;
      const st = useOtaStore.getState();
      if (msg.type === "checkin") {
        useOtaStore.setState({ careNudge: { kind: "checkin", at: Date.now() } });
        st.pushToast("A warm check-in arrived — your care team is thinking of you");
        setTimeout(() => {
          useOtaStore.setState((s) => (s.careNudge?.kind === "checkin" ? { careNudge: null } : {}));
        }, 14_000);
      }
      if (msg.type === "difficulty" && msg.level) st.applyDifficulty(msg.level);
    };

    // stage-demo → patient: the /demo control panel drives this app
    // over BroadcastChannel (same origin, works across the iframe)
    const dbc = new BroadcastChannel(DEMO_CHANNEL);
    dbc.onmessage = (e) => {
      const m = e.data as DemoMsg | undefined;
      if (!m) return;
      const st = useOtaStore.getState();
      switch (m.t) {
        case "walk": st.startSimWalk(); break;
        case "reset": st.resetWalk(); break;
        case "seed": st.seedEchoMemories(); break;
        case "baseline": st.setBaselineOpen(true); break;
        case "state": st.setPatientState(m.s); break;
        case "dog": st.setDogName(m.name); break;
        case "motion": st.setComfortMotion(m.v); break;
        case "theme": st.setComfortTheme(m.v); break;
        case "locate": st.locateNow(); break;
        case "context": st.setTodayContext(m.v); break;
        case "iaf": st.setIafHz(m.hz); break;
        case "sensory": st.setSensoryOpen(m.open); break;
        case "capture":
          if (m.open) st.openCapture(m.step);
          else st.closeCapture();
          break;
      }
    };
  }
}
