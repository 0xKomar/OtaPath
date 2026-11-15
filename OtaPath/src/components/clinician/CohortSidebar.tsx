"use client";

/**
 * CohortSidebar — the caseload rail, Taskify-style. Search filter,
 * Main Menu nav (Dashboard + collapsible Caseload), patient rows with
 * pastel letter squares + soft triage pills, Add-patient row — plus
 * the bottom utility menu (Preferences / Dark mode / Themes / Help)
 * and the signed-in clinician card, matching the workspace reference.
 */

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronsUpDown,
  CircleHelp,
  LayoutDashboard,
  Moon,
  Palette,
  Plus,
  Radio,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { TRIAGE_LABEL, TRIAGE_ORDER, type CohortPatient } from "@/lib/patients";

const HUE: Record<CohortPatient["hue"], string> = {
  solar: "bg-amber-100 text-amber-700",
  forest: "bg-emerald-100 text-emerald-700",
  cobalt: "bg-violet-100 text-violet-700",
  blush: "bg-pink-100 text-pink-700",
  tangerine: "bg-orange-100 text-orange-700",
};

const BADGE: Record<string, { light: string; dark: string }> = {
  INTERVENTION: {
    light: "border border-orange-200 bg-orange-50 text-orange-700",
    dark: "border border-orange-400/25 bg-orange-400/15 text-orange-300",
  },
  DRIFT: {
    light: "border border-amber-200 bg-amber-50 text-amber-700",
    dark: "border border-amber-400/25 bg-amber-400/15 text-amber-300",
  },
  STABLE: {
    light: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    dark: "border border-emerald-400/25 bg-emerald-400/15 text-emerald-300",
  },
};

export const NAV_THEMES = [
  { name: "Charcoal", bg: "#1C1917" },
  { name: "Espresso", bg: "#231B14" },
  { name: "Midnight", bg: "#151920" },
] as const;

