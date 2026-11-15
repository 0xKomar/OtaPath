import type { Metadata } from "next";
import { SproutPin } from "@/components/ui/OtaShapes";
import { OtaDog } from "@/components/ui/OtaDog";
import { OtaButton } from "@/components/ui/OtaButton";
import { VoiceBlob } from "@/components/ui/VoiceBlob";
import { FogWalkDemo } from "@/components/ui/FogWalkDemo";

export const metadata: Metadata = { title: "Styleguide" };

const SWATCHES = [
  { name: "cream", hex: "#FDF8EE", role: "Paper canvas", ink: false },
  { name: "butter", hex: "#FBE8A6", role: "Warm cards & mist", ink: false },
  { name: "solar", hex: "#FFCE32", role: "Sun moments · golden fog", ink: false },
  { name: "tangerine", hex: "#FF6B2B", role: "Missions · voice · energy", ink: true },
  { name: "forest", hex: "#1E8E5A", role: "Nature POIs · completed", ink: true },
  { name: "cobalt", hex: "#2563EB", role: "Culture · cinema", ink: true },
  { name: "sky", hex: "#38BDF8", role: "Calm breathers", ink: false },
  { name: "blush", hex: "#F472B6", role: "Memory capsules", ink: true },
  { name: "charcoal", hex: "#1C1917", role: "Ink — never pure black", ink: true },
] as const;

