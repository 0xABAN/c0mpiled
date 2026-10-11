import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/frontend/components/shell/app-header";
import { ClubDashboard } from "@/frontend/features/dashboard/club-dashboard";
import { getClubDashboard, getViewer } from "@/frontend/lib/api";

export const metadata: Metadata = { title: "Your club · Roster" };

export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/dashboard");
  if (!viewer.ownedClub) redirect("/");

  const dashboard = await getClubDashboard();
  if (!dashboard) redirect("/");

  return (
    <>
      <AppHeader viewer={viewer} />
      <main>
        <ClubDashboard dashboard={dashboard} />
      </main>
    </>
  );
}
