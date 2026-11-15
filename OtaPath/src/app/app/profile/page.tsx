import type { Metadata } from "next";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { MobileShell } from "@/components/ui/MobileShell";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <MobileShell>
      <ProfileScreen />
    </MobileShell>
  );
}
