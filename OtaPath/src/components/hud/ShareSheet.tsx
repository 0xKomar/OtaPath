"use client";

/**
 * ShareSheet — warm, zero-pressure mission invite for a friend.
 * Composes a gentle message + link, prefers native share, falls back
 * to clipboard. The card itself is the artifact — no social feed,
 * no read receipts, no guilt.
 */

import { Copy, Send, X } from "lucide-react";
import { useOtaStore } from "@/store/useOtaStore";
import { OtaButton } from "@/components/ui/OtaButton";
import { OtaDog } from "@/components/ui/OtaDog";

export function ShareSheet() {
  const open = useOtaStore((s) => s.shareOpen);
  const setOpen = useOtaStore((s) => s.setShareOpen);
  const mission = useOtaStore((s) => s.activeMission);
  const pushToast = useOtaStore((s) => s.pushToast);

  if (!open || !mission) return null;

  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/app?join=${encodeURIComponent(mission.poiName)}`;
  const text = `Hey, want to join me for a quick walk to ${mission.poiName} today? No pressure — sunshine optional.`;

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "OtaPath — a little mission", text, url });
        return;
      } catch {
        /* user dismissed — that's fine */
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      pushToast("Invite copied — send it any way you like");
    } catch {
      pushToast("Copy the message below and send it any way you like");
    }
  }

  return (
    <div className="fixed inset-0 z-[1400] flex items-end justify-center bg-ink-charcoal/25 p-4">
      <div className="card-tactile toast-in w-full max-w-sm bg-cream p-6">
        <div className="flex items-start justify-between">
          <OtaDog state="idle" size={66} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="card-tactile flex h-9 w-9 items-center justify-center rounded-full bg-butter"
          >
            <X className="h-4 w-4 text-ink-charcoal" strokeWidth={2.75} />
          </button>
        </div>

        <p className="mt-3 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-tangerine">
          A little mission, shared
        </p>
        <div className="mt-3 rounded-2xl bg-butter p-4">
          <p className="font-display text-lg font-medium italic leading-snug text-ink-charcoal/85">
            “{text}”
          </p>
          <p className="mt-2 break-all font-sans text-[10px] font-bold text-ink-charcoal/35">
            {url}
          </p>
        </div>
        <p className="mt-3 font-sans text-xs font-medium leading-snug text-ink-charcoal/50">
          Just an invite — they can say yes, no, or nothing at all. Walking alone still counts.
        </p>

        <div className="mt-5 flex gap-2.5">
          <OtaButton size="sm" onClick={share}>
            <Send className="h-4 w-4" strokeWidth={2.75} />
            Send the invite
          </OtaButton>
          <OtaButton
            size="sm"
            variant="paper"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${text} ${url}`);
                pushToast("Invite copied — send it any way you like");
              } catch {
                pushToast("Couldn't copy — long-press the message instead");
              }
            }}
          >
            <Copy className="h-4 w-4" strokeWidth={2.75} />
            Copy
          </OtaButton>
        </div>
      </div>
    </div>
  );
}
