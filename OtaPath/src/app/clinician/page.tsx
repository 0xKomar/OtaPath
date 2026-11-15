"use client";

/**
 * /clinician — the TMS Clinician Portal, restyled as a crisp clinical
 * workstation (Linear/Notion/Swiss-grid). Left: 240px caseload rail on
 * #F7F7F5 with a hairline divider. Center: white canvas — sticky 56px
 * breadcrumb, patient header, segmented view switcher, then either the
 * biomarker overview, the missions & guardrails record, or the capsule
 * atlas. Right: 320px inspector — act on what the charts just showed.
 * All data flows through the same APIs as before.
 */

import { useCallback, useEffect, useState } from "react";
import { api, type PatientDetail, type PatientSummary, type MissionRow, type ActivityEvent, type CohortStats } from "@/lib/api";
import { useClinicianFeed } from "@/lib/useClinicianFeed";
import { useNow } from "@/lib/useNow";
import { dischargeBaseline } from "@/lib/biometricHistory";
import type { CohortPatient } from "@/lib/patients";
import type { TriageLevel } from "@/lib/triage";
import type { LoopSnapshot } from "@/lib/broadcast";
import { ClinicianBoard } from "@/components/clinician/ClinicianBoard";
import { CohortSidebar, NAV_THEMES, SidebarFoot } from "@/components/clinician/CohortSidebar";
import { ClinicianActions } from "@/components/clinician/ClinicianActions";
import { CapsuleGallery } from "@/components/clinician/CapsuleGallery";
import { TickBar } from "@/components/clinician/TickBar";
import { AddPatientModal } from "@/components/clinician/AddPatientModal";
import { DashboardView, WhatsNewRail } from "@/components/clinician/DashboardView";
import { ChevronDown, PanelLeft, PanelLeftOpen, Plus } from "lucide-react";
import Image from "next/image";

const POLL_MS = 8000;

type Tab = "overview" | "missions" | "capsules";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview & Biomarkers" },
  { id: "missions", label: "Missions & Guardrails" },
  { id: "capsules", label: "Memory Capsules" },
];

function toCohortPatient(
  s: Pick<PatientSummary, "id" | "name" | "initials" | "postTmsDay" | "note" | "hue" | "triageStatus">,
  live: boolean
): CohortPatient {
  const level = (s.triageStatus || "STABLE") as TriageLevel;
  return {
    id: s.id,
    name: s.name,
    initials: s.initials,
    postTmsDay: s.postTmsDay,
    note: s.note,
    hue: s.hue as CohortPatient["hue"],
    history: [],
    triage: { level, label: "", cls: "", summary: "" },
    live,
  };
}

function toSnap(d: PatientDetail, feed: LoopSnapshot | null): LoopSnapshot {
  const last = d.history[d.history.length - 1];
  const isMatti = d.patient.id === "matti";
  return {
    v: 1,
    at: Date.now(),
    patientState: (d.patient.energyState as LoopSnapshot["patientState"]) ?? "LOW",
    biometrics: last
      ? {
          hrv: last.hrv,
          sleepRegularity: last.sleep,
          voiceProsody: last.prosody,
          nlpSavoring: last.savoring,
          photoVibrancy: last.luminance,
          photoLuminance: last.luminance,
        }
      : { hrv: 0, sleepRegularity: 0, voiceProsody: 0, nlpSavoring: 0, photoVibrancy: 0, photoLuminance: 0 },
    mobilityM: last?.mobility ?? 0,
    memoryCount: d.memories.length,
    recentMemories: d.memories.slice(0, 6).map((m) => ({
      id: m.id,
      poiName: m.locationName,
      at: m.createdAt,
      kind: (m.kind as "photo" | "voice" | "moment") ?? "moment",
      themes: m.themes ? (JSON.parse(m.themes) as string[]) : undefined,
      savoringScore: m.savoringScore ?? undefined,
    })),
    history: d.history,
    triage: d.triage,
    insight: isMatti ? feed?.insight ?? null : null,
    loopEvents: isMatti ? feed?.loopEvents ?? {} : {},
    lastCapture: isMatti ? feed?.lastCapture ?? null : null,
    baseline: d.baseline ? { ...d.baseline, luminance: 0, sleep: 0, at: 0 } : null,
  };
}

/** share of the last 7 days where prosody, savoring & mobility all sit
 *  within ±15% of the discharge baseline — an honest stability score */
