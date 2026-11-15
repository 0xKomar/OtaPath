"use client";

/**
 * ClinicianBoard — zero-workload patient detail (shared by /clinician
 * and the /demo right panel). Renders a LoopSnapshot: the live feed
 * by default, or a passed-in snapshot for cohort patients. Warm-paper
 * styling throughout — triage color appears only in the status pill.
 */

import { useState, type ReactNode } from "react";
import { Activity, Brain, HeartHandshake, MapPin, Moon, Radio, Thermometer } from "lucide-react";
import { useClinicianFeed } from "@/lib/useClinicianFeed";
import { useNow } from "@/lib/useNow";
import { dischargeBaseline, type DaySnapshot } from "@/lib/biometricHistory";
import { publishNudge, type LoopSnapshot } from "@/lib/broadcast";
import type { CohortPatient } from "@/lib/patients";
import { TRIAGE_LABEL } from "@/lib/patients";
import { Sparkline } from "./Sparkline";

function daysAgo(at: number, now: number) {
  const d = Math.round((now - at) / 86_400_000);
  return d === 0 ? "today" : d === 1 ? "1d ago" : `${d}d ago`;
}

/** richer clinical language per status (spec's zero-workload brief) */
function brief(snap: LoopSnapshot, p?: CohortPatient): string {
  if (snap.history.length === 0)
    return "Newly linked — pairing confirmed: the app is connected and biomarkers, missions, and capsules appear here as soon as the patient starts using it.";
  const s = snap.triage.summary;
  if (snap.triage.level === "INTERVENTION")
    return `Early Relapse Drift Detected (72h trend): ${s
      .replace(/^3-day negative drift detected: /, "")
      .replace(/Recommend a .*$/, "")
      .replace(/[,.\s]+$/, "")}. Recommend a 5-minute supportive check-in call.`;
  if (snap.triage.level === "STABLE") {
    const latest: DaySnapshot | undefined = snap.history[snap.history.length - 1];
    const km = latest ? (latest.mobility / 1000).toFixed(1) : "0.0";
    return `Post-TMS Remission Sustained: regular outdoor exploration (${km}km radius), rich sensory descriptions, and a steady ${snap.history.length}-day signal.${p ? "" : " " + s}`;
  }
  return `Watch list — ${s}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (at: number) => {
  const d = new Date(at);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** one biomarker card — owns its 7D/14D range, delta pill, takeaway */
function MetricCard({
  icon,
  title,
  full,
  labels,
  color,
  unit = "",
  invert = false,
  secondary,
  baseline,
  extra,
}: {
  icon: ReactNode;
  title: string;
  full: number[];
  labels: string[];
  color: string;
  unit?: string;
  invert?: boolean;
  secondary?: { values: number[]; color: string; label?: string };
  baseline: number;
  extra?: ReactNode;
}) {
  const [range, setRange] = useState<7 | 14>(14);
  const values = full.slice(-range);
  const labs = labels.slice(-range);
  const sec = secondary
    ? { ...secondary, values: secondary.values.slice(-range) }
    : undefined;
  const delta = values.length > 1 ? values[values.length - 1] - values[0] : 0;
  const deltaGood = invert ? delta < 0 : delta > 0;
  const t = takeaway(values, baseline);

  return (
    <div className="rounded-xl border border-[#E6E6E3] bg-white p-3.5 transition-colors hover:border-[#D1D1CD]">
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <p className="font-sans text-[11px] font-semibold text-zinc-500">{title}</p>
        <div className="ml-auto flex items-center gap-1.5">
          {extra}
          {/* per-chart date range */}
          <div className="flex items-center gap-0.5 rounded-md bg-[#F4F4F2] p-0.5">
            {([7, 14] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded px-1.5 py-0.5 font-sans text-[9px] font-bold tabular-nums transition-colors ${
                  range === r ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {r}D
              </button>
            ))}
          </div>
        </div>
      </div>
      <Sparkline
        values={values}
        labels={labs}
        color={color}
        unit={unit}
        baseline={baseline}
        secondary={sec}
      />
      <div className="mt-1.5 flex items-center justify-between">
        <p className={`font-sans text-[10px] font-semibold ${t.cls}`}>{t.txt}</p>
        {values.length > 1 && (
          <span
            className={`rounded-md px-1.5 py-0.5 font-sans text-[10px] font-bold tabular-nums ${
              delta === 0
                ? "bg-zinc-100 text-zinc-500"
                : deltaGood
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-orange-50 text-orange-700"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {Math.round(delta)}
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

/** 5-second takeaway per panel — where the line sits vs baseline + drift */
function takeaway(
  values: number[],
  base: number
): { txt: string; cls: string } {
  if (values.length < 2)
    return { txt: "awaiting first signals", cls: "text-zinc-400" };
  const last = values[values.length - 1] ?? 0;
  const prev = values[Math.max(0, values.length - 4)] ?? values[0] ?? 0;
  const vsBase = base > 0 ? (last - base) / base : 0;
  const drift = last - prev;
  const trend = drift > 1 ? "rising" : drift < -1 ? "easing" : "steady";
  if (vsBase >= -0.06)
    return { txt: `in remission zone · ${trend}`, cls: "text-emerald-600" };
  if (vsBase >= -0.18)
    return {
      txt: `just below baseline · ${trend} — gentle watch`,
      cls: "text-zinc-500",
    };
  return {
    txt: `${Math.round(vsBase * 100)}% under baseline · ${trend}`,
    cls: "text-orange-600",
  };
}

export function ClinicianBoard({
  compact = false,
  snap: snapProp,
  patient,
}: {
  compact?: boolean;
  snap?: LoopSnapshot;
  patient?: CohortPatient;
}) {
  const feed = useClinicianFeed();
  const snap = snapProp ?? feed;
  const now = useNow(2000);
  const [hrvView, setHrvView] = useState<"hrv" | "sleep">("hrv");
  const [nudgedAt, setNudgedAt] = useState<number | null>(null);
  const [diff, setDiff] = useState<"gentle" | "standard" | "stretch">("standard");
  const h = snap.history;
  const labels = h.map((d) => fmtDate(d.at));
  const syncedAgo = Math.max(0, Math.round((now - snap.at) / 1000));
  // live = the real feed, or the cohort's live patient viewed via the feed
  const live = !snapProp || (patient !== undefined && patient.live)
  const base = snap.baseline ?? dischargeBaseline(snap.history);
  const prosody = h.map((d) => d.prosody);
  const savoring = h.map((d) => d.savoring);
  const mobility = h.map((d) => d.mobility);
  const autonomic = h.map((d) => (hrvView === "hrv" ? d.hrv : d.sleep));
  const [head, ...restWords] = brief(snap, patient).split(": ");
  const restBrief = restWords.join(": ");

  function sendNudge(type: "checkin" | "difficulty", level?: "gentle" | "standard" | "stretch") {
    publishNudge({ type, level, patientId: patient?.id });
    setNudgedAt(Date.now());
    window.setTimeout(() => setNudgedAt(null), 6000);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* zero-workload triage header */}
      <div className="rounded-xl border border-[#E6E6E3] bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-md border px-2.5 py-1 font-sans text-[11px] font-bold uppercase tracking-wide ${
              live
                ? "border-orange-200 bg-orange-50 text-orange-700"
                : patient
                  ? {
                      INTERVENTION: "border-orange-200 bg-orange-50 text-orange-700",
                      DRIFT: "border-amber-200 bg-amber-50 text-amber-700",
                      STABLE: "border-emerald-200 bg-emerald-50 text-emerald-700",
                    }[patient.triage.level]
                  : "border-zinc-200 bg-zinc-50 text-zinc-600"
            }`}
          >
            {live ? snap.triage.label : patient ? TRIAGE_LABEL[patient.triage.level] : snap.triage.label}
          </span>
          {live && (
            <span
              className={`flex items-center gap-1.5 font-sans text-[11px] font-semibold ${
                syncedAgo < 120 ? "text-emerald-600" : "text-zinc-400"
              }`}
            >
              <Radio className="h-3.5 w-3.5 animate-pulse" strokeWidth={2.75} />
              {syncedAgo < 120
                ? `live · synced ${syncedAgo < 60 ? `${syncedAgo}s` : `${Math.floor(syncedAgo / 60)}m`} ago`
                : "demo data · open the app to go live"}
            </span>
          )}
          {patient && !live && (
            <span className="font-sans text-[11px] font-medium tabular-nums text-zinc-400">
              Day {patient.postTmsDay} post-rTMS · {patient.note}
            </span>
          )}
        </div>
        <p className="mt-3 font-sans text-[14px] leading-relaxed text-zinc-600">
          <span className="font-semibold text-zinc-900">{head}</span>
          {restBrief ? `. ${restBrief}` : ""}
        </p>

        {/* patient-marked context — low mobility is illness, not relapse */}
        {live && snap.contextFlag && snap.contextFlag !== "auto" && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <Thermometer className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" strokeWidth={2.5} />
            <p className="font-sans text-[11.5px] font-medium leading-snug text-amber-800">
              {snap.contextFlag === "sick"
                ? "Patient marked themselves physically unwell — mobility drift alerts paused so a sick day isn't read as psychiatric relapse. Indoor window quest assigned."
                : "Patient is staying indoors today — mobility alerts paused, daylight-at-the-window quest assigned."}
            </p>
          </div>
        )}

        {/* zero-workload actions — nudges beam straight to the live app */}
        {live && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#E6E6E3] pt-3">
            <button
              type="button"
              onClick={() => sendNudge("checkin")}
              className="flex items-center gap-1.5 rounded-lg bg-[#18181B] px-3 py-1.5 font-sans text-[11px] font-bold text-white transition-colors hover:bg-zinc-800"
            >
              <HeartHandshake className="h-3.5 w-3.5" strokeWidth={2.75} />
              Send warm check-in nudge
            </button>
            <div className="flex items-center gap-0.5 rounded-lg bg-zinc-100 p-0.5">
              {(["gentle", "standard", "stretch"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setDiff(l);
                    sendNudge("difficulty", l);
                  }}
                  className={`rounded-md px-2 py-1 font-sans text-[10px] font-bold capitalize transition-colors ${
                    diff === l ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <span className="font-sans text-[10px] font-medium text-zinc-400">mission feel</span>
            {nudgedAt && (
              <span className="toast-in flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-sans text-[11px] font-bold text-emerald-700">
                ✓ nudge sent — Matti&apos;s app is glowing
              </span>
            )}
          </div>
        )}
      </div>

      {/* longitudinal biomarkers vs discharge baseline */}
      <div className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
        <MetricCard
          icon={<Activity className="h-3.5 w-3.5 text-blue-600" strokeWidth={2} />}
          title="Acoustic voice prosody"
          full={prosody}
          labels={labels}
          color="#2563EB"
          baseline={base.prosody}
        />
        <MetricCard
          icon={<Brain className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2} />}
          title="NLP savoring & recall"
          full={savoring}
          labels={labels}
          color="#1E8E5A"
          baseline={base.savoring}
        />
        <MetricCard
          icon={<MapPin className="h-3.5 w-3.5 text-orange-500" strokeWidth={2} />}
          title="Spatial exploration + luminance"
          full={mobility}
          labels={labels}
          color="#F59E0B"
          unit="m"
          baseline={base.mobility}
          secondary={{ values: h.map((d) => d.luminance * 8), color: "#F472B6", label: " lux·8" }}
        />
        <MetricCard
          icon={<Moon className="h-3.5 w-3.5 text-zinc-500" strokeWidth={2} />}
          title="Autonomic · wearable feed"
          full={autonomic}
          labels={labels}
          color="#1C1917"
          baseline={hrvView === "hrv" ? base.hrv : base.sleep}
          secondary={
            hrvView === "hrv"
              ? { values: h.map((d) => d.sleep), color: "#38BDF8", label: " sleep" }
              : { values: h.map((d) => d.hrv), color: "#38BDF8", label: " hrv" }
          }
          extra={
            <button
              type="button"
              onClick={() => setHrvView((v) => (v === "hrv" ? "sleep" : "hrv"))}
              className="rounded-md border border-[#E6E6E3] bg-zinc-50 px-2 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wide text-zinc-500 hover:border-[#D1D1CD]"
            >
              {hrvView === "hrv" ? "HRV ↓" : "Sleep ↓"}
            </button>
          }
        />
      </div>

      {/* closed-loop learning insight */}
      {snap.insight && (
        <div className="rounded-xl border border-[#E6E6E3] bg-[#FAFAF9] p-4">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600">
            The loop is learning
          </p>
          <p className="mt-1.5 font-sans text-[13px] font-medium leading-snug text-zinc-700">
            {snap.insight}
          </p>
        </div>
      )}

      {/* recent capsules strip */}
      {snap.recentMemories.length > 0 && !compact && (
        <div className="flex flex-wrap gap-2">
          {snap.recentMemories.map((m) => (
            <span
              key={m.id}
              className="rounded-md border border-[#E6E6E3] bg-white px-2.5 py-1 font-sans text-[11px] font-medium tabular-nums text-zinc-500"
            >
              {m.poiName} · {daysAgo(m.at, now)}
              {m.savoringScore != null && ` · ${m.savoringScore}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
