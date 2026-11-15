"use client";

/**
 * DashboardView — the /clinician landing page. Attention alerts on top
 * (triage flags + silent devices), then the whole caseload in one
 * aligned table: status, energy, program day, app tenure, last signal.
 * Row click drills into the patient workspace.
 */

import { Camera, CheckCircle2, ChevronRight, Compass, HeartHandshake, Radio, TriangleAlert, UserPlus } from "lucide-react";
import { TRIAGE_LABEL, type CohortPatient } from "@/lib/patients";
import type { ActivityEvent, CohortStats, PatientSummary } from "@/lib/api";

const HUE: Record<CohortPatient["hue"], string> = {
  solar: "bg-amber-100 text-amber-700",
  forest: "bg-emerald-100 text-emerald-700",
  cobalt: "bg-violet-100 text-violet-700",
  blush: "bg-pink-100 text-pink-700",
  tangerine: "bg-orange-100 text-orange-700",
};

const PILL: Record<string, string> = {
  INTERVENTION: "border border-orange-200 bg-orange-50 text-orange-700",
  DRIFT: "border border-amber-200 bg-amber-50 text-amber-700",
  STABLE: "border border-emerald-200 bg-emerald-50 text-emerald-700",
};

const ALERT_STYLE: Record<string, { row: string; icon: string }> = {
  INTERVENTION: { row: "border-orange-200 bg-orange-50", icon: "text-orange-600" },
  DRIFT: { row: "border-amber-200 bg-amber-50", icon: "text-amber-600" },
};

const ENERGY: Record<string, string> = {
  LOW: "border border-amber-200 bg-amber-50 text-amber-700",
  MID: "border border-zinc-200 bg-zinc-50 text-zinc-600",
  OK: "border border-zinc-200 bg-zinc-50 text-zinc-600",
  HIGH: "border border-emerald-200 bg-emerald-50 text-emerald-700",
};

const DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (at: number) => {
  const d = new Date(at);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
const fmtSignal = (at: number | null | undefined, now: number) => {
  if (!at) return "—";
  const days = Math.floor((now - at) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return fmtDate(at);
};

const fmtAgo = (at: number, now: number) => {
  const mins = Math.floor((now - at) / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return fmtDate(at);
};

/** per-type feed icon in a soft tinted square */
const FEED_ICON: Record<ActivityEvent["type"], { icon: typeof Camera; cls: string; verb: string }> = {
  memory: { icon: Camera, cls: "bg-emerald-100 text-emerald-700", verb: "saved a memory" },
  mission_new: { icon: Compass, cls: "bg-orange-100 text-orange-700", verb: "new mission" },
  mission_done: { icon: CheckCircle2, cls: "bg-amber-100 text-amber-700", verb: "completed a mission" },
  nudge: { icon: HeartHandshake, cls: "bg-pink-100 text-pink-700", verb: "warm check-in sent" },
  patient: { icon: UserPlus, cls: "bg-violet-100 text-violet-700", verb: "joined OtaPath" },
};

export function DashboardView({
  patients,
  summaries,
  now,
  onSelect,
}: {
  patients: CohortPatient[];
  summaries: PatientSummary[];
  now: number;
  onSelect: (id: string) => void;
}) {
  const meta = new Map(summaries.map((s) => [s.id, s]));
  const flagged = patients.filter((p) => p.triage.level !== "STABLE");
  const silent = patients.filter((p) => !meta.get(p.id)?.lastSignalAt);

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="font-sans text-2xl font-semibold tracking-[-0.02em] text-zinc-900">
          Caseload
        </h1>
        <p className="mt-0.5 font-sans text-[13px] font-medium text-zinc-500">
          {patients.length} patients · {flagged.length} need attention
          {silent.length > 0 && ` · ${silent.length} awaiting first signal`}
        </p>
      </div>

      {/* ── alerts ─────────────────────────────────────────────── */}
      {flagged.length > 0 ? (
        <div className="flex flex-col gap-2">
          {flagged.map((p) => {
            const s = meta.get(p.id);
            const style = ALERT_STYLE[p.triage.level] ?? ALERT_STYLE.DRIFT;
            const bits: string[] = [];
            if (s?.energyState === "LOW") bits.push("low energy");
            const quiet = s?.lastSignalAt ? Math.floor((now - s.lastSignalAt) / DAY) : null;
            if (quiet !== null && quiet >= 2) bits.push(`quiet for ${quiet}d`);
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${style.row}`}
              >
                <TriangleAlert className={`h-4 w-4 shrink-0 ${style.icon}`} strokeWidth={2.25} />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-[13px] font-semibold text-zinc-800">
                    {p.name}
                    <span className={`ml-2 rounded px-1.5 py-0.5 align-middle font-sans text-[9px] font-bold uppercase tracking-wide ${PILL[p.triage.level]}`}>
                      {TRIAGE_LABEL[p.triage.level]}
                    </span>
                  </p>
                  <p className="mt-0.5 font-sans text-[11px] font-medium text-zinc-500">
                    Day {p.postTmsDay} post-rTMS · {bits.join(" · ") || "flagged by the closed-loop monitor"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  className="flex shrink-0 items-center gap-1 rounded-md border border-[#E6E6E3] bg-white px-2.5 py-1 font-sans text-[11px] font-bold text-zinc-700 transition-colors hover:border-[#D1D1CD]"
                >
                  Review
                  <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <Radio className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.25} />
          <p className="font-sans text-[12px] font-semibold text-emerald-700">
            Everyone&rsquo;s steady — no flags in the last 72 hours.
          </p>
        </div>
      )}

      {/* silent devices — informational, not alarming */}
      {silent.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-3 rounded-xl border border-[#E6E6E3] bg-[#FAFAF9] px-4 py-2.5"
        >
          <Radio className="h-3.5 w-3.5 shrink-0 text-zinc-400" strokeWidth={2.25} />
          <p className="min-w-0 flex-1 font-sans text-[12px] font-medium text-zinc-500">
            <span className="font-semibold text-zinc-700">{p.name}</span> — newly linked, no
            signals yet. Their first walk will appear here.
          </p>
        </div>
      ))}

      {/* ── caseload table ─────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-[#E6E6E3] bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#E6E6E3] bg-[#FAFAF9]">
              {["Patient", "Status", "Energy", "Day", "In app since", "Last signal", ""].map(
                (h, i) => (
                  <th
                    key={i}
                    className="px-4 py-2.5 text-left font-sans text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => {
              const s = meta.get(p.id);
              const since = new Date(now - p.postTmsDay * DAY);
              return (
                <tr
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className="cursor-pointer border-b border-[#E6E6E3] transition-colors last:border-0 hover:bg-[#FAFAF9]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-sans text-[10px] font-bold ${HUE[p.hue]}`}
                      >
                        {p.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-sans text-[13px] font-semibold text-zinc-800">
                          {p.name}
                        </p>
                        <p className="truncate font-sans text-[10px] font-medium text-zinc-400">
                          {p.note}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wide ${PILL[p.triage.level]}`}
                    >
                      {TRIAGE_LABEL[p.triage.level]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wide ${ENERGY[s?.energyState ?? ""] ?? "border border-zinc-200 bg-zinc-50 text-zinc-500"}`}
                    >
                      {(s?.energyState ?? "—").toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-sans text-[12px] font-semibold tabular-nums text-zinc-700">
                    {p.postTmsDay}
                  </td>
                  <td className="px-4 py-3 font-sans text-[12px] font-medium tabular-nums text-zinc-500">
                    {fmtDate(since.getTime())}
                  </td>
                  <td className="px-4 py-3 font-sans text-[12px] font-medium tabular-nums text-zinc-500">
                    {fmtSignal(s?.lastSignalAt, now)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-zinc-300" strokeWidth={2} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** WhatsNewRail — the dashboard's right inspector: a cohort-pulse
 *  stat grid on top, then the live "what's new" feed, sectioned like
 *  the patient inspector and filling the rail's full height. */
export function WhatsNewRail({
  events,
  stats,
  now,
  onSelect,
}: {
  events: ActivityEvent[];
  stats: CohortStats | null;
  now: number;
  onSelect: (id: string) => void;
}) {
  const tiles: { label: string; value: number; icon: typeof Camera; cls: string }[] = stats
    ? [
        { label: "signals 24h", value: stats.signalsToday, icon: Radio, cls: "bg-emerald-100 text-emerald-700" },
        { label: "missions live", value: stats.activeMissions, icon: Compass, cls: "bg-orange-100 text-orange-700" },
        { label: "capsules", value: stats.capsules, icon: Camera, cls: "bg-violet-100 text-violet-700" },
        { label: "nudges sent", value: stats.nudges, icon: HeartHandshake, cls: "bg-pink-100 text-pink-700" },
      ]
    : [];
  return (
    <div className="flex flex-col">
      {/* header — same weight as inspector sections */}
      <div className="flex items-center gap-2 border-b border-[#E6E6E3] px-4 py-3">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
          What&rsquo;s new
        </p>
        <span className="ml-auto flex items-center gap-1.5 font-sans text-[9px] font-bold uppercase tracking-wide text-emerald-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          live
        </span>
      </div>

      {/* cohort pulse — 2×2 honest counters */}
      {stats && (
        <div className="grid grid-cols-2 gap-2 border-b border-[#E6E6E3] p-4">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="rounded-lg border border-[#E6E6E3] bg-white p-2.5"
            >
              <t.icon className="h-3.5 w-3.5 text-zinc-500" strokeWidth={2} />
              <p className="mt-1.5 font-sans text-lg font-bold tabular-nums leading-none text-zinc-900">
                {t.value}
              </p>
              <p className="mt-1 font-sans text-[9px] font-bold uppercase tracking-wide text-zinc-400">
                {t.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* live feed */}
      <div className="divide-y divide-[#E6E6E3]">
        {events.length === 0 && (
          <p className="px-4 py-6 text-center font-sans text-[11px] font-medium text-zinc-400">
            Nothing yet — the loop is quiet.
          </p>
        )}
        {events.map((e) => {
          const f = FEED_ICON[e.type];
          const Icon = f.icon;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onSelect(e.patientId)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-[#FAFAF9]"
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${f.cls}`}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-sans text-[11.5px] font-semibold text-zinc-800">
                  {e.patientName}
                </span>
                <span className="block truncate font-sans text-[10px] font-medium text-zinc-500">
                  {f.verb} · {e.label}
                </span>
              </span>
              <span className="shrink-0 font-sans text-[10px] font-medium tabular-nums text-zinc-400">
                {fmtAgo(e.at, now)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
