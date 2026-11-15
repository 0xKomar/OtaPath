"use client";

/**
 * BaselineModal — 2-step "how OtaPath learns you" calibration.
 * Zero questionnaires: it explains that Voice, Mobility Radius and
 * Sensory Savoring are learned quietly from what you already do,
 * then stamps a personal discharge-day baseline used by the
 * clinician charts as the reference line.
 */

import { useEffect, useState } from "react";
import { Mic, Footprints, Feather, Check, X } from "lucide-react";
import { useOtaStore } from "@/store/useOtaStore";
import { mobilityRadiusM } from "@/lib/biometricHistory";
import { OtaButton } from "@/components/ui/OtaButton";
import { OtaDog } from "@/components/ui/OtaDog";

const SIGNALS = [
  { icon: Mic, label: "Voice", text: "how bright and varied your voice sounds when you leave a note", color: "text-cobalt" },
  { icon: Footprints, label: "Mobility", text: "how far you wander — your exploration radius, not your address", color: "text-tangerine" },
  { icon: Feather, label: "Savoring", text: "how vividly you describe what catches your eye", color: "text-forest" },
];

export function BaselineModal() {
  const open = useOtaStore((s) => s.baselineOpen);
  const setOpen = useOtaStore((s) => s.setBaselineOpen);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [doneAt, setDoneAt] = useState<number | null>(null);

  // calibration runs ~2.6s once we reach step 2, then writes baseline
  useEffect(() => {
    if (step !== 2 || doneAt) return;
    const id = window.setTimeout(() => {
      const st = useOtaStore.getState();
      st.setBaseline({
        prosody: Math.round(st.biometrics.voiceProsody),
        savoring: Math.round(st.biometrics.nlpSavoring),
        mobility: mobilityRadiusM(st.walkedPath),
        hrv: Math.round(st.biometrics.hrv),
        luminance: Math.round(st.biometrics.photoLuminance),
        sleep: Math.round(st.biometrics.sleepRegularity),
        at: Date.now(),
      });
      setDoneAt(Date.now());
    }, 2600);
    return () => window.clearTimeout(id);
  }, [step, doneAt]);

  if (!open) return null;
  const reset = () => {
    setOpen(false);
    setStep(0);
    setDoneAt(null);
  };

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-cream/97 p-4">
      <button
        type="button"
        onClick={reset}
        aria-label="Close"
        className="card-tactile absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-butter"
      >
        <X className="h-4 w-4 text-ink-charcoal" strokeWidth={2.75} />
      </button>

      <div className="toast-in w-full max-w-md">
        {step === 0 && (
          <>
            <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-tangerine">
              Step 1 · how this works
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight">
              OtaPath learns <em className="italic">your</em> normal
            </h2>
            <p className="mt-3 font-sans text-sm font-medium leading-relaxed text-ink-charcoal/70">
              No forms, no quizzes, no &ldquo;rate your mood 1–10&rdquo;. After TMS, the app quietly builds
              your personal baseline from three gentle signals — gathered from things you
              already do here:
            </p>
            <div className="mt-5 flex flex-col gap-3">
              {SIGNALS.map((s) => (
                <div key={s.label} className="card-tactile flex items-start gap-3 bg-butter p-3.5">
                  <s.icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.color}`} strokeWidth={2.5} />
                  <div>
                    <p className="font-sans text-sm font-extrabold text-ink-charcoal">{s.label}</p>
                    <p className="font-sans text-xs font-medium leading-snug text-ink-charcoal/60">
                      {s.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <OtaButton onClick={() => setStep(1)}>Sounds kind — continue</OtaButton>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-tangerine">
              Step 2 · your starting point
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight">
              Set today as <em className="italic">day zero</em>
            </h2>
            <p className="mt-3 font-sans text-sm font-medium leading-relaxed text-ink-charcoal/70">
              We&apos;ll mark where you are right now as your reference point. From here, OtaPath
              only watches for <em className="italic">changes</em> — never judges the number itself.
              A quiet week is just weather.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <OtaButton onClick={() => setStep(2)}>Calibrate my baseline</OtaButton>
              <button
                type="button"
                onClick={reset}
                className="font-sans text-sm font-bold text-ink-charcoal/45 underline underline-offset-4"
              >
                maybe later
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center text-center">
            {!doneAt ? (
              <>
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-solar/30" />
                  <OtaDog state="idle" size={104} />
                </div>
                <p className="mt-5 font-display text-2xl font-semibold italic">listening to your light…</p>
                <p className="mt-2 font-sans text-xs font-bold text-ink-charcoal/45">
                  reading signals from today — takes a breath or two
                </p>
              </>
            ) : (
              <>
                <OtaDog state="win" size={110} />
                <p className="mt-5 font-display text-2xl font-semibold">Baseline set</p>
                <p className="mt-2 max-w-xs font-sans text-sm font-medium leading-snug text-ink-charcoal/60">
                  This is your personal horizon line — the clinician dashboard now draws
                  it beneath your charts as the reference.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {[
                    `voice ${useOtaStore.getState().baseline?.prosody}`,
                    `savor ${useOtaStore.getState().baseline?.savoring}`,
                    `hrv ${useOtaStore.getState().baseline?.hrv}`,
                    `${useOtaStore.getState().baseline?.mobility}m`,
                  ].map((t) => (
                    <span key={t} className="rounded-full bg-butter px-3 py-1.5 font-sans text-[11px] font-bold text-ink-charcoal/60">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-6">
                  <OtaButton onClick={reset}>
                    <Check className="h-4 w-4" strokeWidth={3} />
                    Lovely — done
                  </OtaButton>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
