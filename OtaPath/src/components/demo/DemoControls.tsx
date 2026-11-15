"use client";

/**
 * DemoControls — the stage remote for the patient phone.
 * Lives on /demo next to the phone (never inside the patient app);
 * every action travels over the otapath-demo BroadcastChannel and
 * lands on the real Zustand store inside the iframe. Readback comes
 * from the app's own LoopSnapshots, so the panel always mirrors truth.
 */

import { useState } from "react";
import {
  Footprints,
  RotateCcw,
  History,
  Compass,
  PawPrint,
  MoonStar,
  Waves,
  Check,
  LocateFixed,
  Thermometer,
  Home,
  Sun,
} from "lucide-react";
import { publishDemo, type DemoMsg } from "@/lib/broadcast";
import { useClinicianFeed } from "@/lib/useClinicianFeed";
import type { PatientState } from "@/lib/poi";

const STATES: { id: PatientState; label: string }[] = [
  { id: "LOW", label: "Low" },
  { id: "MODERATE", label: "Balanced" },
  { id: "HIGH", label: "High" },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-[#FAFAF9] px-2.5 py-2">
      <p className="font-sans text-[9.5px] font-bold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </p>
      <div className="flex min-w-0 items-center gap-1.5">{children}</div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  active,
  disabled,
  accent,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  accent?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 font-sans text-[11px] font-bold transition-colors disabled:opacity-45 ${
        accent
          ? "bg-[#FF6B2B] text-white hover:bg-[#F25B1B]"
          : active
            ? "bg-[#1C1917] text-white"
            : "border border-[#E6E6E3] bg-white text-zinc-600 hover:border-[#D1D1CD] hover:bg-[#FAFAF9]"
      }`}
    >
      {children}
    </button>
  );
}

function Switch({
  on,
  onToggle,
  icon,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex flex-1 items-center gap-2 rounded-lg border border-[#E6E6E3] px-2.5 py-1.5 text-left transition-colors hover:bg-[#FAFAF9]"
    >
      <span className="text-zinc-400">{icon}</span>
      <span className="flex-1 font-sans text-[11px] font-bold text-zinc-600">
        {label}
      </span>
      <span
        className={`flex h-[18px] w-[32px] items-center rounded-full p-[2px] transition-colors ${
          on ? "bg-[#FF6B2B]" : "bg-zinc-300"
        }`}
      >
        <span
          className={`h-[14px] w-[14px] rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-[14px]" : ""
          }`}
        />
      </span>
    </button>
  );
}

export function DemoControls() {
  const snap = useClinicianFeed();
  const [name, setName] = useState("");
  const [sentName, setSentName] = useState(false);
  const send = (m: DemoMsg) => publishDemo(m);

  const saveName = () => {
    const v = name.trim();
    if (!v) return;
    send({ t: "dog", name: v });
    setName("");
    setSentName(true);
    setTimeout(() => setSentName(false), 1800);
  };

  return (
    <div className="w-full rounded-xl border border-[#E6E6E3] bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
          demo controls
        </p>
        <p className="font-sans text-[9.5px] font-medium tabular-nums text-zinc-400">
          {snap.exploredPct != null ? `${snap.exploredPct.toFixed(1)}% explored` : "waiting for app…"}
          {snap.activeMissionName ? ` · ${snap.activeMissionName}` : ""}
          {snap.locationSource ? ` · ${snap.locationSource}` : ""}
        </p>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* companion */}
        <Row label="Companion">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            placeholder={snap.dogName ?? "name the dog"}
            className="min-w-0 flex-1 rounded-lg border border-[#E6E6E3] bg-white px-2.5 py-1.5 font-sans text-[11.5px] font-bold text-zinc-700 outline-none placeholder:font-medium placeholder:text-zinc-400 focus:border-[#FF6B2B]"
          />
          <Btn onClick={saveName} disabled={!name.trim()}>
            {sentName ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <PawPrint className="h-3.5 w-3.5" strokeWidth={2.5} />}
            {sentName ? "set" : "name"}
          </Btn>
        </Row>

        {/* patient state */}
        <Row label="Energy">
          {STATES.map((s) => (
            <Btn
              key={s.id}
              active={snap.patientState === s.id}
              onClick={() => send({ t: "state", s: s.id })}
              title={`Simulate ${s.label.toLowerCase()} energy`}
            >
              {s.label}
            </Btn>
          ))}
        </Row>

        {/* walk + world */}
        <Row label="World">
          <Btn
            accent
            disabled={snap.simRunning}
            onClick={() => send({ t: "walk" })}
            title="Simulate a 550 m walk through Otaniemi"
          >
            <Footprints className="h-3.5 w-3.5" strokeWidth={2.5} />
            {snap.simRunning ? "walking…" : "walk 550 m"}
          </Btn>
          <Btn onClick={() => send({ t: "reset" })} title="Re-cover the map in mist">
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.5} />
            mist
          </Btn>
          <Btn onClick={() => send({ t: "seed" })} title="Seed three memory capsules (one frosted Echo)">
            <History className="h-3.5 w-3.5" strokeWidth={2.5} />
            seed
          </Btn>
          <Btn onClick={() => send({ t: "baseline" })} title="Open baseline calibration on the phone">
            <Compass className="h-3.5 w-3.5" strokeWidth={2.5} />
            baseline
          </Btn>
          <Btn onClick={() => send({ t: "locate" })} title="Use the phone's real GPS position">
            <LocateFixed className="h-3.5 w-3.5" strokeWidth={2.5} />
            locate
          </Btn>
        </Row>

        {/* today's context — sick/housebound → window quest, alerts paused */}
        <Row label="Today's context">
          <Btn
            active={!snap.contextFlag || snap.contextFlag === "auto"}
            onClick={() => send({ t: "context", v: "auto" })}
            title="Outdoor quests as usual"
          >
            <Sun className="h-3.5 w-3.5" strokeWidth={2.5} />
            outdoor
          </Btn>
          <Btn
            active={snap.contextFlag === "sick"}
            onClick={() => send({ t: "context", v: "sick" })}
            title="Feeling unwell — rest day, window quest"
          >
            <Thermometer className="h-3.5 w-3.5" strokeWidth={2.5} />
            unwell
          </Btn>
          <Btn
            active={snap.contextFlag === "housebound"}
            onClick={() => send({ t: "context", v: "housebound" })}
            title="Can't go out — daylight at the window"
          >
            <Home className="h-3.5 w-3.5" strokeWidth={2.5} />
            indoors
          </Btn>
        </Row>

        {/* comfort */}
        <Row label="Comfort">
          <Switch
            on={snap.comfortMotion === "soft"}
            onToggle={() =>
              send({ t: "motion", v: snap.comfortMotion === "soft" ? "full" : "soft" })
            }
            icon={<Waves className="h-3.5 w-3.5" strokeWidth={2.5} />}
            label="Soft motion"
          />
          <Switch
            on={snap.comfortTheme === "candle"}
            onToggle={() =>
              send({ t: "theme", v: snap.comfortTheme === "candle" ? "day" : "candle" })
            }
            icon={<MoonStar className="h-3.5 w-3.5" strokeWidth={2.5} />}
            label="Candle"
          />
        </Row>
      </div>
    </div>
  );
}
