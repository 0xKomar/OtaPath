import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Map,
  Users,
  MonitorPlay,
} from "lucide-react";
import { JourneyDeck } from "@/components/demo/JourneyDeck";
import { StagePhone } from "@/components/demo/StagePhone";
import { ControlsPopover } from "@/components/demo/ControlsPopover";

export const metadata: Metadata = {
  title: { absolute: "demo" },
  description: "OtaPath — patient app + closed-loop clinician brain, live side by side",
};

const RAIL_NAV = [
  { href: "/app", icon: Map, label: "Patient app" },
  { href: "/clinician", icon: Users, label: "Clinician portal" },
  { href: "/demo", icon: MonitorPlay, label: "Stage demo", active: true },
];

export default function DemoPage() {
  return (
    <main className="flex h-dvh overflow-hidden bg-[#F7F7F5] font-sans">
      {/* left icon rail — same shell as the clinician sidebar */}
      <nav className="flex w-14 shrink-0 flex-col items-center bg-[#1C1917] py-3">
        <Link href="/demo" title="OtaPath">
          <Image
            src="/logooatpath.png"
            alt="OtaPath"
            width={36}
            height={36}
            className="rounded-lg"
          />
        </Link>
        <div className="mt-5 flex flex-col gap-1.5">
          {RAIL_NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              title={n.label}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                n.active
                  ? "bg-[#FF6B2B] text-white"
                  : "text-white/50 hover:bg-white/10 hover:text-white"
              }`}
            >
              <n.icon className="h-4 w-4" strokeWidth={2.25} />
            </Link>
          ))}
        </div>
        <div className="mt-auto flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 font-sans text-[10px] font-extrabold text-amber-800">
          AL
        </div>
      </nav>

      {/* patient phone stage — follows the deck's slide cues */}
      <StagePhone />

      {/* workspace — header + the journey deck filling the whole stage */}
      <section className="flex flex-1 flex-col overflow-hidden bg-white">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[#E6E6E3] bg-white px-6">
          <Image
            src="/logooatpath.png"
            alt="OtaPath"
            width={24}
            height={24}
            className="rounded-md"
          />
          <p className="font-sans text-[12px] font-semibold text-zinc-400">
            OtaPath <span className="mx-1 text-zinc-300">›</span>{" "}
            <span className="text-zinc-800">demo</span>
          </p>
          <div className="ml-auto flex items-center gap-2">
            <ControlsPopover />
            <Link
              href="/clinician"
              className="rounded-lg border border-[#E6E6E3] px-2.5 py-1.5 font-sans text-[11px] font-bold text-zinc-600 transition-colors hover:border-[#D1D1CD] hover:bg-[#FAFAF9]"
            >
              Clinician portal
            </Link>
            <Link
              href="/app"
              className="rounded-lg bg-[#FF6B2B] px-2.5 py-1.5 font-sans text-[11px] font-bold text-white transition-colors hover:bg-[#F25B1B]"
            >
              Patient app
            </Link>
          </div>
        </div>

        {/* the patient journey — full-stage narrative deck driving the phone */}
        <div className="min-h-0 flex-1">
          <JourneyDeck />
        </div>
      </section>
    </main>
  );
}
