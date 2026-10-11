import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/frontend/components/shell/app-header";
import { StudentHome } from "@/frontend/features/student/student-home";
import { getStudentHome, getViewer, listOpenBooks } from "@/frontend/lib/api";

export const metadata: Metadata = { title: "Your resume · Roster" };

export default async function ResumePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/resume");
  if (viewer.accountType !== "school" || !viewer.school) redirect("/");

  const [home, books] = await Promise.all([getStudentHome(), listOpenBooks()]);
  if (!home) redirect("/");

  return (
    <>
      <AppHeader viewer={viewer} />
      <main>
        <StudentHome home={home} school={{ name: viewer.school.name, domain: viewer.school.domains[0] }} books={books} />
      </main>
    </>
  );
}
