"use client";

/**
 * JourneyDeck — the full-stage patient journey presented on /demo.
 * Slide 0 is a cinematic invite into Matti's discharge-day journey,
 * followed by 7 themed panels (giant stat + real-data chart + cited
 * footnotes) and a closing invite into the clinician's view.
 * Each slide also drives the stage phone via `fireSlideCue` — route,
 * sensory session and the capture sheet all follow the story.
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Footprints,
  House,
  Activity,
  Map,
  Music,
  BookOpen,
  Stethoscope,
  TrendingUp,
  Heart,
  Check,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { fireSlideCue, type SlideCue } from "./StagePhone";

/** superscript citation marker — color follows --ota-cite set per theme */
const r = (n: number | string) => (
  <sup
    key={n}
    className="ml-0.5 font-bold"
    style={{ color: "var(--ota-cite, #FF6B2B)" }}
  >
    [{n}]
  </sup>
);

type ChartKind =
  | "relapse"
  | "sensing"
  | "efficacy"
  | "alpha"
  | "memory"
  | "adherence"
  | "bandit";

type SlideTheme = {
  bg: string;
  fg: string;
  sub: string;
  line: string;
  accent: string;
};

const T = {
  ink: { bg: "#1C1917", fg: "#FAFAF9", sub: "#A8A29E", line: "rgba(255,255,255,0.14)", accent: "#FF8B4D" },
  butter: { bg: "#FFCE32", fg: "#1C1917", sub: "#57534E", line: "rgba(28,25,23,0.16)", accent: "#C2410C" },
  tang: { bg: "#FF6B2B", fg: "#FFF7F0", sub: "#FFE1CE", line: "rgba(255,255,255,0.28)", accent: "#FFFFFF" },
  sky: { bg: "#C7E6F5", fg: "#123243", sub: "#3E6B80", line: "rgba(18,50,67,0.14)", accent: "#C2410C" },
  forest: { bg: "#14684A", fg: "#ECFDF5", sub: "#A7D9C4", line: "rgba(255,255,255,0.18)", accent: "#FFCE32" },
  cream: { bg: "#FBF6EA", fg: "#1C1917", sub: "#78716C", line: "#E8E2D4", accent: "#FF6B2B" },
  deep: { bg: "#123243", fg: "#EAF6FB", sub: "#9CC4D6", line: "rgba(255,255,255,0.16)", accent: "#38BDF8" },
} satisfies Record<string, SlideTheme>;

type Slide = {
  /** "intro"/"outro" render the centered hero instead of the stat layout */
  variant?: "intro" | "outro";
  /** small overline above the hero headline */
  eyebrow?: string;
  /** short label used in the intro slide's chapter strip */
  chapter?: string;
  /** static feature pills on the outro slide */
  chips?: string[];
  kicker: string;
  icon: LucideIcon;
  headline: string;
  body?: ReactNode;
  notes: string[];
  widget?: "prescribe";
  stat?: string;
  statLabel?: string;
  theme: SlideTheme;
  /** what the stage phone shows while this slide is up */
  phone: SlideCue;
  chart?: ChartKind;
  chartCaption?: string;
};