function stabilityScore(d: PatientDetail): { pct: number; inBand: number; of: number } {
  const h = d.history.slice(-7);
  if (h.length < 3) return { pct: 0, inBand: 0, of: h.length };
  const base = dischargeBaseline(d.history);
  const band = (v: number, b: number) => Math.abs(v - b) <= b * 0.15 + 1;
  const inBand = h.filter(
    (day) => band(day.prosody, base.prosody) && band(day.savoring, base.savoring) && band(day.mobility, base.mobility)
  ).length;
  return { pct: Math.round((inBand / h.length) * 100), inBand, of: h.length };
}

function fmtMsn(m: MissionRow): string {
  const when = new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${when} · ${m.assignedBy === "CLINICIAN_CUSTOM" ? `prescribed · ${m.doctorName ?? "doctor"}` : "closed-loop"}`;
}

const MISSION_STATUS: Record<string, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  COMPLETED: "border-zinc-200 bg-zinc-50 text-zinc-500",
  SUPERSEDED: "border-zinc-200 bg-zinc-50 text-zinc-400",
};

export default function ClinicianPage() {
  const feed = useClinicianFeed();
  const now = useNow(2000);
  const [cohortList, setCohortList] = useState<PatientSummary[] | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [stats, setStats] = useState<CohortStats | null>(null);
  const [sel, setSel] = useState<string | null>(null); // null = dashboard overview
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [addOpen, setAddOpen] = useState(false);
  const [darkNav, setDarkNav] = useState(true);
  const [navTheme, setNavTheme] = useState(0);
  const [navCollapsed, setNavCollapsed] = useState(false);

  const loadCohort = useCallback(async () => {
    try {
      setCohortList((await api.patients()).patients);
      const a = await api.activity();
      setEvents(a.events);
      setStats(a.stats);
    } catch {}
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      setDetail(await api.patient(id));
    } catch {}
  }, []);

  useEffect(() => {
    const t0 = setTimeout(loadCohort, 0);
    const t = setInterval(loadCohort, POLL_MS);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [loadCohort]);

  useEffect(() => {
    if (!sel) return;
    const t0 = setTimeout(() => loadDetail(sel), 0);
    const t = setInterval(() => loadDetail(sel), POLL_MS);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [sel, loadDetail]);

  const feedLive = !!feed && now - feed.at < 120_000;
  const patients = (cohortList ?? []).map((p) =>
    toCohortPatient(p, p.id === "matti" && feedLive)
  );
  const selected = patients.find((p) => p.id === sel);
  const snap = detail ? toSnap(detail, feed) : null;
  const attention = patients.filter((p) => p.triage.level !== "STABLE").length;
  const stability = detail ? stabilityScore(detail) : null;

  return (
    <div
      className={`flex min-h-screen font-sans text-zinc-900 ${
        darkNav ? "clin-dark bg-[#1b1916] text-zinc-100" : "bg-white"
      }`}
    >
      {/* ── left rail: caseload ─────────────────────────────────── */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-auto border-r py-4 transition-[width,padding] duration-200 md:flex ${
          navCollapsed ? "w-[60px] px-2" : "w-[240px] px-3"
        } ${darkNav ? "border-black/40" : "border-[#E6E6E3]"}`}
        style={{ background: darkNav ? NAV_THEMES[navTheme].bg : "#F7F7F5" }}
      >
        {/* workspace switcher — Taskify-style */}
        <div className={`mb-3 flex items-center gap-2 ${navCollapsed ? "flex-col" : "px-1"}`}>
          <Image
            src="/logooatpath.png"
            alt="OtaPath"
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded-lg"
          />
          {!navCollapsed && (
            <div className="min-w-0 flex-1">
              <p className={`flex items-center gap-1 font-sans text-[12px] font-bold tracking-[-0.01em] ${darkNav ? "text-zinc-100" : "text-zinc-900"}`}>
                OtaPath TMS
                <ChevronDown className={`h-3 w-3 ${darkNav ? "text-zinc-500" : "text-zinc-400"}`} strokeWidth={2.5} />
              </p>
              <p className={`font-sans text-[10px] font-medium ${darkNav ? "text-zinc-500" : "text-zinc-400"}`}>Clinic workspace</p>
            </div>
          )}
          <button
            type="button"
            aria-label={navCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={navCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setNavCollapsed((v) => !v)}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${darkNav ? "text-zinc-500 hover:bg-white/10 hover:text-zinc-300" : "text-zinc-400 hover:bg-white hover:text-zinc-700"}`}
          >
            {navCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <PanelLeft className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
        {patients.length ? (
          <CohortSidebar
            patients={patients}
            selectedId={sel}
            dashboardActive={sel === null}
            onDashboard={() => setSel(null)}
            onSelect={setSel}
            onAddPatient={() => setAddOpen(true)}
            dark={darkNav}
            collapsed={navCollapsed}
          />
        ) : (
          <div className={`rounded-lg border p-3 font-sans text-[11px] font-medium ${darkNav ? "border-white/10 text-zinc-500" : "border-[#E6E6E3] bg-white text-zinc-400"}`}>
            Loading caseload…
          </div>
        )}
        <SidebarFoot
          dark={darkNav}
          themeIdx={navTheme}
          onToggleDark={() => setDarkNav((v) => !v)}
          onTheme={setNavTheme}
          onPreferences={() => setTab("missions")}
          collapsed={navCollapsed}
        />
      </aside>

      {/* mobile caseload strip */}
      <div className="fixed inset-x-0 top-0 z-40 flex gap-1.5 overflow-x-auto border-b border-[#E6E6E3] bg-[#F7F7F5] px-3 py-2 md:hidden">
        <button
          type="button"
          onClick={() => setSel(null)}
          className={`shrink-0 rounded-md border px-2.5 py-1 font-sans text-[11px] font-semibold ${
            sel === null
              ? "border-zinc-900 bg-white text-zinc-900"
              : "border-[#E6E6E3] bg-white/60 text-zinc-500"
          }`}
        >
          All
        </button>
        {patients.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSel(p.id)}
            className={`shrink-0 rounded-md border px-2.5 py-1 font-sans text-[11px] font-semibold ${
              p.id === sel
                ? "border-zinc-900 bg-white text-zinc-900"
                : "border-[#E6E6E3] bg-white/60 text-zinc-500"
            }`}
          >
            {p.name.split(" ")[0]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Add patient"
          className="flex shrink-0 items-center gap-1 rounded-md border border-dashed border-zinc-300 bg-white/60 px-2.5 py-1 font-sans text-[11px] font-semibold text-zinc-500"
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
          Add
        </button>
      </div>

      {/* ── main canvas ─────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* sticky breadcrumb header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[#E6E6E3] bg-white/95 px-4 backdrop-blur-sm md:px-6">
          <nav className="flex min-w-0 items-center gap-1.5 font-sans text-[12px] font-medium text-zinc-400">
            <span className="hidden sm:inline">Caseload</span>
            <span className="hidden text-zinc-300 sm:inline">›</span>
            <span className="truncate font-semibold text-zinc-900">
              {selected?.name ?? "Dashboard"}
            </span>
          </nav>
          <div className="ml-auto flex items-center gap-3 font-sans text-[11px] font-medium tabular-nums text-zinc-400">
            <span className="hidden sm:inline">
              {patients.length} patients · {attention} need attention
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              synced
            </span>
          </div>
        </header>

        <div className="flex flex-1 flex-col xl:flex-row">
          {/* center workspace */}
          <main className="min-w-0 flex-1 px-4 py-5 md:px-8">
            {sel === null ? (
              <DashboardView
                patients={patients}
                summaries={cohortList ?? []}
                now={now}
                onSelect={setSel}
              />
            ) : (
            <>
            {/* patient header */}
            <div className="mb-4">
              <h1 className="font-sans text-2xl font-semibold tracking-[-0.02em] text-zinc-900">
                {selected?.name ?? "…"}
              </h1>
              <p className="mt-0.5 font-sans text-[13px] font-medium text-zinc-500">
                {selected
                  ? `Day ${selected.postTmsDay} post-rTMS · ${selected.note} · ${
                      selected.triage.level === "INTERVENTION"
                        ? "needs check-in"
                        : selected.triage.level === "DRIFT"
                          ? "early drift"
                          : "stable"
                    }`
                  : "post-rTMS record"}
              </p>
              {detail?.patient.authEmail && (
                <p className="mt-0.5 font-sans text-[11px] font-medium tabular-nums text-zinc-400">
                  login · {detail.patient.authEmail}
                </p>
              )}
            </div>

            {/* segmented view switcher */}
            <div className="mb-5 inline-flex rounded-lg bg-[#F4F4F2] p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-md px-3 py-1.5 font-sans text-[11px] font-semibold transition-colors ${
                    tab === t.id ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {detail && snap ? (
              <>
                {tab === "overview" && (
                  <div className="flex max-w-4xl flex-col gap-4">
                    {/* remission stability KPI */}
                    {stability && stability.of > 0 && (
                      <div className="flex items-center gap-5 rounded-xl border border-[#E6E6E3] bg-white px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                            Remission stability
                          </p>
                          <p className="mt-0.5 font-sans text-[13px] font-semibold text-zinc-800">
                            {stability.inBand} of {stability.of} days within band
                          </p>
                        </div>
                        <TickBar pct={stability.pct} ticks={28} height={18} />
                        <span className="font-sans text-lg font-bold tabular-nums text-zinc-900">
                          {stability.pct}
                          <span className="text-xs font-medium text-zinc-400">%</span>
                        </span>
                      </div>
                    )}
                    <ClinicianBoard
                      snap={snap}
                      patient={toCohortPatient(detail.patient, detail.patient.id === "matti" && feedLive)}
                    />
                  </div>
                )}

                {tab === "missions" && (
                  <div className="max-w-3xl">
                    <div className="rounded-xl border border-[#E6E6E3] bg-white">
                      <div className="flex items-center justify-between border-b border-[#E6E6E3] px-4 py-3">
                        <p className="font-sans text-[12px] font-semibold text-zinc-800">
                          Mission ledger
                        </p>
                        <p className="font-sans text-[10px] font-medium text-zinc-400">
                          guardrails: {detail.override.autonomy ?? "standard"} autonomy ·{" "}
                          {detail.override.relapseSensitivity ?? "standard"} alert sensitivity
                        </p>
                      </div>
                      <div className="divide-y divide-[#E6E6E3]">
                        {detail.missions.length === 0 && (
                          <p className="px-4 py-6 text-center font-sans text-[12px] font-medium text-zinc-400">
                            No missions yet — the closed loop assigns one as the patient moves.
                          </p>
                        )}
                        {detail.missions.map((m) => (
                          <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-sans text-[13px] font-semibold text-zinc-800">
                                {m.title}
                              </p>
                              <p className="mt-0.5 font-sans text-[11px] font-medium text-zinc-400">
                                {m.poiName} · {fmtMsn(m)}
                                {m.clinicianNote ? ` · “${m.clinicianNote.slice(0, 60)}…”` : ""}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-md border px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wide ${MISSION_STATUS[m.status]}`}
                            >
                              {m.status.toLowerCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {tab === "capsules" && (
                  <div className="max-w-4xl">
                    <h3 className="mb-3 font-sans text-[12px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                      Recent memory capsules
                    </h3>
                    <CapsuleGallery memories={detail.memories} />
                  </div>
                )}
              </>
            ) : (
              <div className="max-w-4xl rounded-xl border border-[#E6E6E3] bg-white p-6 font-sans text-[12px] font-medium text-zinc-400">
                Opening {selected?.name ?? "the patient"}&rsquo;s record…
              </div>
            )}
            </>
            )}
          </main>

          {/* ── right rail — patient inspector or cohort feed ────── */}
          {sel !== null ? (
            <aside className="border-t border-[#E6E6E3] bg-white xl:sticky xl:top-14 xl:h-[calc(100vh-3.5rem)] xl:w-[320px] xl:shrink-0 xl:overflow-y-auto xl:border-l xl:border-t-0">
              {detail ? (
                <ClinicianActions detail={detail} onChanged={() => { if (sel) { loadDetail(sel); loadCohort(); } }} />
              ) : (
                <div className="p-4 font-sans text-[11px] font-medium text-zinc-400">
                  Inspector loads with the patient record.
                </div>
              )}
            </aside>
          ) : (
            <aside className="w-full shrink-0 border-t border-[#E6E6E3] bg-white xl:sticky xl:top-14 xl:h-[calc(100vh-3.5rem)] xl:w-[300px] xl:overflow-y-auto xl:border-l xl:border-t-0">
              <WhatsNewRail events={events} stats={stats} now={now} onSelect={setSel} />
            </aside>
          )}
        </div>
      </div>
      {addOpen && (
        <AddPatientModal
          onClose={() => setAddOpen(false)}
          onAdded={(id) => {
            void loadCohort().then(() => setSel(id));
          }}
        />
      )}
    </div>
  );
}
