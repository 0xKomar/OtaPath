"use client";

/**
 * MissionBuilder — the "Prescribe Custom Mission" drawer. One focused
 * surface: where (map/POI), what to hunt (photo prompt), what to say
 * (voice prompt), the audio pairing, and a warm note. Sends to the
 * patient's OtaPath instantly via POST /api/missions.
 */

import dynamic from "next/dynamic";
import { useState } from "react";
import { Send, X } from "lucide-react";
import { api } from "@/lib/api";
import type { PickPoint } from "./MissionMapPicker";

const Picker = dynamic(() => import("./MissionMapPicker").then((m) => m.MissionMapPicker), {
  ssr: false,
  loading: () => <div className="h-52 w-full animate-pulse rounded-xl bg-zinc-100" />,
});

const AUDIO_OPTIONS = [
  "10Hz Alpha Uplift",
  "6Hz Theta Calm",
  "ElevenLabs Custom Ambient",
] as const;

const TIERS = [
  { id: "nature", label: "Gentle nature" },
  { id: "culture", label: "Social & cultural" },
  { id: "sport", label: "Physical" },
] as const;

const FIELD =
  "w-full rounded-lg border border-[#E6E6E3] bg-white px-3 py-2 font-sans text-[13px] font-medium text-zinc-800 placeholder:text-zinc-300 focus:border-zinc-400 focus:outline-none";
const LABEL = "mb-1 block font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400";

export function MissionBuilder({
  patientId,
  doctorName,
  patientPosition,
  onClose,
  onSent,
}: {
  patientId: string;
  doctorName: string;
  /** patient's live [lat,lng] — the map anchors here + 3 km guard feed */
  patientPosition?: [number, number];
  onClose: () => void;
  onSent: () => void;
}) {
  const [pick, setPick] = useState<PickPoint | null>(null);
  const [title, setTitle] = useState("");
  const [photoPrompt, setPhotoPrompt] = useState("");
  const [voicePrompt, setVoicePrompt] = useState("Tell me how the air felt on your walk today");
  const [audio, setAudio] = useState<(typeof AUDIO_OPTIONS)[number]>("10Hz Alpha Uplift");
  const [note, setNote] = useState("");
  const [tier, setTier] = useState<(typeof TIERS)[number]["id"]>("nature");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!pick || sending) return;
    setSending(true);
    try {
      await api.createMission({
        patientId,
        title:
          title.trim() ||
          `Take a gentle walk to ${pick.poiName} — find one vivid thing and capture it.`,
        photoPrompt: photoPrompt.trim() || `Find something at ${pick.poiName} that catches your eye`,
        voicePrompt: voicePrompt.trim() || undefined,
        poiName: pick.poiName,
        poiCategory: pick.poiName === "a custom spot" ? tier : pick.tier,
        difficultyTier: pick.poiName === "a custom spot" ? tier : pick.tier,
        lat: pick.lat,
        lng: pick.lng,
        assignedBy: "CLINICIAN_CUSTOM",
        clinicianNote: note.trim() || undefined,
        doctorName,
        audioPairing: audio,
        patientLat: patientPosition?.[0],
        patientLng: patientPosition?.[1],
      });
      onSent();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="toast-in fixed inset-0 z-[2000] flex items-end justify-center bg-zinc-950/30 p-3 md:items-center">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col gap-3.5 overflow-y-auto rounded-2xl border border-[#E6E6E3] bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-orange-600">
              Prescribe custom mission
            </p>
            <h3 className="mt-0.5 font-sans text-xl font-semibold tracking-[-0.02em] text-zinc-900">
              A gentle errand, <span className="text-zinc-400">from you</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6E6E3] bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-800"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <Picker
          value={pick}
          center={patientPosition}
          onPick={(p) => { setPick(p); setTier(p.tier); }}
        />

        {pick?.poiName === "a custom spot" && (
          <div className="flex gap-1.5">
            {TIERS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTier(t.id)}
                className={`flex-1 rounded-lg border px-2 py-1.5 font-sans text-[10px] font-bold transition-colors ${
                  tier === t.id
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-[#E6E6E3] bg-white text-zinc-500 hover:border-zinc-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <label className="block">
          <span className={LABEL}>Mission</span>
          <input
            className={FIELD}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={pick ? `Take a gentle walk to ${pick.poiName}…` : "Pick a spot on the map first"}
          />
        </label>
        <label className="block">
          <span className={LABEL}>Photo-hunt prompt</span>
          <input
            className={FIELD}
            value={photoPrompt}
            onChange={(e) => setPhotoPrompt(e.target.value)}
            placeholder="Snap the afternoon poster at Kinopoli Cinema"
          />
        </label>
        <label className="block">
          <span className={LABEL}>10s voice-reflection prompt</span>
          <input
            className={FIELD}
            value={voicePrompt}
            onChange={(e) => setVoicePrompt(e.target.value)}
          />
        </label>
        <label className="block">
          <span className={LABEL}>Sensory audio pairing</span>
          <select className={FIELD} value={audio} onChange={(e) => setAudio(e.target.value as typeof audio)}>
            {AUDIO_OPTIONS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={LABEL}>Note from you — optional, goes on the mission card</span>
          <textarea
            className={`${FIELD} resize-none`}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Hi Matti — your energy looked steadier this week. Let's try the cinema you mentioned!"
          />
        </label>

        <button
          type="button"
          onClick={send}
          disabled={!pick || sending}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#18181B] px-4 py-3 font-sans text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:opacity-40"
        >
          <Send className="h-4 w-4" strokeWidth={2.5} />
          {sending ? "Sending…" : `Send to ${patientId === "matti" ? "Matti" : "patient"}'s OtaPath`}
        </button>
      </div>
    </div>
  );
}