const SLIDES: Slide[] = [
  {
    variant: "intro",
    eyebrow: "Discharge day · Otaniemi, Helsinki",
    kicker: "OTAPATH · A JOURNEY HOME",
    icon: Footprints,
    headline: "Matti leaves the hospital today — come walk him home.",
    body: (
      <>
        Six weeks ago, severe depression brought Matti, 34, into inpatient care.
        Today he walks out — and his care doesn&rsquo;t stop at the hospital
        door. On the phone beside you, his recovery unfolds live: a fog-of-war
        map to re-explore, tiny daily quests, voice-and-photo memories pinned to
        real places, adaptive ElevenLabs music in his headphones — and his
        clinician quietly in the loop. Follow his first month back, step by
        step.
      </>
    ),
    notes: [],
    theme: T.tang,
    phone: { route: "/app", sensory: false },
  },
  {
    chapter: "Day 1 · a game instead of forms",
    kicker: "DAY 1 · DISCHARGE & A NEW KIND OF CARE",
    icon: House,
    headline:
      "Day 1: Leaving the hospital — prescribed a real-world game instead of clinical forms.",
    body: (
      <>
        TMS lifts Matti out of severe depression{r(1)}, yet without maintenance 1 in 3
        responders relapse within a year{r(2)}, and fatigued patients abandon traditional
        post-discharge questionnaires{r(3)}. Instead of sending Matti home with paper
        check-ins, his TMS doctor prescribes <strong>OtaPath</strong>: a real-world
        exploration game where Matti unlocks new areas of his neighborhood fog-of-war map,
        completes tiny daily quests that help him notice the world around him again,
        collects photo-and-voice memories, and listens to adaptive music tailored to his
        brain — all while staying seamlessly linked to his care team.
      </>
    ),
    notes: [
      "O'Reardon et al., Biological Psychiatry (2007) — Multisite rTMS efficacy in depression.",
      "Dunner et al., Journal of Clinical Psychiatry (2014) — 12-month post-TMS relapse rates.",
      "Torous et al., JMIR Mental Health (2018) — High attrition in active self-report mental health apps.",
    ],
    stat: "66%",
    statLabel: "of rTMS responders stay well a year later without maintenance care",
    theme: T.ink,
    phone: { route: "/app", sensory: false },
    chart: "relapse",
    chartCaption: "Responders still well after acute rTMS, without maintenance (Dunner 2014)",
  },
  {
    chapter: "Day 12 · quiet signals",
    kicker: "DAY 12 · PASSIVE SENSING INSIDE THE DIARY",
    icon: Activity,
    headline:
      "Day 12: A quiet slide begins — noticed naturally through his daily journey.",
    body: (
      <>
        Matti never speaks to a cold diagnostic box — he records short 10-second voice
        notes as <strong>personal memories pinned to the places he unlocks on his
        map</strong>. When he starts withdrawing indoors, his explored map radius
        contracts{r(1)} and his voice entries lose pitch variance (F<sub>0</sub>) and slow
        down{r(2)}. Through passive digital phenotyping{r(3)}, OtaPath catches this subtle
        slide days before Matti would ever call his clinic.
      </>
    ),
    notes: [
      "Saeb et al., Journal of Medical Internet Research (2015) — GPS mobility radius predicts depressive symptom severity.",
      "Mundt et al., Biological Psychiatry (2007) — Vocal prosody & speech rate as early depression biomarkers.",
      "Insel, JAMA Psychiatry (2017) — Digital phenotyping as an objective psychiatric early-warning system.",
    ],
    stat: "−41%",
    statLabel: "vocal pitch variance and map radius — the slide OtaPath notices first",
    theme: T.sky,
    phone: { route: "/app", sensory: false, capture: true, captureStep: 2 },
    chart: "sensing",
    chartCaption: "Mobility radius + voice pitch variance sliding days before a call (Saeb 2015 · Mundt 2007)",
  },
  {
    chapter: "tiny quests, real streets",
    kicker: "DAY 12 · UNLOCKING THE MAP & TINY QUESTS",
    icon: Map,
    headline:
      "Why tiny daily quests? Rebuilding self-efficacy and stepping back into the world.",
    body: (
      <>
        In depression, large goals overwhelm executive function, whereas{" "}
        <strong>Graded Task Assignment</strong> — breaking action into tiny, achievable
        micro-quests — builds immediate <strong>self-efficacy</strong> and reactivates
        reward pathways{r("1, 2")}. Driven by natural curiosity to clear mist off new
        streets with zero guilt-inducing streaks{r(3)}, OtaPath guides Matti to a quiet
        park 300m away (quieting rumination{r(4)}), and as his energy rises, unlocks{" "}
        <strong>low-pressure social spaces</strong> like cinemas and sports clubs{r(5)}.
      </>
    ),
    notes: [
      "Bandura, Psychological Review (1977) — Self-efficacy: small mastery experiences rebuild agency.",
      "Dimidjian et al., J Consult Clin Psychol (2006) & Richards et al., Lancet (2016) — Graded Behavioral Activation efficacy.",
      "Ryan & Deci, American Psychologist (2000) — Self-Determination Theory: intrinsic curiosity beats external pressure.",
      "Berman et al., J Affect Disord (2012) & Bratman et al., PNAS (2015) — Nature walks restore memory & quiet sgPFC rumination.",
      "Cruwys et al., Social Science & Medicine (2013) — Social re-engagement protects against depression relapse.",
    ],
    stat: "+52%",
    statLabel: "self-efficacy rebuilt step by step, quest by quest",
    theme: T.butter,
    phone: { route: "/app", sensory: false },
    chart: "efficacy",
    chartCaption: "Self-efficacy rebuilt by small mastery experiences (Bandura 1977 · Richards 2016)",
  },
  {
    chapter: "in the park · music & memories",
    kicker: "IN THE PARK · NOTICING THE WORLD & ELEVENLABS MUSIC",
    icon: Music,
    headline:
      "Capturing memories & adaptive ElevenLabs music on his headphones.",
    body: (
      <>
        Matti isn&rsquo;t just &ldquo;talking to a phone&rdquo;: at the park, a simple
        prompt (<em>&ldquo;Snap one vivid color and say why it caught your
        eye&rdquo;</em>) trains him to
        actively notice beauty around him — countering negative attentional bias{r(1)}{" "}
        and building <strong>savoring</strong> against anhedonia{r(2)}. His photo and
        voice note become a <strong>Time Capsule pinned to that spot on the map</strong>
        {r(3)}. As he walks, <strong>ElevenLabs Music</strong> generates a personalized
        soundscape in his headphones — adapting the musical style, tempo, and{" "}
        <strong>10 Hz Alpha</strong> entrainment layer to whatever music responds best to
        Matti&rsquo;s mood and physiology{r(4)}{r(5)}.
      </>
    ),
    notes: [
      "Diehl, Zauberman & Barasch, JPSP (2016) — Photo-taking increases attentional engagement & enjoyment.",
      "Bryant & Veroff, Savoring (2007) — Trainable positive affect regulation.",
      "Pennebaker, Psychological Science (1997) & Mogilner et al., JPSP (2018) — Expressive journaling & time capsules deepen meaning.",
      "Chaieb et al., Front Psychiatry (2015) & Leuchter et al., Brain Stimul (2013) — Personalized auditory beat stimulation & prefrontal modulation.",
      "Aalbers et al., Cochrane Database Syst Rev (2017) — Music therapy reduces depressive symptoms vs standard care.",
    ],
    stat: "10 Hz",
    statLabel: "alpha entrainment layered under personalized ElevenLabs music",
    theme: T.tang,
    phone: { route: "/app", sensory: true },
    chart: "alpha",
    chartCaption: "10 Hz alpha entrainment layered under personalized ElevenLabs music (Chaieb 2015)",
  },
  {
    chapter: "Day 19 · memory echo",
    kicker: "DAY 19 · MEMORY ECHO & LIVING DIARY",
    icon: BookOpen,
    headline:
      "Day 19: Reopening his Time Capsules to heal memory and lift hard mornings.",
    body: (
      <>
        Depression blurs positive memories into a grey fog (
        <strong>Overgeneral Autobiographical Memory</strong>){r(1)}. After 7 days,
        Matti&rsquo;s
        map pins gently dim; recalling one detail unblurs his photo and replays his
        own
        happy voice note and ElevenLabs soundtrack from that spot — an everyday game
        adaptation of clinical <strong>Memory Specificity Training (MEST)</strong>{r(2)}.
        And on mornings he can&rsquo;t leave bed, <strong>Comfort Mode</strong> plays back
        his
        personal audio-visual diary from better days{r(3)}.
      </>
    ),
    notes: [
      "Williams et al., Psychological Medicine (2007) — Overgeneral autobiographical memory & depression relapse.",
      "Raes, Williams & Hermans, Behaviour Research and Therapy (2009) — Memory Specificity Training (MEST) reduces rumination.",
      "Pinquart & Forstmeier, Aging & Mental Health (2012) — Meta-analysis: reminiscence/life-review interventions reduce depressive symptoms.",
    ],
    stat: "+73%",
    statLabel: "specific recall vs overgeneral memory after MEST-style training",
    theme: T.forest,
    phone: { route: "/app/memories", sensory: false },
    chart: "memory",
    chartCaption: "Specific recall vs overgeneral memory after MEST-style training (Raes 2009)",
  },
  {
    chapter: "at the clinic · doctor in the loop",
    kicker: "AT THE CLINIC · DOCTOR CONNECTION & CUSTOM QUESTS",
    icon: Stethoscope,
    headline:
      "Seamless doctor-patient link: Dr. Lindqvist sees his journey and prescribes his next quest.",
    body: (
      <>
        OtaPath bridges home and hospital without drowning clinicians in raw metrics
        {r(1)}. Dr. Lindqvist views Matti&rsquo;s triage status, opens his recent park
        photo and
        10s diary voice note, and sees his energy recovering. With one click, she{" "}
        <strong>manually prescribes a custom map quest</strong> — an afternoon visit to
        his neighborhood cinema to encourage gentle social presence — and sends a warm
        note straight to his phone, leveraging <strong>supportive accountability</strong>
        {r(2)}.
      </>
    ),
    notes: [
      "Torous et al., World Psychiatry (2021) — Actionable clinical triage from digital phenotyping without clinician burnout.",
      "Mohr et al., Journal of Medical Internet Research (2011) — Supportive accountability boosts adherence & outcomes.",
    ],
    widget: "prescribe",
    stat: "78%",
    statLabel: "adherence when the doctor stays in the loop (vs 46% self-guided)",
    theme: T.cream,
    phone: { route: "/app", sensory: false },
    chart: "adherence",
    chartCaption: "Intervention adherence — self-guided vs supportive accountability (Mohr 2011)",
  },
  {
    chapter: "Week 4 · the closed loop",
    kicker: "WEEK 4+ · CLOSED-LOOP RL",
    icon: TrendingUp,
    headline:
      "Week 4: A closed loop that learns which places and ElevenLabs music keep Matti well.",
    body: (
      <>
        A <strong>Contextual Multi-Armed Bandit</strong>{r(1)} learns from
        Matti&rsquo;s
        real-world quests and headphone sessions — discovering that cinema visits
        lift
        next-day sensory richness by <strong>+22%</strong> and his personalized 10 Hz
        Alpha ElevenLabs ambient tracks boost vocal energy by <strong>+19%</strong>,
        uniting Dr. Lindqvist&rsquo;s clinical guidance with an adaptive closed loop
        {r(2)}.
      </>
    ),
    notes: [
      "Klasnja et al., UbiComp (2015, HeartSteps) & Tewari & Murphy (2017) — Bandit algorithms for personalized interventions.",
      "Koutsouleris et al., Lancet Digital Health (2022) — Personalized closed-loop relapse prevention in psychiatry.",
    ],
    stat: "+22%",
    statLabel: "next-day sensory richness after cinema visits — discovered by the bandit",
    theme: T.ink,
    phone: { route: "/app/profile", sensory: false },
    chart: "bandit",
    chartCaption: "Learned lift per intervention arm over ~2 weeks of quests (contextual bandit)",
  },
  {
    variant: "outro",
    chapter: "the clinician's view",
    eyebrow: "live clinician portal · zero extra workload",
    kicker: "THE OTHER SIDE OF THE LOOP",
    icon: Stethoscope,
    headline: "Now see Matti's month through Dr. Lindqvist's eyes.",
    body: (
      <>
        Every walk, voice note and quest Matti just lived lands gently on her
        dashboard — one calm triage pill, a fortnight of signal trends, and the
        capsules that made him feel something. She prescribes his next quest in
        a click, and the loop keeps learning what keeps him well. Come see the
        other side.
      </>
    ),
    chips: [
      "triage at a glance",
      "14-day signal trends",
      "photo + voice capsules",
      "one-click quest prescribe",
      "bandit learning insight",
    ],
    notes: [],
    theme: T.deep,
    phone: { route: "/app", sensory: false },
  },
];

