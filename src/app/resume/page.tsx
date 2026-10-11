import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/frontend/components/shell/app-header";
import { StudentHome } from "@/frontend/features/student/student-home";
import { getClubDashboard, getStudentHome, getViewer, listOpenBooks } from "@/frontend/lib/api";

export const metadata: Metadata = { title: "Your resume · Roster" };

export default async function ResumePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/resume");
  if (viewer.accountType !== "school" || !viewer.school) redirect("/");

  const [home, books, dashboard] = await Promise.all([getStudentHome(), listOpenBooks(), viewer.ownedClub ? getClubDashboard() : null]);
  if (!home) redirect("/");

  const club = dashboard && {
    club: dashboard.club,
    pendingCount: dashboard.memberships.filter((membership) => membership.status === "pending").length,
    memberCount: dashboard.memberships.filter((membership) => membership.status === "accepted").length,
    earnedCents: dashboard.earnedCents,
  };

  return (
    <>
      <AppHeader viewer={viewer} />
      <main id="main-content" tabIndex={-1}>
        <StudentHome home={home} club={club} school={{ name: viewer.school.name, domain: viewer.school.domains[0] }} books={books} />
      </main>
    </>
  );
}
