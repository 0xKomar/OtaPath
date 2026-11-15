/**
 * useBackendSync — the patient app's persistence + real-time layer.
 * On mount: hydrates from the server once (memories, baseline,
 * clinician mission, guardrails). Then every 8s polls for new
 * clinician missions, warm nudges, and override changes — so a
 * prescription written on /clinician lands on the patient's phone.
 * Also mirrors every local save/assign back to the API.
 * BroadcastChannel still handles instant same-device sync.
 */

"use client";

import { useEffect, useRef } from "react";
import { api, toDataUrl } from "./api";
import { mobilityRadiusM } from "./biometricHistory";
import { useOtaStore } from "@/store/useOtaStore";
import { NUDGE_CHANNEL, type NudgeMsg } from "./broadcast";
import { isMusicStyle, type MusicStyleId } from "./musicTaste";

const POLL_MS = 8000;
/** the signed-in patient — AuthGate resolves it before screens mount;
 *  read live so a different account just works */
const PATIENT = () => useOtaStore.getState().patientId;

export function useBackendSync() {
  const posted = useRef(new Set<string>());
  const appliedMission = useRef<string | null>(null);
  const appliedDifficulty = useRef<string | null>(null);

  /* --- hydrate once ------------------------------------------------ */
  useEffect(() => {
    if (useOtaStore.getState().hydrated) return;
    let dead = false;
    (async () => {
      try {
        const d = await api.patient(PATIENT());
        if (dead) return;
        const st = useOtaStore.getState();
        const known = new Set(st.memories.map((m) => m.id));
        const incoming = d.memories
          .filter((m) => !known.has(m.id))
          .map((m) => {
            posted.current.add(m.id);
            return {
              id: m.id,
              lat: m.lat,
              lng: m.lng,
              poiName: m.locationName,
              kind: (m.kind as "photo" | "voice" | "moment") ?? "moment",
              at: m.createdAt,
              photoUrl: m.photoUrl ?? undefined,
              audioUrl: m.audioUrl ?? undefined,
              audioDurS: m.audioDurS ?? undefined,
              transcript: m.transcript ?? undefined,
              luminance: m.luminanceScore ?? undefined,
              vibrancy: m.vibrancyScore ?? undefined,
              palette: m.palette ? (JSON.parse(m.palette) as string[]) : undefined,
              acousticScore: m.acousticScore ?? undefined,
              f0Hz: m.f0Hz ?? undefined,
              f0SdHz: m.f0SdHz ?? undefined,
              acousticDelta: m.acousticDelta ?? undefined,
              savoringScore: m.savoringScore ?? undefined,
              valence: m.valence ?? undefined,
              themes: m.themes ? (JSON.parse(m.themes) as string[]) : undefined,
              soundscapePrompt: m.soundscapePrompt ?? undefined,
              soundscapeUrl: m.soundscapeUrl ?? undefined,
              musicStyle: isMusicStyle(m.musicStyle) ? m.musicStyle : undefined,
              echoedAt: m.echoedAt ?? undefined,
            };
          });
        useOtaStore.setState((s) => ({
          memories: [...s.memories, ...incoming].sort((a, b) => a.at - b.at),
          baseline: s.baseline ?? { luminance: 50, sleep: 60, ...d.baseline, at: Date.now() },
        }));
        if (d.override.autonomy && d.override.autonomy !== "standard") {
          appliedDifficulty.current = d.override.autonomy;
          st.applyDifficulty(d.override.autonomy);
        }
        // clinician-tuned IAF beats localStorage — the doctor's setting wins
        const iaf = d.patient?.iafHz ?? d.override.iafHz;
        if (typeof iaf === "number" && iaf >= 8 && iaf <= 12.5)
          st.setIafHz(iaf);
        // saved soundtrack vibe travels with the patient record
        const vibe = (d.patient as { preferredMusicStyle?: string } | undefined)
          ?.preferredMusicStyle;
        if (isMusicStyle(vibe) && vibe !== st.preferredMusicStyle)
          useOtaStore.setState({ preferredMusicStyle: vibe });
        // closed-loop "Best lift" — strongest m-* bandit arm wins the badge
        void api
          .banditArms(PATIENT())
          .then(({ arms }) => {
            let best: MusicStyleId | null = null;
            let w = 0;
            for (const a of arms) {
              const id = a.arm.replace(/^m-/, "") as MusicStyleId;
              if (a.arm.startsWith("m-") && isMusicStyle(id) && a.weight > w) {
                w = a.weight;
                best = id;
              }
            }
            if (best) st.setBestLiftStyle(best);
          })
          .catch(() => {});
        const m = d.activeMission;
        if (m && m.assignedBy === "CLINICIAN_CUSTOM") {
          appliedMission.current = m.id;
          st.applyClinicianMission(m);
        }
        useOtaStore.getState().markHydrated();
      } catch {
        useOtaStore.getState().markHydrated(); // offline — stay local
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  /* --- poll: clinician missions, nudges, guardrails ----------------- */
  useEffect(() => {
    let dead = false;
    const tick = async () => {
      try {
        const st = useOtaStore.getState();
        const { missions } = await api.missions(PATIENT(), "ACTIVE");
        const m = missions.find((x) => x.assignedBy === "CLINICIAN_CUSTOM");
        if (!dead && m && m.id !== appliedMission.current && m.id !== st.activeMission?.dbId) {
          appliedMission.current = m.id;
          st.applyClinicianMission(m);
          try {
            new BroadcastChannel(NUDGE_CHANNEL).postMessage({ type: "checkin", at: Date.now() } satisfies NudgeMsg);
          } catch {}
        }
        const { nudges } = await api.nudges(PATIENT(), true);
        for (const n of nudges.reverse()) {
          if (dead) break;
          useOtaStore.setState({ careNudge: { kind: "checkin", at: Date.now() } });
          st.pushToast(n.message);
          void api.ackNudge(n.id).catch(() => {});
          setTimeout(() => {
            useOtaStore.setState((s) => (s.careNudge?.kind === "checkin" ? { careNudge: null } : {}));
          }, 14_000);
        }
      } catch {}
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  /* --- persist new capsules ---------------------------------------- */
  const memories = useOtaStore((s) => s.memories);
  const hydrated = useOtaStore((s) => s.hydrated);
  useEffect(() => {
    if (!hydrated) return;
    for (const m of memories) {
      if (posted.current.has(m.id)) continue;
      posted.current.add(m.id);
      void (async () => {
        const st = useOtaStore.getState();
        const [photoUrl, audioUrl] = await Promise.all([
          toDataUrl(m.photoUrl),
          toDataUrl(m.audioUrl),
        ]);
        try {
          await api.postMemory({
            id: m.id,
            patientId: PATIENT(),
            lat: m.lat,
            lng: m.lng,
            locationName: m.poiName,
            poiType: st.activeMission?.tier ?? m.kind,
            kind: m.kind,
            photoUrl,
            audioUrl,
            audioDurS: m.audioDurS,
            transcript: m.transcript,
            acousticScore: m.acousticScore,
            savoringScore: m.savoringScore,
            luminance: m.luminance,
            vibrancy: m.vibrancy,
            palette: m.palette,
            f0Hz: m.f0Hz,
            f0SdHz: m.f0SdHz,
            acousticDelta: m.acousticDelta,
            valence: m.valence,
            themes: m.themes,
            soundscapePrompt: m.soundscapePrompt,
            soundscapeUrl: m.soundscapeUrl,
            musicStyle: m.musicStyle,
            mobility: Math.round(mobilityRadiusM(st.walkedPath)),
            createdAt: m.at,
          });
          st.completeMission();
        } catch {
          posted.current.delete(m.id); // retry next change
        }
      })();
    }
  }, [memories, hydrated]);

  /* --- mirror locally-assigned missions to the DB ------------------- */
  const mission = useOtaStore((s) => s.activeMission);
  useEffect(() => {
    if (!hydrated || !mission || mission.dbId) return;
    const key = `ai-${mission.poiId}-${mission.tier}`;
    if (posted.current.has(key)) return;
    posted.current.add(key);
    void api
      .createMission({
        id: `msn-ai-${Date.now()}`,
        patientId: PATIENT(),
        title: mission.text,
        poiName: mission.poiName,
        poiCategory: mission.tier,
        difficultyTier: mission.tier,
        lat: mission.lat ?? 0,
        lng: mission.lng ?? 0,
        assignedBy: "AI_CLOSED_LOOP",
        patientLat: useOtaStore.getState().userPosition[0],
        patientLng: useOtaStore.getState().userPosition[1],
      })
      .then(() => {
        // tag the local mission so we don't re-post
        useOtaStore.setState((s) =>
          s.activeMission && !s.activeMission.dbId && s.activeMission.poiId === mission.poiId
            ? { activeMission: { ...s.activeMission, dbId: key } }
            : {}
        );
      })
      .catch(() => posted.current.delete(key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission?.poiId, mission?.tier, hydrated]);
}