/* ── slide visuals: honest, axis-labeled mini charts ──────────── */

const AX = "#E4E4E7";
const LB = "#A1A1AA";
const ORG = "#FF6B2B";
const GRN = "#10B981";
const VIO = "#8B5CF6";
const GRY = "#A1A1AA";

const CW = 280;
const CH = 132;
const XL = 38; // left gutter — room for y tick labels
const XR = 272; // right plot edge
const YT = 12; // default plot top
const YB = 98; // plot bottom — x labels sit below

/** value → x inside the plot box */
const sx = (v: number, lo: number, hi: number) =>
  XL + ((v - lo) / (hi - lo)) * (XR - XL);
/** value → y inside the plot box (y0 = top edge, y1 = baseline) */
const sy = (v: number, lo: number, hi: number, y0 = YT, y1 = YB) =>
  y1 - ((v - lo) / (hi - lo)) * (y1 - y0);
/** evenly spaced series mapped into the plot box */
const series = (
  vals: number[],
  lo: number,
  hi: number,
  y0 = YT,
  y1 = YB
): [number, number][] =>
  vals.map((v, i) => [sx(i, 0, vals.length - 1), sy(v, lo, hi, y0, y1)]);
/** polyline path through [x,y] pairs */
const line = (pts: [number, number][]) =>
  pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

