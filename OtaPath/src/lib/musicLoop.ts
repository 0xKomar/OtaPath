/**
 * musicLoop.ts — seamless MP3 loop through the Web Audio graph.
 * Decodes the generated track once, then schedules BufferSources back
 * to back with an equal-power crossfade — no audible loop seam.
 * The returned handle's `stop()` kills scheduled sources immediately.
 */

export interface MusicLoop {
  stop: () => void;
  /** gait-sync — glide the playback rate (0.95–1.08) on live + future slices */
  setRate: (rate: number) => void;
}

export async function startMusicLoop(
  ctx: AudioContext,
  url: string,
  dest: AudioNode,
  xfSeconds = 1.6
): Promise<MusicLoop> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`audio ${res.status}`);
  const buf = await ctx.decodeAudioData(await res.arrayBuffer());

  let alive = true;
  let timer = 0;
  let rate = 1;
  const sources = new Set<AudioBufferSourceNode>();
  const dur = buf.duration;
  const xf = Math.min(xfSeconds, dur * 0.25);

  const spawn = (when: number) => {
    if (!alive) return;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buf;
    src.playbackRate.value = rate;
    src.connect(g).connect(dest);
    // equal-power-ish crossfade — linear ramps read smooth at this scale
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(1, when + xf);
    g.gain.setValueAtTime(1, when + dur - xf);
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    src.start(when);
    src.stop(when + dur + 0.05);
    sources.add(src);
    src.onended = () => sources.delete(src);
    // schedule the next slice to enter during this one's fade-out
    const wait = Math.max(60, (when + dur - xf - ctx.currentTime) * 1000);
    timer = window.setTimeout(() => spawn(ctx.currentTime + 0.02), wait);
  };

  spawn(ctx.currentTime + 0.03);

  return {
    stop: () => {
      alive = false;
      window.clearTimeout(timer);
      for (const s of sources) {
        try {
          s.stop();
        } catch {
          /* already ended */
        }
      }
      sources.clear();
    },
    setRate: (r: number) => {
      rate = Math.min(1.08, Math.max(0.95, r));
      for (const s of sources) {
        try {
          s.playbackRate.setTargetAtTime(rate, ctx.currentTime, 0.4);
        } catch {
          /* ended source */
        }
      }
    },
  };
}
