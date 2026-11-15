"use client";

import dynamic from "next/dynamic";
import { OtaDog } from "@/components/ui/OtaDog";

const ExploreMap = dynamic(() => import("./ExploreMap"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#EFE5CB]">
      <div className="flex flex-col items-center gap-3">
        <OtaDog state="walk" size={110} />
        <p className="font-sans text-sm font-bold text-ink-charcoal/60">
          Warming up the neighborhood…
        </p>
      </div>
    </div>
  ),
});

export default function MapLoader() {
  return <ExploreMap />;
}
