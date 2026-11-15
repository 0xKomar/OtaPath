"use client";

/**
 * ClinicianActions — the right-hand inspector rail. Hairline-divided
 * sections (no card nesting): Active Mission, guardrails, warm
 * check-in, and a tick-bar learning readout computed from real capsules.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { BarChart3, ChevronLeft, ChevronRight, Compass, HeartHandshake, Send, ShieldCheck, Thermometer, Waves } from "lucide-react";
import { api, type PatientDetail } from "@/lib/api";
import { DEMO_CHANNEL, publishNudge, type DemoMsg } from "@/lib/broadcast";
import { useClinicianFeed } from "@/lib/useClinicianFeed";
import { TickBar } from "./TickBar";

const MissionBuilderLazy = dynamic(
  () => import("./MissionBuilder").then((m) => m.MissionBuilder),
  { ssr: false }
);

/** symmetric option box — stepper control, identical shape for every
 *  guardrail so the rail reads evenly */
function Stepper<T extends string>({
  title,
  sub,
  value,
  options,
  onChange,
  disabled,
}: {
  title: string;
  sub: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const i = options.findIndex((o) => o.id === value);
  const step = (dir: 1 | -1) =>
    onChange(options[(i + dir + options.length) % options.length].id);
  return (
    <div className="rounded-lg border border-[#E6E6E3] bg-white p-3">
      <p className="font-sans text-[11px] font-semibold text-zinc-800">{title}</p>
      <p className="mb-2 font-sans text-[9.5px] font-medium leading-snug text-zinc-400">{sub}</p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => step(-1)}
          aria-label="Previous option"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#E6E6E3] bg-white text-zinc-500 transition-colors hover:border-zinc-300 disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
        <div className="flex h-7 min-w-0 flex-1 items-center justify-center rounded-md bg-[#F4F4F2] px-2">
          <span className="truncate text-center font-sans text-[10px] font-bold text-zinc-700">
            {options[i]?.label}
          </span>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => step(1)}
          aria-label="Next option"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#E6E6E3] bg-white text-zinc-500 transition-colors hover:border-zinc-300 disabled:opacity-40"
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>
      <div className="mt-1.5 flex justify-center gap-1">
        {options.map((o, j) => (
          <span
            key={o.id}
            className={`h-1 w-1 rounded-full ${j === i ? "bg-[#F59E0B]" : "bg-[#E4E4E7]"}`}
          />
        ))}
      </div>
    </div>
  );
}

const AUTONOMY = [
  { id: "gentle", label: "Gentle only · ≤500m" },
  { id: "standard", label: "Balanced" },
  { id: "stretch", label: "Full range" },
] as const;

const SENSITIVITY = [
  { id: "low", label: "Quiet · 4 days" },
  { id: "standard", label: "Standard · 3 days" },
  { id: "high", label: "Watchful · 2 days" },
] as const;

