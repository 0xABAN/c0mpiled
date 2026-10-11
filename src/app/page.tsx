import { redirect } from "next/navigation";

import { AppHeader } from "@/frontend/components/shell/app-header";
import { Landing } from "@/frontend/features/marketing/landing";
import { getViewer } from "@/frontend/lib/api";

/** The landing page for visitors, and the one place that sends each signed-in account to its home. */
export default async function Home() {
  const viewer = await getViewer();

  if (viewer) {
    if (!viewer.accountType) redirect("/signup");
    if (!viewer.onboarded) redirect("/setup");
    if (viewer.accountType === "recruiter") redirect("/browse");

    // Students land on their own page; running a club shows up there too.
    redirect("/resume");
  }

  return (
    <>
      <AppHeader viewer={viewer} />
      <main>
        <Landing />
      </main>
    </>
  );
}
