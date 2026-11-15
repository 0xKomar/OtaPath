import Image from "next/image";
import Link from "next/link";
import { Presentation, Stethoscope, Smartphone, ArrowRight } from "lucide-react";

const CARDS = [
  {
    href: "/demo",
    icon: Presentation,
    title: "Guided demo",
    blurb: "An 8-minute story — follow Matti's first two weeks home and watch the whole care loop close, step by step.",
    accent: "bg-tangerine",
    tag: "start here",
  },
  {
    href: "/clinician",
    icon: Stethoscope,
    title: "Clinician dashboard",
    blurb: "The caseload view — triage, 14-day biomarkers, mission ledger, memory capsules, and patient onboarding.",
    accent: "bg-cobalt",
    tag: "5-patient cohort",
  },
  {
    href: "/app",
    icon: Smartphone,
    title: "Patient app",
    blurb: "The phone-sized companion — fog-of-war map, tiny daily quests, voice + photo memory capsules, adaptive audio.",
    accent: "bg-forest",
    tag: "sign-in required",
  },
];

export default function Landing() {
  return (
    <main className="min-h-dvh bg-cream font-sans text-ink-charcoal">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center px-6 py-14">
        {/* wordmark */}
        <Image
          src="/logooatpath.png"
          alt="OtaPath"
          width={88}
          height={88}
          className="rounded-[22px] shadow-none"
          priority
        />
        <h1 className="mt-5 font-display text-[42px] font-bold tracking-tight">
          OtaPath
        </h1>
        <p className="mt-2 max-w-md text-center text-[15px] leading-relaxed text-ink-charcoal/70">
          A warm walking companion for the fragile weeks after psychiatric
          inpatient care. Tiny real-world quests rebuild self-efficacy —
          while voice, photo and movement quietly keep the care team in the
          loop.
        </p>

        {/* entry cards */}
        <div className="mt-10 grid w-full gap-4 sm:grid-cols-3">
          {CARDS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="card-tactile group flex flex-col rounded-[28px] border-b-4 border-ink-charcoal/15 bg-butter p-5 transition-transform hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <span className={`grid h-11 w-11 place-items-center rounded-2xl text-cream ${c.accent}`}>
                  <c.icon size={22} strokeWidth={2.2} />
                </span>
                <span className="rounded-full bg-cream px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-charcoal/60">
                  {c.tag}
                </span>
              </div>
              <h2 className="mt-4 font-display text-lg font-bold">{c.title}</h2>
              <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-ink-charcoal/65">
                {c.blurb}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold text-ink-charcoal/80">
                Open
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        {/* demo logins for evaluators */}
        <div className="mt-8 w-full rounded-[24px] border border-ink-charcoal/10 bg-butter/50 px-6 py-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-charcoal/50">
            Demo accounts — patients can't self-register
          </p>
          <div className="mt-3 grid gap-x-8 gap-y-1.5 text-[13px] sm:grid-cols-2">
            <div className="flex justify-between gap-3">
              <span className="text-ink-charcoal/60">Clinician</span>
              <code className="font-semibold">lindqvist@otapath.app · clinic-demo-2024</code>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-ink-charcoal/60">Patient (Matti)</span>
              <code className="font-semibold">matti@otapath.app · demo1234</code>
            </div>
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-charcoal/55">
            Accounts are issued from the clinician dashboard (+ Patient) or the
            seed — the patient simply signs in inside the app.
          </p>
        </div>
      </div>
    </main>
  );
}
