/**
 * closedLoopEngine.ts — the "LEARN" stage of the loop, made visible.
 * Lightweight contextual bandit: 5 intervention arms, each outcome
 * carries a context bucket + next-day biometric deltas. Reward is the
 * weighted composite delta (-1..1). Posteriors are per-arm running
 * means (Bayesian flavor via Beta shrinkage toward 0), so the engine
 * can rank arms globally or within a context — and explain itself.
 */

import type { PatientState } from "./poi";

export type ArmId = "nature" | "culture" | "sport" | "alpha" | "theta";

export const ARMS: Record<ArmId, { label: string; phrase: string }> = {
  nature: { label: "Nature walk + color hunt", phrase: "nature walks" },
  culture: { label: "Cinema / cultural visit", phrase: "cinema visits" },
  sport: { label: "Sports club / physical", phrase: "gym visits" },
  alpha: { label: "10 Hz alpha soundscape", phrase: "10 Hz alpha audio" },
  theta: { label: "6 Hz theta breathing", phrase: "6 Hz theta breathing" },
};

export interface BanditContext {
  tod: "morning" | "afternoon" | "evening";
  energy: PatientState;
  light: "bright" | "dim" | "dark";
}

/** next-day biometric deltas, each normalized to -1..1 */
export interface OutcomeDeltas {
  prosody: number;
  savoring: number;
  mobility: number;
  hrv: number;
}

export interface Outcome extends BanditContext {
  at: number;
  arm: ArmId;
  deltas: OutcomeDeltas;
  reward: number;
}

const W: OutcomeDeltas = { prosody: 0.25, savoring: 0.35, mobility: 0.15, hrv: 0.25 };

export function compositeReward(d: OutcomeDeltas): number {
  return +(
    d.prosody * W.prosody + d.savoring * W.savoring + d.mobility * W.mobility + d.hrv * W.hrv
  ).toFixed(3);
}

export function currentContext(energy: PatientState, at = new Date()): BanditContext {
  const h = at.getHours();
  return {
    tod: h < 11 ? "morning" : h < 17 ? "afternoon" : "evening",
    energy,
    light: h >= 7 && h < 20 ? "bright" : h >= 20 && h < 23 ? "dim" : "dark",
  };
}

export class ClosedLoopEngine {
  outcomes: Outcome[] = [];

  record(arm: ArmId, ctx: BanditContext, deltas: OutcomeDeltas, at = Date.now()): Outcome {
    const o: Outcome = { at, arm, ...ctx, deltas, reward: compositeReward(deltas) };
    this.outcomes.push(o);
    return o;
  }

  /** Beta-shrunk mean reward per arm ((Σr + prior) / (n + priorN)) */
  armMean(arm: ArmId, ctx?: Partial<BanditContext>): { mean: number; n: number } {
    const os = this.outcomes.filter(
      (o) =>
        o.arm === arm &&
        (!ctx?.tod || o.tod === ctx.tod) &&
        (!ctx?.energy || o.energy === ctx.energy) &&
        (!ctx?.light || o.light === ctx.light)
    );
    const n = os.length;
    const mean = (os.reduce((a, o) => a + o.reward, 0) + 0) / (n + 3); // prior pulls toward 0
    return { mean, n };
  }

  /** arm → mean strongest single delta (for human-readable claims) */
  private bestDelta(arm: ArmId): { metric: keyof OutcomeDeltas; v: number } | null {
    const os = this.outcomes.filter((o) => o.arm === arm);
    if (!os.length) return null;
    const agg: OutcomeDeltas = { prosody: 0, savoring: 0, mobility: 0, hrv: 0 };
    os.forEach((o) => {
      agg.prosody += o.deltas.prosody;
      agg.savoring += o.deltas.savoring;
      agg.mobility += o.deltas.mobility;
      agg.hrv += o.deltas.hrv;
    });
    const entries = Object.entries(agg) as [keyof OutcomeDeltas, number][];
    const [metric, sum] = entries.reduce((a, b) => (Math.abs(b[1]) > Math.abs(a[1]) ? b : a));
    return { metric, v: sum / os.length };
  }