function Section({
  n,
  title,
  blurb,
  children,
}: {
  n: string;
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-baseline gap-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tangerine font-sans text-sm font-bold text-cream">
          {n}
        </span>
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            {title}
          </h2>
          {blurb && (
            <p className="mt-1 font-sans text-sm font-medium text-ink-charcoal/60">
              {blurb}
            </p>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}

export default function Styleguide() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-6 py-16">
      {/* ---------- hero ---------- */}
      <header className="flex flex-col items-start gap-6">
        <div className="flex items-center gap-5">
          <OtaDog size={96} state="idle" />
          <div>
            <p className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-tangerine">
              OtaPath · Design System v0.1
            </p>
            <h1 className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">
              Warm solar &{" "}
              <em className="display-italic font-medium">organic earth</em>
            </h1>
          </div>
        </div>
        <p className="max-w-xl font-sans text-lg font-medium leading-relaxed text-ink-charcoal/70">
          Everything in OtaPath feels{" "}
          <strong className="text-ink-charcoal">
            warm, tactile, human, papery and joyful
          </strong>{" "}
          — a modern illustrated mindfulness book meets a playful map explorer.
          Every component in Phases 1–4 inherits these tokens.
        </p>
      </header>

      {/* ---------- palette ---------- */}
      <Section n="01" title="Palette" blurb="Flat color blocks. Crisp corners. No gradients, no neon.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {SWATCHES.map((s) => (
            <div key={s.name} className="card-tactile overflow-hidden bg-cream">
              <div
                className="flex h-24 items-end p-3"
                style={{ background: `var(--${s.name})` }}
              >
                <span
                  className={`font-sans text-xs font-bold ${
                    s.ink ? "text-cream/90" : "text-ink-charcoal/60"
                  }`}
                >
                  {s.hex}
                </span>
              </div>
              <div className="p-3">
                <p className="font-sans text-sm font-bold">bg-{s.name}</p>
                <p className="font-sans text-xs font-medium text-ink-charcoal/55">
                  {s.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- type ---------- */}
      <Section
        n="02"
        title="Typography"
        blurb="Fraunces for feelings · Plus Jakarta Sans for everything else."
      >
        <div className="card-tactile bg-butter p-8">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-ink-charcoal/50">
            Display — Fraunces
          </p>
          <p className="mt-3 font-display text-4xl font-semibold leading-snug tracking-tight sm:text-5xl">
            What caught{" "}
            <em className="display-italic text-tangerine">your eye</em> today?
          </p>
          <p className="mt-4 font-display text-2xl font-medium italic text-ink-charcoal/80">
            I hope today felt a little lighter.
          </p>
        </div>
        <div className="card-tactile bg-cream p-8">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-ink-charcoal/50">
            UI / Body / Numbers — Plus Jakarta Sans
          </p>
          <p className="mt-3 font-sans text-2xl font-bold tracking-tight">
            9 places uncovered · 2.4 km wandered · 3 capsules tucked away
          </p>
          <p className="mt-2 font-sans text-base font-medium text-ink-charcoal/65">
            Bold, rounded and super-legible with tight tracking — buttons, map
            stats and friendly micro-copy all speak Jakarta.
          </p>
          <p className="mt-4 font-sans text-4xl font-bold tracking-tight text-forest">
            0123456789
          </p>
        </div>
      </Section>

      {/* ---------- buttons ---------- */}
      <Section
        n="03"
        title="Sticker buttons"
        blurb="Physical rubber-sticker feel — press and hold to feel the squash."
      >
        <div className="card-tactile flex flex-wrap items-center gap-4 bg-cream p-8">
          <OtaButton variant="tangerine">Start mission</OtaButton>
          <OtaButton variant="solar">Sunny!</OtaButton>
          <OtaButton variant="forest">Mark found</OtaButton>
          <OtaButton variant="cobalt">See cinema</OtaButton>
          <OtaButton variant="blush">Open capsule</OtaButton>
          <OtaButton variant="paper">Maybe later</OtaButton>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <OtaButton size="sm" variant="tangerine">
            Small sticker
          </OtaButton>
          <OtaButton size="md" variant="tangerine">
            Medium sticker
          </OtaButton>
          <OtaButton size="lg" variant="tangerine">
            Big friendly sticker
          </OtaButton>
        </div>
      </Section>

      {/* ---------- mascots ---------- */}
      <Section
        n="04"
        title="Mascots & map shapes"
        blurb="Custom illustrated friends — never stock icons."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="card-tactile flex flex-col items-center gap-3 bg-butter p-6">
            <OtaDog size={92} state="idle" />
            <p className="font-sans text-xs font-bold">OtaDog · idle</p>
          </div>
          <div className="card-tactile flex flex-col items-center gap-3 bg-butter p-6">
            <OtaDog size={92} state="walk" />
            <p className="font-sans text-xs font-bold">OtaDog · walk</p>
          </div>
          <div className="card-tactile flex flex-col items-center gap-3 bg-cream p-6">
            <OtaDog size={92} state="win" />
            <p className="font-sans text-xs font-bold">OtaDog · win</p>
          </div>
          <div className="card-tactile flex flex-col items-center gap-3 bg-cream p-6">
            <OtaDog size={92} state="static" />
            <p className="font-sans text-xs font-bold">OtaDog · static</p>
          </div>
        </div>
        <div className="card-tactile flex flex-wrap items-end justify-around gap-6 bg-[#EFE5CB] p-8">
          <div className="flex flex-col items-center gap-2">
            <SproutPin kind="park" size={64} wiggle />
            <p className="font-sans text-xs font-bold">SproutPin · park</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <SproutPin kind="cinema" size={64} wiggle />
            <p className="font-sans text-xs font-bold">SproutPin · cinema</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <SproutPin kind="sport" size={64} wiggle />
            <p className="font-sans text-xs font-bold">SproutPin · sport</p>
          </div>
        </div>
      </Section>

      {/* ---------- fog ---------- */}
      <Section
        n="05"
        title="Golden fog-of-war"
        blurb="A warm paper mist that peels away like a scratch-off — never a gloomy dark fog."
      >
        <FogWalkDemo />
      </Section>

      {/* ---------- voice ---------- */}
      <Section
        n="06"
        title="Voice blob"
        blurb="A morphing organic blob that reacts to your mic — no sterile equalizer."
      >
        <div className="card-tactile flex justify-center bg-butter p-10">
          <VoiceBlob />
        </div>
      </Section>

      {/* ---------- patterns ---------- */}
      <Section
        n="07"
        title="Card patterns"
        blurb="Rounded-[28px], flat blocks, border-b-4 sticker edges — no drop shadows."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {/* active mission */}
          <div className="card-tactile bg-butter p-6">
            <span className="inline-block rounded-full bg-tangerine px-3 py-1 font-sans text-xs font-bold uppercase tracking-wide text-cream">
              Active mission
            </span>
            <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight">
              Wander to the old cinema on Elm&nbsp;St
            </h3>
            <p className="mt-1 font-sans text-sm font-medium text-ink-charcoal/60">
              ~14 min stroll · leaves crunch nicely this time of day
            </p>
            <div className="mt-5">
              <OtaButton size="sm">Let&apos;s wander</OtaButton>
            </div>
          </div>
          {/* memory capsule */}
          <div className="card-tactile bg-cream p-6">
            <span className="inline-block rounded-full bg-blush px-3 py-1 font-sans text-xs font-bold uppercase tracking-wide text-cream">
              Memory capsule
            </span>
            <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight">
              <em className="display-italic">“The geese were yelling again…”</em>
            </h3>
            <p className="mt-1 font-sans text-sm font-medium text-ink-charcoal/60">
              Voice note · 0:42 · left near the pond
            </p>
            <div className="mt-5">
              <OtaButton size="sm" variant="blush">
                Play it back
              </OtaButton>
            </div>
          </div>
          {/* nature poi */}
          <div className="card-tactile bg-cream p-6">
            <span className="inline-block rounded-full bg-forest px-3 py-1 font-sans text-xs font-bold uppercase tracking-wide text-cream">
              Park found
            </span>
            <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight">
              Linden Pocket Park
            </h3>
            <p className="mt-1 font-sans text-sm font-medium text-ink-charcoal/60">
              A bench in dappled light · birdsong rating: excellent
            </p>
            <div className="mt-5">
              <OtaButton size="sm" variant="forest">
                Visit again
              </OtaButton>
            </div>
          </div>
          {/* breather */}
          <div className="card-tactile bg-cream p-6">
            <span className="inline-block rounded-full bg-sky px-3 py-1 font-sans text-xs font-bold uppercase tracking-wide text-ink-charcoal">
              Calm breather
            </span>
            <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight">
              Three slow breaths with the sky
            </h3>
            <p className="mt-1 font-sans text-sm font-medium text-ink-charcoal/60">
              In for four… hold… out for six. The cloud is doing it too.
            </p>
            <div className="mt-5">
              <OtaButton size="sm" variant="cobalt">
                Breathe together
              </OtaButton>
            </div>
          </div>
        </div>
        {/* editorial sign-off card */}
        <div className="card-tactile bg-solar p-10 text-center">
          <p className="font-display text-3xl font-medium italic tracking-tight sm:text-4xl">
            I hope you found this useful!
          </p>
          <p className="mt-2 font-sans text-sm font-bold text-ink-charcoal/60">
            — with warmth, the OtaPath sun
          </p>
        </div>
      </Section>

      {/* ---------- rules ---------- */}
      <Section n="08" title="Ground rules" blurb="The anti-slop contract every component signs.">
        <div className="card-tactile bg-cream p-8">
          <ul className="grid gap-3 font-sans text-sm font-bold sm:grid-cols-2">
            {[
              "Warm paper canvas — never clinical white/blue",
              "Flat color blocks + sticker edges — never drop shadows or glass",
              "Charcoal ink #1C1917 — never pure #000000",
              "Fraunces italic for feelings — Jakarta bold for function",
              "Custom blob mascots — never thin stock line icons",
              "Golden mist — never dark gloomy fog",
            ].map((r) => (
              <li key={r} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest text-[10px] text-cream">
                  ✓
                </span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <footer className="flex items-center justify-between border-t-2 border-ink-charcoal/10 pt-8 pb-4">
        <p className="font-display text-lg font-medium italic">
          OtaPath — step outside, feel brighter
        </p>
        <div className="flex items-center gap-2">
          <SproutPin kind="park" size={28} />
          <SproutPin kind="cinema" size={28} />
          <SproutPin kind="sport" size={28} />
        </div>
      </footer>
    </main>
  );
}
