"use client";

/**
 * useSensoryComfort — applies the patient's sensory-comfort prefs to
 * <html>: `.motion-soft` kills animation for overload-sensitive days,
 * `.candle` swaps the paper canvas for warm espresso candlelight.
 * Mount on patient-facing screens; cleans up on unmount so clinical
 * surfaces always stay in daylight.
 */

import { useEffect } from "react";
import { useOtaStore } from "@/store/useOtaStore";

export function useSensoryComfort() {
  const motion = useOtaStore((s) => s.comfortMotion);
  const theme = useOtaStore((s) => s.comfortTheme);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("motion-soft", motion === "soft");
    el.classList.toggle("candle", theme === "candle");
    return () => {
      el.classList.remove("motion-soft", "candle");
    };
  }, [motion, theme]);
}
