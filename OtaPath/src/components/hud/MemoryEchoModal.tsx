"use client";

/**
 * MemoryEchoModal — zero-guilt autobiographical recall challenge.
 * A ≥7-day capsule frosts on the map; tapping it shows the photo
 * heavily blurred with a context-anchored question. The user may
 * answer by voice (measures retrieval latency + recall overlap) or
 * reveal with zero penalty. Either way the memory re-illuminates
 * and the original recording + soundscape play back.
 */

import { useEffect, useRef, useState } from "react";
import { Mic, Square, X, Eye, RotateCcw } from "lucide-react";
import { daysOld, echoQuestion, recallOverlap } from "@/lib/echo";
import { useOtaStore, type MemoryCapsule } from "@/store/useOtaStore";
import { useVoiceAnalyzer } from "@/lib/useVoiceAnalyzer";
import { OtaButton } from "@/components/ui/OtaButton";

const nowMs = () => Date.now();

export function MemoryEchoModal() {
  const memory = useOtaStore((s) => s.memories.find((m) => m.id === s.echoMemoryId));
  const closeEcho = useOtaStore((s) => s.closeEcho);

  if (!memory) return null;
  return <EchoBody key={memory.id} memory={memory} onClose={closeEcho} />;
}

function EchoBody({ memory, onClose }: { memory: MemoryCapsule; onClose: () => void }) {
  const markEchoed = useOtaStore((s) => s.markEchoed);
  const pushToast = useOtaStore((s) => s.pushToast);

  const [revealed, setRevealed] = useState(false);
  const [latencyS, setLatencyS] = useState<number | null>(null);
  const [overlap, setOverlap] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const shownAtRef = useRef(0);
  const voice = useVoiceAnalyzer();

  useEffect(() => {
    shownAtRef.current = nowMs();
  }, []);

  const days = Math.max(7, daysOld(memory));

  async function startAnswer() {
    setLatencyS((nowMs() - shownAtRef.current) / 1000);
    await voice.start();
  }

  async function stopAnswer() {
    const r = await voice.stop();
    const t = r.transcript || answer;
    setAnswer(t);
    setOverlap(recallOverlap(t, memory));
    reveal();
  }

  function reveal() {
    setRevealed(true);
    markEchoed(memory.id);
    pushToast("Memory echo unlocked · pin glows again");
  }

  return (
    <div className="toast-in absolute inset-0 z-[1400] flex flex-col bg-cream/97">
      <div className="flex items-center justify-between px-5 pt-5">
        <span className="rounded-full bg-sky/20 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-cobalt">
          Memory echo · {days} days ago
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-butter transition-transform active:scale-90"
        >
          <X className="h-5 w-5 text-ink-charcoal" strokeWidth={2.5} />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 overflow-y-auto px-6 pb-8">
        {memory.photoUrl ? (
          <div className="card-tactile overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={memory.photoUrl}
              alt="Echoed moment"
              className={`echo-photo h-48 w-full object-cover ${revealed ? "blur-0" : "blur-xl scale-105"}`}
            />
          </div>
        ) : (
          <div className="card-tactile flex h-36 items-center justify-center bg-butter">
            <span className="font-display text-2xl italic text-ink-charcoal/40">a quiet moment</span>
          </div>
        )}

        {!revealed ? (
          <>
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Do you remember <em className="display-italic">this one</em>?
              </h2>
              <p className="mt-2 font-sans text-sm font-medium leading-relaxed text-ink-charcoal/65">
                {echoQuestion(memory)}
              </p>
            </div>

            <div className="card-tactile flex items-center gap-3 bg-butter p-4">
              {voice.recording ? (
                <button
                  type="button"
                  onClick={stopAnswer}
                  aria-label="Stop"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tangerine transition-transform active:scale-90"
                >
                  <Square className="h-4 w-4 fill-cream text-cream" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startAnswer}
                  aria-label="Answer by voice"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tangerine transition-transform active:scale-90"
                >
                  <Mic className="h-5 w-5 text-cream" strokeWidth={2.5} />
                </button>
              )}
              <div className="flex-1">
                <p className="font-sans text-sm font-bold">
                  {voice.recording
                    ? `listening… ${Math.min(10, voice.elapsed).toFixed(0)} / 10s`
                    : "Answer by voice — 10 seconds"}
                </p>
                {voice.recording && voice.liveTranscript && (
                  <p className="mt-0.5 line-clamp-2 font-sans text-xs italic text-ink-charcoal/55">
                    “{voice.liveTranscript}”
                  </p>
                )}
                {voice.micError && (
                  <input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && answer.trim() && reveal()}
                    placeholder="…or type it here"
                    className="mt-1 w-full rounded-lg border-b-2 border-stone-900/10 bg-cream px-2 py-1 font-sans text-sm italic focus:outline-none"
                  />
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={reveal}
              className="mx-auto flex items-center gap-2 font-sans text-sm font-bold text-ink-charcoal/45"
            >
              <Eye className="h-4 w-4" strokeWidth={2.5} />
              Reveal memory — still counts
            </button>
          </>
        ) : (
          <>
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                There it <em className="display-italic">is</em>
              </h2>
              <p className="mt-1 font-sans text-xs font-bold uppercase tracking-[0.14em] text-ink-charcoal/45">
                {memory.poiName} ·{" "}
                {new Date(memory.at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            {memory.transcript && (
              <p className="font-display text-lg italic leading-snug text-ink-charcoal/85">
                “{memory.transcript}”
              </p>
            )}

            {memory.audioUrl && (
              <audio src={memory.audioUrl} controls autoPlay className="h-9 w-full" />
            )}
            {memory.soundscapePrompt && (
              <p className="font-sans text-[11px] font-medium italic text-ink-charcoal/45">
                ♫ {memory.soundscapePrompt}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {overlap != null && (
                <span className="rounded-full bg-forest px-3 py-1.5 font-sans text-xs font-bold text-cream">
                  {overlap > 0 ? `You remembered · ${overlap}%` : "A fresh look at it"}
                </span>
              )}
              {latencyS != null && (
                <span className="rounded-full bg-cobalt px-3 py-1.5 font-sans text-xs font-bold text-cream">
                  recalled in {latencyS.toFixed(1)}s
                </span>
              )}
              <span className="rounded-full bg-solar px-3 py-1.5 font-sans text-xs font-bold text-ink-charcoal/70">
                pin re-lit
              </span>
            </div>

            <div className="flex items-center gap-3">
              <OtaButton size="sm" onClick={onClose}>
                <RotateCcw className="h-4 w-4" strokeWidth={2.75} />
                Back to the map
              </OtaButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
