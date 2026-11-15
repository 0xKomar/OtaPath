/**
 * TickBar — crisp vertical tick progress (the "momentum bar").
 * `pct` (0–100) fills `ticks` vertical marks amber; the rest stay
 * neutral zinc. Used for tier-effectiveness and stability scores.
 */

export function TickBar({
  pct,
  ticks = 24,
  filled = "#F59E0B",
  empty = "var(--tick-empty, #E4E4E7)",
  height = 14,
}: {
  pct: number;
  ticks?: number;
  filled?: string;
  empty?: string;
  height?: number;
}) {
  const n = Math.round(Math.min(100, Math.max(0, pct)) / (100 / ticks));
  return (
    <div className="flex items-end gap-[2px]" aria-hidden>
      {Array.from({ length: ticks }, (_, i) => (
        <span
          key={i}
          className="w-[2px] rounded-full"
          style={{
            height,
            background: i < n ? filled : empty,
          }}
        />
      ))}
    </div>
  );
}
