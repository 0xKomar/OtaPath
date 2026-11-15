"use client";

/**
 * BottomNav — thumb-zone pill bar for phones (<768px).
 * Chunky, warm, one tap from anywhere: Explore the map, open the
 * Memory Atlas, start a breathing session, or peek at frosted Echoes.
 * Active tab = charcoal pill on cream text. Honors safe-area insets.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, BookOpen, AudioLines, History, UserRound } from "lucide-react";
import { isEcho } from "@/lib/echo";
import { useOtaStore } from "@/store/useOtaStore";

const ITEM =
  "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 font-sans text-[8.5px] font-extrabold uppercase tracking-wide transition-all active:scale-90";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const sensoryOpen = useOtaStore((s) => s.sensoryOpen);
  const sensoryPlaying = useOtaStore((s) => s.sensoryPlaying);
  const memories = useOtaStore((s) => s.memories);
  const setSensoryOpen = useOtaStore((s) => s.setSensoryOpen);
  const echoes = memories.filter((m) => isEcho(m));

  const base = "text-ink-charcoal/55";
  const active = "bg-ink-charcoal text-cream";

  return (
    <nav
      aria-label="Primary"
      className="tabbar-in card-tactile fixed inset-x-3 bottom-0 z-[1250] mb-[max(10px,env(safe-area-inset-bottom))] flex items-center gap-1 rounded-full bg-cream p-1.5"
    >
      <Link href="/app" aria-current={pathname === "/app" ? "page" : undefined} className={`${ITEM} relative ${pathname === "/app" ? active : base}`}>
        <Compass className="h-5 w-5" strokeWidth={2.5} />
        Explore
      </Link>
      <Link
        href="/app/memories"
        aria-current={pathname === "/app/memories" ? "page" : undefined}
        className={`${ITEM} relative ${pathname === "/app/memories" ? active : base}`}
      >
        <BookOpen className="h-5 w-5" strokeWidth={2.5} />
        Atlas
        {memories.length > 0 && (
          <span className="absolute -top-1 right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-tangerine px-1 font-sans text-[9px] font-extrabold text-cream">
            {memories.length}
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={() => setSensoryOpen(true)}
        aria-label="Open breathing session"
        className={`${ITEM} relative ${sensoryOpen ? active : base}`}
      >
        <AudioLines className="h-5 w-5" strokeWidth={2.5} />
        Breathe
        {sensoryPlaying && !sensoryOpen && (
          <span className="absolute -top-0.5 right-4 flex gap-[2px]" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-[3px] animate-pulse rounded-full bg-forest"
                style={{ height: `${6 + i * 3}px`, animationDelay: `${i * 160}ms` }}
              />
            ))}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          const st = useOtaStore.getState();
          if (!echoes[0]) {
            st.pushToast("Echoes bloom after 7 days — no rush");
            return;
          }
          // the echo modal lives on the map screen — route there first
          if (pathname !== "/app") router.push("/app");
          st.openEcho(echoes[0].id);
        }}
        aria-label="Memory echoes"
        className={`${ITEM} relative ${echoes.length ? base : "text-ink-charcoal/30"}`}
      >
        <History className="h-5 w-5" strokeWidth={2.5} />
        Echo
        {echoes.length > 0 && (
          <span className="absolute -top-1 right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky px-1 font-sans text-[9px] font-extrabold text-ink-charcoal">
            {echoes.length}
          </span>
        )}
      </button>
      <Link
        href="/app/profile"
        aria-current={pathname === "/app/profile" ? "page" : undefined}
        className={`${ITEM} relative ${pathname === "/app/profile" ? active : base}`}
      >
        <UserRound className="h-5 w-5" strokeWidth={2.5} />
        Profile
      </Link>
    </nav>
  );
}