  /** ranked arms by shrunk posterior mean */
  ranking(ctx?: Partial<BanditContext>) {
    return (Object.keys(ARMS) as ArmId[])
      .map((arm) => ({ arm, ...this.armMean(arm, ctx) }))
      .sort((a, b) => b.mean - a.mean);
  }

  /** the personalized, human-readable learning sentence */
  insight(): string | null {
    if (this.outcomes.length < 5) return null;
    const ranked = this.ranking();
    const METRIC_LABEL: Record<keyof OutcomeDeltas, string> = {
      prosody: "vocal energy",
      savoring: "sensory richness",
      mobility: "mobility radius",
      hrv: "HRV",
    };
    const pct = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}%`;

    const winners = ranked.filter((r) => r.mean > 0.06 && r.n >= 2).slice(0, 2);
    const loser = ranked.filter((r) => r.mean < -0.04 && r.n >= 2).pop();
    if (!winners.length) return null;

    const parts = winners
      .map((w) => {
        const d = this.bestDelta(w.arm)!;
        return `${ARMS[w.arm].phrase} lifted next-day ${METRIC_LABEL[d.metric]} ${pct(d.v)}`;
      })
      .join(" + ");
    const drag = loser
      ? `, whereas ${ARMS[loser.arm].phrase} coincided with a ${pct(
          this.bestDelta(loser.arm)!.v
        )} ${METRIC_LABEL[this.bestDelta(loser.arm)!.metric]} dip`
      : "";
    const reco = `Prioritizing ${winners.map((w) => ARMS[w.arm].phrase).join(" & ")}.`;
    return `Closed-loop learning: ${parts}${drag}. ${reco}`;
  }

  /** Thompson-ish suggestion: argmax shrunk mean in context */
  suggest(ctx: BanditContext): ArmId {
    return this.ranking({ energy: ctx.energy })[0]?.arm ?? "nature";
  }
}

/* ---------- seeded demo history (~2 weeks of outcomes) ---------- */

export function seededEngine(now = Date.now()): ClosedLoopEngine {
  const e = new ClosedLoopEngine();
  const D = 86_400_000;
  const seed = (
    daysAgo: number,
    arm: ArmId,
    energy: PatientState,
    d: OutcomeDeltas,
    tod: BanditContext["tod"] = "afternoon"
  ) => e.record(arm, { tod, energy, light: "bright" }, d, now - daysAgo * D);

  // culture + alpha are quietly winning; sport drains; theta mildly helps
  seed(13, "nature", "LOW", { prosody: 0.08, savoring: 0.14, mobility: 0.1, hrv: 0.05 });
  seed(12, "sport", "LOW", { prosody: -0.1, savoring: -0.08, mobility: 0.06, hrv: -0.11 });
  seed(11, "culture", "LOW", { prosody: 0.16, savoring: 0.22, mobility: 0.08, hrv: 0.09 });
  seed(10, "alpha", "LOW", { prosody: 0.19, savoring: 0.12, mobility: 0.02, hrv: 0.13 });
  seed(9, "theta", "LOW", { prosody: 0.06, savoring: 0.05, mobility: 0.0, hrv: 0.08 });
  seed(8, "sport", "MODERATE", { prosody: -0.06, savoring: -0.1, mobility: 0.1, hrv: -0.11 });
  seed(7, "culture", "MODERATE", { prosody: 0.19, savoring: 0.24, mobility: 0.09, hrv: 0.07 });
  seed(6, "alpha", "MODERATE", { prosody: 0.21, savoring: 0.14, mobility: 0.01, hrv: 0.12 });
  seed(5, "nature", "MODERATE", { prosody: 0.1, savoring: 0.16, mobility: 0.12, hrv: 0.06 });
  seed(4, "sport", "MODERATE", { prosody: -0.04, savoring: -0.05, mobility: 0.08, hrv: -0.09 });
  seed(3, "culture", "MODERATE", { prosody: 0.17, savoring: 0.21, mobility: 0.07, hrv: 0.08 });
  seed(2, "alpha", "LOW", { prosody: 0.18, savoring: 0.11, mobility: 0.02, hrv: 0.14 });
  seed(1, "nature", "LOW", { prosody: 0.09, savoring: 0.13, mobility: 0.11, hrv: 0.05 }, "morning");
  return e;
}