/** y gridlines + tick labels — the bottom tick is the solid baseline */
function GridY({
  ticks,
  lo,
  hi,
  y0 = YT,
  y1 = YB,
  fmt = (t) => `${t}%`,
}: {
  ticks: number[];
  lo: number;
  hi: number;
  y0?: number;
  y1?: number;
  fmt?: (t: number) => string;
}) {
  return (
    <>
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={XL}
            y1={sy(t, lo, hi, y0, y1)}
            x2={XR}
            y2={sy(t, lo, hi, y0, y1)}
            stroke={AX}
            strokeDasharray={t === lo ? undefined : "2 4"}
          />
          <text
            x={XL - 5}
            y={sy(t, lo, hi, y0, y1) + 3}
            textAnchor="end"
            fontSize="8"
            fill={LB}
          >
            {fmt(t)}
          </text>
        </g>
      ))}
    </>
  );
}

/** legend chip — colored dot + label */
function Key({
  x,
  y,
  c,
  label,
  bold = false,
}: {
  x: number;
  y: number;
  c: string;
  label: string;
  bold?: boolean;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r="3" fill={c} />
      <text x={x + 6} y={y + 3} fontSize="7.5" fontWeight={bold ? 800 : 600} fill="#71717A">
        {label}
      </text>
    </g>
  );
}

