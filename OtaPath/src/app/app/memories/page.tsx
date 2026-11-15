import type { Metadata } from "next";
import { MemoryAtlas } from "@/components/memories/MemoryAtlas";
import { MobileShell } from "@/components/ui/MobileShell";

export const metadata: Metadata = {
  title: "Memory Atlas",
};

export default function MemoriesPage() {
  return (
    <MobileShell>
      <MemoryAtlas />
    </MobileShell>
  );
}