const TIER_LABEL: Record<string, string> = { nature: "nature", culture: "culture", sport: "sport" };

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[#E6E6E3] px-4 py-4 last:border-b-0">
      <p className="flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {title}
      </p>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

const TAG = "rounded-md border border-[#E6E6E3] bg-zinc-50 px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wide text-zinc-500";

export function ClinicianActions({
  detail,
  onChanged,
}: {
  detail: PatientDetail;
  onChanged: () => void;
}) {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nudgeMsg, setNudgeMsg] = useState("");
  const [nudgeSentAt, setNudgeSentAt] = useState<number | null>(null);
  const [iaf, setIaf] = useState<number>(detail.patient.iafHz ?? detail.override.iafHz ?? 10);
  const [arms, setArms] = useState<{ arm: string; weight: number; pulls: number }[]>([]);
  const feed = useClinicianFeed();
  const patientPosition = feed.userPosition;
  const { patient, override, activeMission, memories } = detail;
  const doctor = override.doctorName || "Dr. Lindqvist";

  /* live bandit weights — the loop's real learned preferences */
  useEffect(() => {
    let dead = false;
    const load = () =>
      api
        .banditArms(patient.id)
        .then((r) => { if (!dead) setArms(r.arms); })
        .catch(() => {});
    load();
    const t = setInterval(load, 10000);
    return () => { dead = true; clearInterval(t); };
  }, [patient.id]);

  /** retune IAF — persists to the DB and beams to the phone instantly */
  async function tuneIaf(hz: number) {
    const v = +hz.toFixed(1);
    setIaf(v);
    try {
      new BroadcastChannel(DEMO_CHANNEL).postMessage({ t: "iaf", hz: v } satisfies DemoMsg);
    } catch {}
    await patch({ override: { iafHz: v } });
  }

  const patch = async (o: Parameters<typeof api.patchPatient>[1]) => {
    setBusy(true);
    try {
      await api.patchPatient(patient.id, o);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  async function sendNudge() {
    const msg = nudgeMsg.trim();
    if (!msg) return;
    await api.sendNudge(patient.id, doctor, msg);
    publishNudge({ type: "checkin" }); // instant same-device delivery
    setNudgeMsg("");
    setNudgeSentAt(Date.now());
    setTimeout(() => setNudgeSentAt(null), 4000);
  }

  /* honest "what works" readout — capsules grouped by tier, avg savoring */
  const byTier = new Map<string, { n: number; sum: number }>();
  for (const m of memories) {
    const t = m.poiType in TIER_LABEL ? m.poiType : "nature";
    const cur = byTier.get(t) ?? { n: 0, sum: 0 };
    cur.n += 1;
    cur.sum += m.savoringScore ?? 0;
    byTier.set(t, cur);
  }
  const learning = [...byTier.entries()]
    .filter(([, v]) => v.n > 0)
    .map(([t, v]) => ({ tier: t, n: v.n, avg: Math.round(v.sum / v.n) }))
    .sort((a, b) => b.avg - a.avg);

  return (
    <div className="flex flex-col">
      {/* active mission */}
      <Section icon={Compass} title="Active mission">
        {activeMission ? (
          <div>
            <p className="font-sans text-[13px] font-semibold tracking-[-0.01em] text-zinc-900">
              {activeMission.poiName}
            </p>
            <p className="mt-0.5 font-sans text-[11px] font-medium leading-snug text-zinc-500">
              {activeMission.title}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className={TAG}>
                {activeMission.assignedBy === "CLINICIAN_CUSTOM"
                  ? `prescribed · ${activeMission.doctorName ?? "you"}`
                  : "closed-loop"}
              </span>
              <span className={TAG}>{TIER_LABEL[activeMission.difficultyTier] ?? activeMission.difficultyTier}</span>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await api.patchMission(activeMission.id, { status: "SUPERSEDED" });
                  setBusy(false);
                  onChanged();
                }}
                className="ml-auto font-sans text-[10px] font-semibold text-zinc-400 underline underline-offset-2 hover:text-zinc-600"
              >
                withdraw
              </button>
            </div>
          </div>
        ) : (
          <p className="font-sans text-[11px] font-medium leading-snug text-zinc-500">
            No mission live — the loop will assign one on the patient&rsquo;s next move.
          </p>
        )}
        <button
          type="button"
          onClick={() => setBuilderOpen(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#FF6B2B] px-3 py-2 font-sans text-[12px] font-bold text-white transition-colors hover:bg-orange-600"
        >
          <Compass className="h-3.5 w-3.5" strokeWidth={2.5} />
          Prescribe custom mission
        </button>

        {/* patient-marked context — mobility alerts paused, not relapse */}
        {patient.contextFlag && patient.contextFlag !== "auto" && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <Thermometer className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" strokeWidth={2.5} />
            <p className="font-sans text-[11px] font-medium leading-snug text-amber-800">
              {patient.contextFlag === "sick"
                ? `${patient.name.split(" ")[0]} marked themselves physically unwell — mobility alerts paused, indoor quest assigned.`
                : `${patient.name.split(" ")[0]} is staying indoors today — window quest assigned, drift alerts muted.`}
            </p>
          </div>
        )}
      </Section>

      {/* EEG tuning — Individual Alpha Frequency for the binaural layer */}
      <Section icon={Waves} title="Entrainment tuning">
        <div className="flex items-center gap-3 rounded-lg border border-[#E6E6E3] bg-white p-3">
          <div className="min-w-0 flex-1">
            <p className="font-sans text-[11px] font-semibold text-zinc-800">
              Individual Alpha Frequency
            </p>
            <p className="font-sans text-[9.5px] font-medium leading-snug text-zinc-400">
              Calibrated at discharge — retunes the patient&rsquo;s binaural beat live
            </p>
            <input
              type="range"
              min={8}
              max={12.5}
              step={0.1}
              value={iaf}
              onChange={(e) => void tuneIaf(parseFloat(e.target.value))}
              className="mt-2 w-full accent-[#FF6B2B]"
              aria-label="Individual Alpha Frequency"
            />
            <div className="flex justify-between font-sans text-[9px] font-medium text-zinc-400">
              <span>8.0 Hz</span>
              <span>12.5 Hz</span>
            </div>
          </div>
          <span className="w-16 shrink-0 rounded-lg bg-[#F4F4F2] px-2 py-2 text-center font-sans text-[15px] font-bold tabular-nums text-zinc-800">
            {iaf.toFixed(1)}
          </span>
        </div>
      </Section>

      {/* guardrails */}
      <Section icon={ShieldCheck} title="Closed-loop guardrails">
        <div className="grid grid-cols-1 gap-2">
          <Stepper
            title="Max stimulus tier"
            sub="Farthest mission category the loop may prescribe"
            value={override.autonomy ?? "standard"}
            options={AUTONOMY}
            disabled={busy}
            onChange={(v) => patch({ override: { autonomy: v } })}
          />
          <Stepper
            title="Relapse alert sensitivity"
            sub="Consecutive falling days before a drift flag fires"
            value={override.relapseSensitivity ?? "standard"}
            options={SENSITIVITY}
            disabled={busy}
            onChange={(v) => patch({ override: { relapseSensitivity: v } })}
          />
        </div>
        <p className="mt-1.5 font-sans text-[10px] font-medium leading-snug text-zinc-400">
          Guardrails bound what the closed loop may prescribe — alerts fire when vocal
          variance & savoring drift below baseline for that many consecutive days.
        </p>
      </Section>

      {/* warm check-in */}
      <Section icon={HeartHandshake} title="Warm check-in">
        <textarea
          rows={2}
          value={nudgeMsg}
          onChange={(e) => setNudgeMsg(e.target.value)}
          placeholder={`A short, kind line to ${patient.name.split(" ")[0]}’s phone…`}
          className="w-full resize-none rounded-lg border border-[#E6E6E3] bg-white px-3 py-2 font-sans text-[12px] font-medium text-zinc-800 placeholder:text-zinc-300 focus:border-zinc-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={sendNudge}
          disabled={!nudgeMsg.trim()}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#18181B] px-3 py-2 font-sans text-[12px] font-bold text-white transition-colors hover:bg-zinc-800 disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" strokeWidth={2.5} />
          {nudgeSentAt ? "Sent — warming their screen" : "Send check-in"}
        </button>
      </Section>

      {/* bandit arms — what the loop has actually learned works */}
      {arms.length > 0 && (
        <Section icon={BarChart3} title="Bandit arms (learned)">
          <div className="space-y-1.5">
            {arms.map((a) => {
              const pct = Math.round(50 + a.weight * 50);
              return (
                <div key={a.arm} className="flex items-center gap-2">
                  <span className="w-14 shrink-0 font-sans text-[10px] font-semibold capitalize text-zinc-500">
                    {a.arm}
                  </span>
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#F4F4F2]">
                    <div
                      className={`h-full rounded-full ${a.weight >= 0 ? "bg-emerald-500" : "bg-orange-400"}`}
                      style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right font-sans text-[9.5px] font-bold tabular-nums text-zinc-500">
                    {a.weight >= 0 ? "+" : ""}{(a.weight * 100).toFixed(0)}% · {a.pulls}×
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* learning readout — vertical tick bars */}
      {learning.length > 0 && (
        <Section icon={BarChart3} title={`What lifts ${patient.name.split(" ")[0]}`}>
          <div className="space-y-2.5">
            {learning.map((l) => (
              <div key={l.tier} className="flex items-center gap-3">
                <span className="w-14 shrink-0 font-sans text-[11px] font-semibold capitalize text-zinc-600">
                  {l.tier}
                </span>
                <TickBar pct={l.avg} />
                <span className="shrink-0 font-sans text-[10px] font-bold tabular-nums text-zinc-500">
                  {l.avg} · {l.n}×
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2.5 font-sans text-[10px] font-medium leading-snug text-zinc-400">
            Mean savoring score per capsule, grouped by mission tier.
          </p>
        </Section>
      )}

      {builderOpen && (
        <MissionBuilderLazy
          patientId={patient.id}
          doctorName={doctor}
          patientPosition={patientPosition}
          onClose={() => setBuilderOpen(false)}
          onSent={() => {
            setBuilderOpen(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
