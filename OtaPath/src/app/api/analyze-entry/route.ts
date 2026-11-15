import { NextResponse } from "next/server";
import { savoringScore } from "@/lib/savoring";

/**
 * POST /api/analyze-entry — semantic savoring + biomarker fusion.
 * Body: { transcript, acousticMetrics, imageMetrics, poiName? }
 * Returns: { savoringScore, valence, themes, soundscapePrompt, source }
 *
 * With OPENAI_API_KEY → gpt-4o-mini structured JSON.
 * Without it → deterministic local heuristic (demo always works).
 */

interface AcousticMetrics {
  durationS: number;
  energy: number;
  prosody: number;
  speechRatio: number;
}

interface ImageMetrics {
  luminance: number;
  vibrancy: number;
}

interface AnalyzeRequest {
  transcript?: string;
  acousticMetrics?: AcousticMetrics;
  imageMetrics?: ImageMetrics;
  poiName?: string;
}

interface Analysis {
  savoringScore: number;
  valence: number;
  themes: string[];
  soundscapePrompt: string;
  source: "openai" | "heuristic";
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ---------------- deterministic heuristic fallback ---------------- */

const SENSORY: Record<string, string[]> = {
  color: ["red", "blue", "green", "golden", "yellow", "orange", "pink", "purple", "bright", "vivid", "color", "colour"],
  light: ["light", "sun", "sunlight", "shadow", "glow", "glowing", "shimmer", "dappled", "warm"],
  sound: ["bird", "birdsong", "wind", "rustle", "quiet", "hum", "sound", "music", "silence"],
  texture: ["soft", "rough", "smooth", "crisp", "crunch", "warm", "cool", "breeze"],
  nature: ["leaf", "leaves", "tree", "grass", "flower", "water", "sea", "sky", "cloud", "park", "moss"],
  place: ["poster", "building", "wall", "window", "bench", "path", "corner", "detail", "cinema", "museum"],
};
const POS = ["beautiful", "lovely", "calm", "happy", "glad", "peaceful", "warm", "alive", "grateful", "wonderful", "bright", "gentle", "nice", "good", "love", "like", "enjoy", "fun", "free", "vivid", "glow", "glowing", "shimmer", "stunning", "gorgeous", "amazing", "delightful", "sweet", "cozy", "soft", "humming", "hummed"];
const NEG = ["sad", "tired", "dark", "grey", "gray", "empty", "alone", "cold", "hard", "difficult", "heavy", "nothing", "boring", "dull"];

function heuristic(req: AnalyzeRequest): Analysis {
  const t = (req.transcript ?? "").toLowerCase();
  const words = t.match(/[a-zäöå']+/g) ?? [];

  // savoring: base NLP score + sensory-category diversity + speech engagement
  const cats = new Set<string>();
  for (const [cat, list] of Object.entries(SENSORY))
    if (list.some((w) => t.includes(w))) cats.add(cat);
  const speechBonus = (req.acousticMetrics?.speechRatio ?? 0) * 12;
  const savor = Math.round(
    clamp(savoringScore(t) * 0.75 + cats.size * 7 + Math.min(18, words.length) + speechBonus, 12, 100)
  );

  // valence: positive/negative balance
  const pos = words.filter((w) => POS.includes(w)).length;
  const neg = words.filter((w) => NEG.includes(w)).length;
  // no sentiment words at all → sensory engagement is mild positive evidence
  const valence = pos + neg === 0
    ? +clamp(0.08 + cats.size * 0.09, 0, 0.5).toFixed(2)
    : +clamp((pos - neg) / Math.max(3, pos + neg), -1, 1).toFixed(2);

  // themes
  const themeMap: Record<string, string> = {
    nature: "nature", color: "color", light: "light", sound: "soundscape",
    texture: "texture", place: "architecture",
  };
  const themes = [...cats].map((c) => themeMap[c] ?? c).slice(0, 4);
  if (themes.length === 0 && words.length) themes.push("moment");

  // soundscape prompt — mood + environment, tempo from vocal energy
  const energy = req.acousticMetrics?.energy ?? 40;
  const mood = valence >= 0.3 ? "warm and uplifting" : valence <= -0.2 ? "tender and melancholic" : "gentle and calm";
  const env = cats.has("nature")
    ? "soft piano with distant birdsong and a light park breeze"
    : cats.has("place")
      ? "hushed strings, reverb-soaked piano and a quiet hall ambience"
      : "mellow acoustic guitar with soft wind chimes";
  const bpm = energy > 60 ? "~92 BPM" : energy > 40 ? "~76 BPM" : "~64 BPM";
  const soundscapePrompt = `${mood[0].toUpperCase()}${mood.slice(1)} ambient piece — ${env}, ${bpm}`;

  return { savoringScore: savor, valence, themes, soundscapePrompt, source: "heuristic" };
}

/* ---------------- OpenAI path ------------------------------------- */

async function openaiAnalyze(req: AnalyzeRequest): Promise<Analysis | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const sys = `You are a gentle mental-wellness analysis engine for a walking companion app.
Analyze the user's ~10s voice-journal transcript captured at a place they visited.
Return ONLY a JSON object with:
- "savoringScore": 0-100, how rich the description is in external sensory details (color, light, sound, texture, curiosity) versus overgeneralized or flat statements (early anhedonia indicator)
- "valence": -1.0 to +1.0 emotional valence
- "themes": array of 1-4 short themes (e.g. ["nature","color","cinema"])
- "soundscapePrompt": one rich music-generation prompt describing the mood + environment (instrumentation + feel + approx BPM), suitable for an ambient soundscape model
Be generous and kind in scoring — this supports depression recovery.`;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.4,
        messages: [
          { role: "system", content: sys },
          {
            role: "user",
            content: JSON.stringify({
              transcript: req.transcript ?? "",
              place: req.poiName ?? null,
              acoustic: req.acousticMetrics ?? null,
              image: req.imageMetrics ?? null,
            }),
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as Partial<Analysis>;
    if (typeof parsed.savoringScore !== "number") return null;
    return {
      savoringScore: Math.round(clamp(parsed.savoringScore, 0, 100)),
      valence: clamp(Number(parsed.valence ?? 0), -1, 1),
      themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 4).map(String) : [],
      soundscapePrompt: String(parsed.soundscapePrompt ?? "Gentle ambient piece, ~72 BPM"),
      source: "openai",
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const analysis = (await openaiAnalyze(body)) ?? heuristic(body);
  return NextResponse.json(analysis);
}