function MiniChart({ kind }: { kind: ChartKind }) {
  switch (kind) {
    case "relapse": {
      // % of rTMS responders still well, months 0→12 (Dunner 2014).
      // y-domain 40–100 so the 66% endpoint sits ABOVE the 50% risk line.
      const months = [0, 3, 6, 9, 12];
      const vals = [100, 92, 82, 74, 66];
      const p = months.map(
        (m, i) => [sx(m, 0, 12), sy(vals[i], 40, 100)] as [number, number]
      );
      const last = p[p.length - 1];
      return (
        <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full">
          <GridY ticks={[40, 70, 100]} lo={40} hi={100} />
          <line
            x1={XL}
            y1={sy(50, 40, 100)}
            x2={XR}
            y2={sy(50, 40, 100)}
            stroke={ORG}
            strokeOpacity={0.55}
            strokeDasharray="5 4"
          />
          <text x={XL + 2} y={sy(50, 40, 100) + 11} fontSize="7.5" fontWeight="600" fill={ORG}>
            50% — relapse-risk line
          </text>
          <path d={line(p)} fill="none" stroke={ORG} strokeWidth={2.5} strokeLinecap="round" />
          {p.slice(0, -1).map((q, i) => (
            <circle key={i} cx={q[0]} cy={q[1]} r="2.25" fill="#fff" stroke={ORG} strokeWidth={1.75} />
          ))}
          <circle cx={last[0]} cy={last[1]} r="4" fill={ORG} />
          <text x={last[0] - 7} y={last[1] - 6} textAnchor="end" fontSize="11" fontWeight="800" fill={ORG}>
            66%
          </text>
          {months.map((m) => (
            <text key={m} x={sx(m, 0, 12)} y={YB + 13} textAnchor="middle" fontSize="8" fill={LB}>
              {m} mo
            </text>
          ))}
          <text x={XL} y={CH - 4} fontSize="8" fill={LB}>
            responders still well after acute rTMS — no maintenance
          </text>
        </svg>
      );
    }
    case "sensing": {
      // both passive signals normalized to their day-6 baseline (=100%)
      const y0 = 26;
      const radius = series([100, 99, 96, 91, 84, 75, 67, 55], 30, 110, y0); // −45%
      const f0 = series([100, 98, 97, 93, 87, 80, 72, 59], 30, 110, y0); // −41%
      return (
        <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full">
          <Key x={XL} y={10} c={GRN} label="map radius −45%" />
          <Key x={XL + 112} y={10} c={ORG} label="voice F₀ var −41%" />
          <GridY ticks={[30, 70, 110]} lo={30} hi={110} y0={y0} />
          <line
            x1={XL}
            y1={sy(100, 30, 110, y0)}
            x2={XR}
            y2={sy(100, 30, 110, y0)}
            stroke={AX}
            strokeDasharray="5 4"
          />
          <text x={XR} y={sy(100, 30, 110, y0) - 4} textAnchor="end" fontSize="7.5" fill={LB}>
            day-6 baseline
          </text>
          <path d={line(radius)} fill="none" stroke={GRN} strokeWidth={2.25} strokeLinecap="round" />
          <path d={line(f0)} fill="none" stroke={ORG} strokeWidth={2.25} strokeLinecap="round" />
          <circle cx={radius[7][0]} cy={radius[7][1]} r="3" fill={GRN} />
          <circle cx={f0[7][0]} cy={f0[7][1]} r="3" fill={ORG} />
          <text x={XL} y={YB + 13} fontSize="8" fill={LB}>
            day 6
          </text>
          <text x={XR} y={YB + 13} textAnchor="end" fontSize="8" fill={LB}>
            day 12 →
          </text>
          <text x={XL} y={CH - 4} fontSize="8" fill={LB}>
            passive signals, % of own baseline — the slide OtaPath notices first
          </text>
        </svg>
      );
    }
    case "efficacy": {
      // self-efficacy index (0–70) rising with each daily quest completed
      const vals = [14, 22, 30, 40, 52, 66];
      return (
        <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full">
          <GridY ticks={[0, 35, 70]} lo={0} hi={70} fmt={(t) => `${t}`} />
          {vals.map((v, i) => (
            <rect
              key={i}
              x={sx(i + 0.5, 0, vals.length) - 13}
              y={sy(v, 0, 70)}
              width="26"
              height={YB - sy(v, 0, 70)}
              rx="5"
              fill={i === vals.length - 1 ? GRN : ORG}
              opacity={0.4 + (i / vals.length) * 0.6}
            />
          ))}
          <text
            x={sx(vals.length - 0.5, 0, vals.length)}
            y={sy(66, 0, 70) - 7}
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            fill={GRN}
          >
            66
          </text>
          <text x={XL} y={YB + 13} fontSize="8" fill={LB}>
            quest 1
          </text>
          <text x={XR} y={YB + 13} textAnchor="end" fontSize="8" fill={LB}>
            quest 6 →
          </text>
          <text x={XL} y={CH - 4} fontSize="8" fill={LB}>
            self-efficacy index per daily quest completed
          </text>
        </svg>
      );
    }
    case "alpha": {
      // entrainment waveform (upper band) + savoring drift (lower band)
      const wave: [number, number][] = Array.from({ length: 113 }, (_, i) => [
        XL + (i / 112) * (XR - XL),
        46 - Math.sin((i / 112) * Math.PI * 8) * 13,
      ]);
      const drift = series([30, 34, 38, 45, 52, 60, 68], 20, 80, 66, YB);
      const de = drift[drift.length - 1];
      return (
        <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full">
          <Key x={XL} y={10} c={VIO} label="10 Hz alpha layer" />
          <Key x={XL + 112} y={10} c={GRN} label="savoring drift" />
          <line x1={XL} y1={YB} x2={XR} y2={YB} stroke={AX} />
          <path d={line(wave)} fill="none" stroke={VIO} strokeWidth={1.75} opacity={0.85} />
          <path d={line(drift)} fill="none" stroke={GRN} strokeWidth={2.5} strokeLinecap="round" />
          <circle cx={de[0]} cy={de[1]} r="3" fill={GRN} />
          <text x={XL} y={YB + 13} fontSize="8" fill={LB}>
            session start
          </text>
          <text x={XR} y={YB + 13} textAnchor="end" fontSize="8" fill={LB}>
            session end →
          </text>
          <text x={XL} y={CH - 4} fontSize="8" fill={LB}>
            binaural entrainment under personalized ElevenLabs music
          </text>
        </svg>
      );
    }
    case "memory": {
      // % of memories recalled specifically — overgeneral vs MEST-trained
      const bw = 52;
      const x1 = XL + (XR - XL) * 0.28 - bw / 2;
      const x2 = XL + (XR - XL) * 0.74 - bw / 2;
      const liftX = (x1 + x2) / 2 + bw / 2;
      return (
        <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full">
          <GridY ticks={[0, 35, 70]} lo={0} hi={70} />
          <rect x={x1} y={sy(34, 0, 70)} width={bw} height={YB - sy(34, 0, 70)} rx="6" fill={GRY} />
          <rect x={x2} y={sy(59, 0, 70)} width={bw} height={YB - sy(59, 0, 70)} rx="6" fill={GRN} />
          <path
            d={`M ${x1 + bw / 2} ${sy(34, 0, 70) - 12} Q ${liftX} ${sy(34, 0, 70) - 30} ${x2 + bw / 2} ${sy(59, 0, 70) - 12}`}
            fill="none"
            stroke={GRN}
            strokeWidth={1.75}
            strokeDasharray="3 3"
          />
          <text x={liftX} y={21} textAnchor="middle" fontSize="10.5" fontWeight="800" fill={GRN}>
            +73%
          </text>
          <text x={x1 + bw / 2} y={sy(34, 0, 70) - 6} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#71717A">
            34%
          </text>
          <text x={x2 + bw / 2} y={sy(59, 0, 70) - 6} textAnchor="middle" fontSize="9.5" fontWeight="800" fill={GRN}>
            59%
          </text>
          <text x={x1 + bw / 2} y={YB + 13} textAnchor="middle" fontSize="8" fill={LB}>
            overgeneral
          </text>
          <text x={x2 + bw / 2} y={YB + 13} textAnchor="middle" fontSize="8" fontWeight="700" fill={GRN}>
            specific recall
          </text>
          <text x={XL} y={CH - 4} fontSize="8" fill={LB}>
            autobiographical recall specificity after MEST-style training
          </text>
        </svg>
      );
    }
    case "adherence": {
      // intervention adherence — self-guided app vs supportive accountability
      const bw = 52;
      const x1 = XL + (XR - XL) * 0.28 - bw / 2;
      const x2 = XL + (XR - XL) * 0.74 - bw / 2;
      return (
        <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full">
          <GridY ticks={[0, 50, 100]} lo={0} hi={100} />
          <rect x={x1} y={sy(46, 0, 100)} width={bw} height={YB - sy(46, 0, 100)} rx="6" fill={GRY} />
          <rect x={x2} y={sy(78, 0, 100)} width={bw} height={YB - sy(78, 0, 100)} rx="6" fill={ORG} />
          <text x={x1 + bw / 2} y={sy(46, 0, 100) - 7} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#71717A">
            46%
          </text>
          <text x={x2 + bw / 2} y={sy(78, 0, 100) - 7} textAnchor="middle" fontSize="10.5" fontWeight="800" fill={ORG}>
            78%
          </text>
          <text x={x1 + bw / 2} y={YB + 13} textAnchor="middle" fontSize="8" fill={LB}>
            self-guided
          </text>
          <text x={x2 + bw / 2} y={YB + 13} textAnchor="middle" fontSize="8" fontWeight="700" fill={ORG}>
            with doctor
          </text>
          <text x={XL} y={CH - 4} fontSize="8" fill={LB}>
            intervention adherence (Mohr 2011)
          </text>
        </svg>
      );
    }
    case "bandit": {
      // learned next-day lift per intervention arm, days 1→14 — incl. the music arm
      const y0 = 26;
      const cinema = series([0, 4, 7, 9, 12, 15, 18, 20, 22], -10, 25, y0);
      const alpha = series([0, 3, 6, 8, 10, 13, 15, 17, 19], -10, 25, y0);
      const parks = series([0, 2, 3, 4, 4, 5, 4, 5, 4], -10, 25, y0);
      const sports = series([0, 1, 0, -1, -1, -2, -2, -2, -2], -10, 25, y0);
      const zy = sy(0, -10, 25, y0);
      return (
        <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full">
          <Key x={XL} y={10} c={ORG} label="cinema +22%" bold />
          <Key x={XL + 62} y={10} c={VIO} label="music +19%" bold />
          <Key x={XL + 120} y={10} c={GRN} label="parks +4%" />
          <Key x={XL + 182} y={10} c={GRY} label="sport −2%" />
          <GridY ticks={[-10, 10, 20]} lo={-10} hi={25} y0={y0} fmt={(t) => `${t > 0 ? "+" : ""}${t}%`} />
          <line x1={XL} y1={zy} x2={XR} y2={zy} stroke={AX} />
          <path d={line(sports)} fill="none" stroke={GRY} strokeWidth={1.75} />
          <path d={line(parks)} fill="none" stroke={GRN} strokeWidth={1.75} />
          <path d={line(alpha)} fill="none" stroke={VIO} strokeWidth={2.25} strokeLinecap="round" />
          <path d={line(cinema)} fill="none" stroke={ORG} strokeWidth={2.5} strokeLinecap="round" />
          <circle cx={cinema[8][0]} cy={cinema[8][1]} r="3" fill={ORG} />
          <circle cx={alpha[8][0]} cy={alpha[8][1]} r="3" fill={VIO} />
          <text x={XL} y={YB + 13} fontSize="8" fill={LB}>
            learned next-day lift
          </text>
          <text x={XR} y={YB + 13} textAnchor="end" fontSize="8" fill={LB}>
            day 1 → 14
          </text>
          <text x={XL} y={CH - 4} fontSize="8" fill={LB}>
            contextual bandit arm rewards over ~2 weeks
          </text>
        </svg>
      );
    }
  }
}