export function CohortSidebar({
  patients,
  selectedId,
  dashboardActive,
  onDashboard,
  onSelect,
  onAddPatient,
  dark,
  collapsed,
}: {
  patients: CohortPatient[];
  selectedId: string | null;
  dashboardActive: boolean;
  onDashboard: () => void;
  onSelect: (id: string) => void;
  onAddPatient: () => void;
  dark: boolean;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const sorted = [...patients].sort(
    (a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0) || TRIAGE_ORDER[a.triage.level] - TRIAGE_ORDER[b.triage.level]
  );
  const q = query.trim().toLowerCase();
  const visible = q ? sorted.filter((p) => p.name.toLowerCase().includes(q)) : sorted;

  const iconCls = `h-4 w-4 ${dark ? "text-zinc-500" : "text-zinc-500"}`;
  const rowText = dark ? "text-zinc-300" : "text-zinc-700";
  const rowHover = dark ? "hover:bg-white/[0.06]" : "hover:bg-white/70";

  /* icon-only rail — same navigation, letter squares stay glanceable */
  if (collapsed) {
    const railBtn = `flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${rowText} ${rowHover}`;
    return (
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={onDashboard} title="Dashboard" aria-label="Dashboard"
          className={`${railBtn} ${dashboardActive ? (dark ? "bg-white/[0.08] text-white" : "bg-white text-zinc-900 shadow-sm") : ""}`}>
          <LayoutDashboard className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <span className={`my-1 h-px w-6 ${dark ? "bg-white/10" : "bg-[#E6E6E3]"}`} />
        {sorted.map((p) => (
          <button key={p.id} type="button" onClick={() => onSelect(p.id)}
            title={`${p.name} · ${TRIAGE_LABEL[p.triage.level]}`}
            className={`flex h-8 w-8 items-center justify-center rounded-md font-sans text-[10px] font-bold transition-shadow ${HUE[p.hue]} ${
              p.id === selectedId ? "ring-2 ring-[#F59E0B] ring-offset-1 ring-offset-transparent" : ""
            }`}>
            {p.initials}
          </button>
        ))}
        <span className={`my-1 h-px w-6 ${dark ? "bg-white/10" : "bg-[#E6E6E3]"}`} />
        <button type="button" onClick={onAddPatient} title="Add patient" aria-label="Add patient" className={railBtn}>
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* search — filters the caseload live */}
      <div
        className={`mb-2 flex items-center gap-2 rounded-lg px-2.5 py-2 ${
          dark ? "bg-white/[0.08]" : "bg-white"
        }`}
      >
        <Search className={`h-3.5 w-3.5 shrink-0 ${dark ? "text-zinc-500" : "text-zinc-400"}`} strokeWidth={2} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className={`w-full bg-transparent font-sans text-[12px] font-medium focus:outline-none ${
            dark ? "text-zinc-100 placeholder:text-zinc-500" : "text-zinc-800 placeholder:text-zinc-400"
          }`}
        />
      </div>

      <p className={`px-2 pb-0.5 pt-1 font-sans text-[10px] font-semibold ${dark ? "text-zinc-500" : "text-zinc-400"}`}>
        Main Menu
      </p>

      {/* Dashboard — the workspace overview */}
      <button
        type="button"
        onClick={onDashboard}
        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-sans text-[12px] font-semibold transition-colors ${
          dashboardActive
            ? dark
              ? "bg-white/[0.08] text-white"
              : "bg-white text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            : `${rowText} ${rowHover}`
        }`}
      >
        <LayoutDashboard className={iconCls} strokeWidth={1.75} />
        Dashboard
      </button>

      {/* Caseload — expandable tree */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-sans text-[12px] font-semibold transition-colors ${rowText} ${rowHover}`}
      >
        <Users className={iconCls} strokeWidth={1.75} />
        Caseload
        <span className="ml-auto flex items-center gap-1">
          <span className={`font-sans text-[10px] font-semibold tabular-nums ${dark ? "text-zinc-500" : "text-zinc-400"}`}>
            {patients.length}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${dark ? "text-zinc-500" : "text-zinc-400"} ${open ? "" : "-rotate-90"}`}
            strokeWidth={2.5}
          />
        </span>
      </button>

      {open && (
        <div className={`ml-1 flex flex-col gap-0.5 border-l pl-2 ${dark ? "border-white/10" : "border-[#E6E6E3]"}`}>
          {visible.map((p) => {
            const sel = p.id === selectedId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                  sel
                    ? dark
                      ? "border-white/10 bg-white/[0.09]"
                      : "border-[#E6E6E3] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    : dark
                      ? "border-transparent hover:bg-white/[0.05]"
                      : "border-transparent hover:border-[#E6E6E3] hover:bg-white/70"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-sans text-[10px] font-bold ${HUE[p.hue]}`}
                >
                  {p.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1">
                    <span className={`truncate font-sans text-[11.5px] font-semibold ${dark ? "text-zinc-100" : "text-zinc-800"}`}>
                      {p.name}
                    </span>
                    {p.live && (
                      <Radio className="h-2.5 w-2.5 shrink-0 animate-pulse text-emerald-500" strokeWidth={3} />
                    )}
                  </span>
                  <span className={`block truncate font-sans text-[9px] font-medium tabular-nums ${dark ? "text-zinc-500" : "text-zinc-400"}`}>
                    Day {p.postTmsDay} · {p.note}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded px-1 py-0.5 font-sans text-[8px] font-bold uppercase tracking-wide ${dark ? BADGE[p.triage.level].dark : BADGE[p.triage.level].light}`}
                >
                  {TRIAGE_LABEL[p.triage.level]}
                </span>
              </button>
            );
          })}
          {visible.length === 0 && (
            <p className={`px-2 py-2 font-sans text-[11px] font-medium ${dark ? "text-zinc-500" : "text-zinc-400"}`}>
              No one named &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Add patient — pairing-code enrollment */}
      <button
        type="button"
        onClick={onAddPatient}
        className={`mt-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-sans text-[12px] font-semibold transition-colors ${
          dark ? "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200" : "text-zinc-500 hover:bg-white/70 hover:text-zinc-800"
        }`}
      >
        <Plus className={iconCls} strokeWidth={2.5} />
        Add patient
      </button>
    </div>
  );
}

/** bottom utility menu + clinician identity — pinned to the rail's foot */
export function SidebarFoot({
  dark,
  themeIdx,
  onToggleDark,
  onTheme,
  onPreferences,
  collapsed,
}: {
  dark: boolean;
  themeIdx: number;
  onToggleDark: () => void;
  onTheme: (i: number) => void;
  onPreferences: () => void;
  collapsed: boolean;
}) {
  const [pop, setPop] = useState<"themes" | "help" | "user" | null>(null);
  const itemCls = `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 font-sans text-[12px] font-semibold transition-colors ${
    dark ? "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200" : "text-zinc-500 hover:bg-white/70 hover:text-zinc-800"
  }`;
  const ic = "h-4 w-4 text-zinc-500";
  const popCls = `toast-in absolute bottom-full left-0 z-50 mb-1 w-52 rounded-xl border p-1.5 shadow-lg ${
    dark ? "border-white/10 bg-[#26221F]" : "border-[#E6E6E3] bg-white"
  }`;

  /* icon-only rail foot — every control still reachable */
  if (collapsed) {
    const railBtn = `flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
      dark ? "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200" : "text-zinc-500 hover:bg-white/70 hover:text-zinc-800"
    }`;
    return (
      <div className={`relative mt-auto flex flex-col items-center gap-1 border-t pt-2 ${dark ? "border-white/10" : "border-[#E6E6E3]"}`}>
        <button type="button" className={railBtn} onClick={onPreferences} title="Preferences" aria-label="Preferences">
          <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button type="button" className={railBtn} onClick={onToggleDark} title="Dark mode" aria-label="Dark mode">
          <Moon className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <div className="relative">
          <button type="button" className={railBtn} onClick={() => setPop(pop === "themes" ? null : "themes")} title="Themes" aria-label="Themes">
            <Palette className="h-4 w-4" strokeWidth={1.75} />
          </button>
          {pop === "themes" && (
            <div className={`${popCls} left-1`}>
              {NAV_THEMES.map((t, i) => (
                <button key={t.name} type="button" onClick={() => { onTheme(i); setPop(null); }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 font-sans text-[11px] font-semibold ${dark ? "text-zinc-300 hover:bg-white/[0.06]" : "text-zinc-600 hover:bg-zinc-50"}`}>
                  <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ background: t.bg }} />
                  {t.name}
                  {themeIdx === i && <span className={dark ? "ml-auto text-zinc-500" : "ml-auto text-zinc-400"}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <button type="button" className={railBtn} onClick={() => setPop(pop === "help" ? null : "help")} title="Help" aria-label="Help">
            <CircleHelp className="h-4 w-4" strokeWidth={1.75} />
          </button>
          {pop === "help" && (
            <div className={`${popCls} left-1 p-3`}>
              <p className={`font-sans text-[11px] font-semibold ${dark ? "text-zinc-200" : "text-zinc-800"}`}>OtaPath Clinician</p>
              <p className={`mt-1 font-sans text-[10.5px] font-medium leading-snug ${dark ? "text-zinc-400" : "text-zinc-500"}`}>
                Caseload, drift charts, prescriptions and nudges all sync live with each patient&rsquo;s app.
              </p>
            </div>
          )}
        </div>
        <div className="relative">
          <button type="button" onClick={() => setPop(pop === "user" ? null : "user")} title="Dr. Aino Lindqvist" aria-label="Account"
            className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 font-sans text-[11px] font-bold text-amber-800">
            AL
          </button>
          {pop === "user" && (
            <div className={`${popCls} left-1`}>
              <Link href="/app" className={`flex items-center rounded-lg px-2 py-1.5 font-sans text-[11px] font-semibold ${dark ? "text-zinc-300 hover:bg-white/[0.06]" : "text-zinc-600 hover:bg-zinc-50"}`}>
                Open patient app →
              </Link>
              <Link href="/demo" className={`flex items-center rounded-lg px-2 py-1.5 font-sans text-[11px] font-semibold ${dark ? "text-zinc-300 hover:bg-white/[0.06]" : "text-zinc-600 hover:bg-zinc-50"}`}>
                Stage demo split-view →
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative mt-auto border-t pt-2.5 ${dark ? "border-white/10" : "border-[#E6E6E3]"}`}>
      <button type="button" className={itemCls} onClick={onPreferences}>
        <SlidersHorizontal className={ic} strokeWidth={1.75} />
        Preferences
      </button>
      <button type="button" className={itemCls} onClick={onToggleDark}>
        <Moon className={ic} strokeWidth={1.75} />
        Dark mode
        <span
          className={`ml-auto flex h-4 w-7 items-center rounded-full px-0.5 transition-colors ${
            dark ? "justify-end bg-[#F59E0B]" : "justify-start bg-zinc-300"
          }`}
        >
          <span className="h-3 w-3 rounded-full bg-white shadow-sm" />
        </span>
      </button>
      <div className="relative">
        <button
          type="button"
          className={itemCls}
          onClick={() => setPop(pop === "themes" ? null : "themes")}
        >
          <Palette className={ic} strokeWidth={1.75} />
          Themes
        </button>
        {pop === "themes" && (
          <div className={popCls}>
            {NAV_THEMES.map((t, i) => (
              <button
                key={t.name}
                type="button"
                onClick={() => {
                  onTheme(i);
                  setPop(null);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 font-sans text-[11px] font-semibold ${
                  dark ? "text-zinc-300 hover:bg-white/[0.06]" : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ background: t.bg }} />
                {t.name}
                {themeIdx === i && <span className={dark ? "ml-auto text-zinc-500" : "ml-auto text-zinc-400"}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="relative">
        <button
          type="button"
          className={itemCls}
          onClick={() => setPop(pop === "help" ? null : "help")}
        >
          <CircleHelp className={ic} strokeWidth={1.75} />
          Help
        </button>
        {pop === "help" && (
          <div className={`${popCls} p-3`}>
            <p className={`font-sans text-[11px] font-semibold ${dark ? "text-zinc-200" : "text-zinc-800"}`}>
              OtaPath Clinician
            </p>
            <p className={`mt-1 font-sans text-[10.5px] font-medium leading-snug ${dark ? "text-zinc-400" : "text-zinc-500"}`}>
              Caseload, drift charts, prescriptions and nudges all sync live with each
              patient&rsquo;s app. Create a patient&rsquo;s login via
              &ldquo;Add patient&rdquo; and hand them the credentials.
            </p>
          </div>
        )}
      </div>

      {/* signed-in clinician */}
      <div className="relative mt-1.5">
        <button
          type="button"
          onClick={() => setPop(pop === "user" ? null : "user")}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 transition-colors ${
            dark ? "hover:bg-white/[0.06]" : "hover:bg-white/70"
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200 font-sans text-[11px] font-bold text-amber-800">
            AL
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className={`block truncate font-sans text-[12px] font-semibold ${dark ? "text-zinc-100" : "text-zinc-800"}`}>
              Dr. Aino Lindqvist
            </span>
            <span className={`block truncate font-sans text-[10px] font-medium ${dark ? "text-zinc-500" : "text-zinc-400"}`}>
              TMS psychiatrist
            </span>
          </span>
          <ChevronsUpDown className={`h-3.5 w-3.5 ${dark ? "text-zinc-500" : "text-zinc-400"}`} strokeWidth={2} />
        </button>
        {pop === "user" && (
          <div className={popCls}>
            <Link
              href="/app"
              className={`flex items-center rounded-lg px-2 py-1.5 font-sans text-[11px] font-semibold ${
                dark ? "text-zinc-300 hover:bg-white/[0.06]" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              Open patient app →
            </Link>
            <Link
              href="/demo"
              className={`flex items-center rounded-lg px-2 py-1.5 font-sans text-[11px] font-semibold ${
                dark ? "text-zinc-300 hover:bg-white/[0.06]" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              Stage demo split-view →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
