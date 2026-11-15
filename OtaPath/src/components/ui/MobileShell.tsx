/**
 * MobileShell — constrains the patient app to a phone-width column.
 * OtaPath is a pocket companion: even on a laptop it should read as
 * a phone app, so map, sheets and HUD keep true mobile proportions
 * instead of stretching into a desktop layout.
 *
 * `transform-gpu` makes the column the containing block for
 * `position: fixed` children (bottom nav, full-screen sheets,
 * modals) — they stay inside the phone frame, not the window.
 * On real phones (≤430 px) this is visually a no-op.
 */
import { AuthGate } from "@/components/auth/AuthGate";

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh w-full bg-[#EFE7D2]">
      <div className="relative mx-auto h-dvh w-full max-w-[430px] transform-gpu overflow-hidden border-x border-[#E2D8C0] bg-cream shadow-[0_0_90px_-20px_rgba(28,25,23,0.35)]">
        <AuthGate>{children}</AuthGate>
      </div>
    </div>
  );
}