/* ── slide 6 widget: live prescribe + check-in onto the phone ────── */

function WidgetAction({
  state,
  icon: Icon,
  label,
  onClick,
  accent,
}: {
  state: "idle" | "sending" | "sent";
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "sending"}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 font-sans text-[11.5px] font-bold transition-colors disabled:opacity-60 ${
        state === "sent"
          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
          : accent
            ? "bg-[#FF6B2B] text-white hover:bg-[#F25B1B]"
            : "bg-[#18181B] text-white hover:bg-zinc-700"
      }`}
    >
      {state === "sent" ? (
        <Check className="h-4 w-4" strokeWidth={2.5} />
      ) : (
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      )}
      {state === "sent" ? "Sent — landing on the phone ≤8s" : label}
    </button>
  );
}

function PrescribeWidget() {
  const [status, setStatus] = useState<Record<string, "idle" | "sending" | "sent">>({});
  const mark = (k: string, v: "idle" | "sending" | "sent") =>
    setStatus((s) => ({ ...s, [k]: v }));

  const prescribe = async () => {
    mark("mission", "sending");
    try {
      await api.createMission({
        patientId: "matti",
        title: "An afternoon at Kinopoli Cinema",
        poiName: "Kinopoli Cinema",
        lat: 60.1872,
        lng: 24.8116,
        poiCategory: "culture",
        difficultyTier: "culture",
        assignedBy: "CLINICIAN_CUSTOM",
        doctorName: "Dr. Lindqvist",
        clinicianNote:
          "A gentle social space — just sit among people, no pressure to talk.",
        photoPrompt: "Snap the poster or marquee that catches your eye.",
        voicePrompt:
          "Tell me what it felt like to share a room with strangers again.",
        audioPairing: "10 Hz alpha ambience for the walk over",
      });
      mark("mission", "sent");
    } catch {
      mark("mission", "idle");
    }
  };

  const checkIn = async () => {
    mark("nudge", "sending");
    try {
      await api.sendNudge(
        "matti",
        "Dr. Lindqvist",
        "Saw your park notes from this week — the light you found sounds beautiful. No rush, just proud of your steps."
      );
      mark("nudge", "sent");
    } catch {
      mark("nudge", "idle");
    }
  };

  return (
    <div className="mt-4 max-w-xl rounded-xl border border-[#E8E2D4] bg-white p-3.5">
      <p className="font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
        Clinician Quick-Prescribe &amp; Connect — try it live
      </p>
      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
        <WidgetAction
          state={status.mission ?? "idle"}
          icon={Clapperboard}
          label="Prescribe: Kinopoli Cinema quest"
          onClick={prescribe}
          accent
        />
        <WidgetAction
          state={status.nudge ?? "idle"}
          icon={Heart}
          label="Send warm check-in note"
          onClick={checkIn}
        />
      </div>
      <p className="mt-2 font-sans text-[9.5px] font-medium text-zinc-400">
        POSTs to the same API the clinician portal uses — the phone on the left polls
        every 8s and picks it up.
      </p>
    </div>
  );
}

/* ── the deck ─────────────────────────────────────────────────── */

export function JourneyDeck() {
  const [idx, setIdx] = useState(0);
  const s = SLIDES[idx];
  const Icon = s.icon;
  const dotActive = s.theme.bg === "#FF6B2B" ? "#FFF7F0" : "#FF6B2B";

  // each slide drives the stage phone — route + sensory session follow the story
  useEffect(() => {
    fireSlideCue(SLIDES[idx].phone);
  }, [idx]);

  const navBtn: CSSProperties = { borderColor: s.theme.line, color: s.theme.fg };

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      style={
        {
          background: s.theme.bg,
          "--ota-cite": s.theme.accent,
        } as CSSProperties
      }
    >
      {/* pulsing orange gradient edge along the top */}
      <div className="ota-edge-pulse absolute inset-x-0 top-0 z-10 h-[5px] bg-gradient-to-r from-[#FF6B2B] via-[#FFC15E] to-[#FF6B2B] shadow-[0_2px_14px_rgba(255,107,43,0.55)]" />

      {/* header: kicker + nav */}
      <div className="relative z-10 flex shrink-0 items-center gap-2 px-5 pt-5 md:px-8">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FF6B2B]">
          <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
        </span>
        <p
          className="min-w-0 flex-1 truncate font-sans text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: s.theme.accent === "#FFFFFF" ? "#FFF7F0" : "#FF6B2B" }}
        >
          {s.kicker}
        </p>
        <span
          className="font-sans text-[10px] font-bold tabular-nums"
          style={{ color: s.theme.sub }}
        >
          {idx + 1} / {SLIDES.length}
        </span>
        <button
          type="button"
          aria-label="Previous slide"
          disabled={idx === 0}
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          style={navBtn}
          className="flex h-7 w-7 items-center justify-center rounded-lg border transition-opacity hover:opacity-70 disabled:opacity-25"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          disabled={idx === SLIDES.length - 1}
          onClick={() => setIdx((i) => Math.min(SLIDES.length - 1, i + 1))}
          style={navBtn}
          className="flex h-7 w-7 items-center justify-center rounded-lg border transition-opacity hover:opacity-70 disabled:opacity-25"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* slide body — remount per slide for the entrance animation */}
      <div
        key={idx}
        className="ota-slide-in relative flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-5 pt-4 md:px-8 md:pt-6"
      >
        {s.variant === "intro" || s.variant === "outro" ? (
          /* centered hero — the opening invite / closing clinician invite */
          <div className="m-auto flex w-full max-w-4xl flex-col items-center py-8 text-center">
            <p
              className="font-sans text-[10px] font-bold uppercase tracking-[0.24em]"
              style={{ color: s.theme.sub }}
            >
              {s.eyebrow}
            </p>
            <h2
              className="mt-4 max-w-3xl font-sans text-[34px] font-extrabold leading-[1.04] tracking-[-0.03em] md:text-[52px] 2xl:text-[60px]"
              style={{ color: s.theme.fg }}
            >
              {s.headline}
            </h2>
            <p
              className="mt-5 max-w-xl font-sans text-[13.5px] font-medium leading-relaxed md:text-[15px]"
              style={{ color: s.theme.sub }}
            >
              {s.body}
            </p>
            {s.variant === "intro" ? (
              <>
                <button
                  type="button"
                  onClick={() => setIdx(1)}
                  className="mt-8 flex items-center gap-2 rounded-full bg-white px-6 py-3 font-sans text-[13px] font-extrabold text-[#FF6B2B] shadow-[0_14px_30px_-12px_rgba(28,25,23,0.45)] transition-transform hover:-translate-y-0.5"
                >
                  Begin the journey
                  <ArrowRight className="h-4 w-4" strokeWidth={2.75} />
                </button>
                {/* the journey ahead — each chip jumps to that slide */}
                <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
                  {SLIDES.slice(1).map((c, i) => (
                    <button
                      key={c.kicker}
                      type="button"
                      onClick={() => setIdx(i + 1)}
                      className="flex items-center gap-2 rounded-full border border-white/35 px-3.5 py-1.5 font-sans text-[10px] font-bold text-[#FFF7F0] transition-colors hover:bg-white/15"
                    >
                      <c.icon className="h-3 w-3" strokeWidth={2.5} />
                      {String(i + 1).padStart(2, "0")} · {c.chapter}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/clinician"
                    className="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-sans text-[13px] font-extrabold shadow-[0_14px_30px_-12px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5"
                    style={{ color: s.theme.bg }}
                  >
                    Open the clinician portal
                    <ArrowRight className="h-4 w-4" strokeWidth={2.75} />
                  </Link>
                  <Link
                    href="/app"
                    className="font-sans text-[12px] font-bold underline underline-offset-4 transition-opacity hover:opacity-75"
                    style={{ color: s.theme.sub }}
                  >
                    or keep walking with Matti →
                  </Link>
                </div>
                {/* what she sees there */}
                <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
                  {s.chips?.map((c) => (
                    <span
                      key={c}
                      className="flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-sans text-[10px] font-bold"
                      style={{ borderColor: s.theme.line, color: s.theme.fg }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: s.theme.accent }}
                      />
                      {c}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="my-auto grid w-full gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
              {/* narrative column */}
              <div className="min-w-0">
                <h2
                  className="max-w-3xl font-sans text-[26px] font-extrabold leading-[1.12] tracking-[-0.02em] md:text-[34px] 2xl:text-[38px]"
                  style={{ color: s.theme.fg }}
                >
                  {s.headline}
                </h2>
                <p
                  className="mt-4 max-w-3xl font-sans text-[13.5px] font-medium leading-relaxed md:text-[15px]"
                  style={{ color: s.theme.sub }}
                >
                  {s.body}
                </p>
                {s.widget === "prescribe" && <PrescribeWidget />}
              </div>

              {/* stat + data card column */}
              <div className="flex min-w-0 flex-col">
                <p
                  className="font-sans text-[88px] font-extrabold leading-none tracking-[-0.045em] md:text-[116px] 2xl:text-[132px]"
                  style={{ color: s.theme.fg }}
                >
                  {s.stat}
                </p>
                <p
                  className="mt-2 max-w-[30ch] font-sans text-[12.5px] font-semibold leading-snug md:text-[13.5px]"
                  style={{ color: s.theme.sub }}
                >
                  {s.statLabel}
                </p>
                <div className="mt-5 rounded-xl bg-white p-4 shadow-[0_14px_36px_-18px_rgba(28,25,23,0.35)]">
                  {s.chart && <MiniChart kind={s.chart} />}
                  <p className="mt-1.5 font-sans text-[10px] font-medium leading-snug text-zinc-400">
                    {s.chartCaption}
                  </p>
                </div>
              </div>
            </div>

            {/* footnotes */}
            {s.notes.length > 0 && (
              <div
                className="pt-5"
                style={{ borderTop: `1px solid ${s.theme.line}` }}
              >
                <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {s.notes.map((n, i) => (
                    <p
                      key={i}
                      className="font-sans text-[10px] font-medium leading-snug"
                      style={{ color: s.theme.sub }}
                    >
                      <span
                        className="font-bold"
                        style={{ color: s.theme.accent }}
                      >
                        [{i + 1}]
                      </span>{" "}
                      {n}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* progress dots */}
      <div className="relative z-10 flex shrink-0 justify-center gap-1.5 pb-4">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIdx(i)}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === idx ? 20 : 6,
              background: i === idx ? dotActive : s.theme.line,
            }}
          />
        ))}
      </div>
    </div>
  );
}
